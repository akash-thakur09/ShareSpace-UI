#!/bin/bash

set -e

echo "🚀 ShareSpace Backend Setup"
echo "============================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please install PostgreSQL 14+"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ PostgreSQL detected"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo "⚠️  Please update .env with your database credentials"
else
    echo "✓ .env file already exists"
fi

# Create database
echo ""
read -p "Create database 'sharespace'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating database..."
    createdb sharespace 2>/dev/null && echo "✓ Database created" || echo "⚠️  Database might already exist"
fi

# Build
echo ""
echo "🔨 Building project..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your database credentials"
echo "2. Start the servers:"
echo "   npm run dev:api  (Terminal 1)"
echo "   npm run dev:yjs  (Terminal 2)"
echo ""
echo "Or use PM2:"
echo "   npm install -g pm2"
echo "   pm2 start npm --name api -- run dev:api"
echo "   pm2 start npm --name yjs -- run dev:yjs"
echo ""

# ShareSpace Backend - Quick Reference

## 🚀 Quick Commands

### Development
```bash
# Start API server
npm run dev:api

# Start Yjs server
npm run dev:yjs

# Start both (requires concurrently)
npm run dev
```

### Production
```bash
# Build
npm run build

# Start
npm start

# Using PM2
pm2 start dist/main.js --name api
pm2 start dist/yjs-server.js --name yjs
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📡 API Endpoints

### Documents
```bash
# Create
POST /documents
Body: { "title": "My Doc" }

# Get
GET /documents/:publicId

# Update
PUT /documents/:publicId
Body: { "title": "New Title" }

# Create snapshot
POST /documents/:publicId/snapshots

# List snapshots
GET /documents/:publicId/snapshots

# Restore snapshot
POST /documents/:publicId/snapshots/:snapshotId/restore
```

### Health
```bash
GET /health
```

## 🔌 WebSocket

### Connection
```javascript
ws://localhost:3001?doc={publicId}
```

### Protocol
- Uses standard y-websocket protocol
- Binary encoding (lib0)
- Message types:
  - 0: Sync (CRDT updates)
  - 1: Awareness (presence)

## 🗄️ Database Schema

### Documents Table
```sql
id              UUID PRIMARY KEY
public_id       VARCHAR(10) UNIQUE
title           VARCHAR(255)
yjs_state       BYTEA
metadata        JSONB
created_at      TIMESTAMP
updated_at      TIMESTAMP
last_accessed_at TIMESTAMP
```

### Snapshots Table
```sql
id              UUID PRIMARY KEY
document_id     UUID REFERENCES documents(id)
yjs_state       BYTEA
version         INTEGER
metadata        JSONB
created_at      TIMESTAMP
```

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
API_PORT=4000
YJS_PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=sharespace

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Config
CORS_ORIGIN=http://localhost:3000
PUBLIC_DOC_ID_LENGTH=6
SNAPSHOT_INTERVAL_MS=30000
LOG_LEVEL=debug
```

## 📊 Port Usage

| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 3000 | HTTP |
| API Server | 4000 | HTTP |
| Yjs Server | 3001 | WebSocket |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |

## 🧪 Testing

### API Health
```bash
curl http://localhost:4000/health
```

### Create Document
```bash
curl -X POST http://localhost:4000/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

### Get Document
```bash
curl http://localhost:4000/documents/a3k9m2
```

### WebSocket Test
```javascript
const ws = new WebSocket('ws://localhost:3001?doc=test');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

## 🐛 Troubleshooting

### Port in use
```bash
# Find process
lsof -i :4000
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>
```

### Database connection failed
```bash
# Check PostgreSQL
pg_isready
psql -U postgres -d sharespace

# Check credentials
cat .env | grep DB_
```

### Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build failed
```bash
npm run build -- --verbose
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── document/          # Document management
│   │   │   ├── entities/      # TypeORM entities
│   │   │   ├── dto/           # Data transfer objects
│   │   │   ├── document.controller.ts
│   │   │   ├── document.service.ts
│   │   │   └── document.module.ts
│   │   └── health/            # Health checks
│   ├── app.module.ts          # Root module
│   ├── main.ts                # API server entry
│   └── yjs-server.ts          # Yjs WebSocket server
├── scripts/
│   ├── setup.sh               # Setup script
│   └── dev.sh                 # Development script
├── .env.example               # Environment template
├── docker-compose.yml         # Docker setup
├── Dockerfile                 # Docker image
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # Main documentation
```

## 🔑 Key Concepts

### Document IDs
- **Public ID**: 6-char nanoid (e.g., "a3k9m2")
  - Used in URLs
  - User-facing
- **Internal ID**: UUID
  - Database primary key
  - Never exposed

### Yjs State
- Binary CRDT state
- Stored in database as BYTEA
- Automatically synced
- Conflict-free merging

### Snapshots
- Point-in-time document copies
- Created periodically
- Used for version history
- Can restore from any snapshot

### Awareness
- User presence information
- Cursor positions
- User names/colors
- Handled by y-websocket

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| README.md | Complete backend docs |
| ARCHITECTURE.md | System design deep-dive |
| FRONTEND_INTEGRATION.md | Frontend setup guide |
| WHY_YJS.md | Technical comparison |
| QUICK_REFERENCE.md | This file |

## 🎯 Common Tasks

### Add New API Endpoint
1. Add method to `document.controller.ts`
2. Add logic to `document.service.ts`
3. Test with curl

### Add Database Field
1. Update entity in `entities/`
2. Run migration (or use synchronize in dev)
3. Update DTOs if needed

### Change Snapshot Interval
```env
SNAPSHOT_INTERVAL_MS=60000  # 60 seconds
```

### Enable Redis
1. Install Redis
2. Add Redis config to .env
3. Update yjs-server.ts to use y-redis

### Add Authentication
1. Install @nestjs/jwt
2. Create auth module
3. Add guards to controllers
4. Validate JWT in WebSocket

## 💡 Performance Tips

### Database
```sql
-- Add indexes
CREATE INDEX idx_documents_public_id ON documents(public_id);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);

-- Vacuum regularly
VACUUM ANALYZE documents;
```

### Caching
```typescript
// Cache hot documents in Redis
const cached = await redis.get(`doc:${publicId}`);
if (cached) return JSON.parse(cached);
```

### WebSocket
```typescript
// Compress large updates
if (update.length > 1024) {
  update = zlib.gzipSync(update);
}
```

## 🚀 Scaling Checklist

- [ ] Add Redis for pub/sub
- [ ] Use load balancer
- [ ] Enable database replication
- [ ] Add monitoring (Prometheus)
- [ ] Set up logging (Winston)
- [ ] Add rate limiting
- [ ] Enable HTTPS/WSS
- [ ] Add authentication
- [ ] Implement caching
- [ ] Optimize database queries

## 📞 Support

- GitHub Issues
- Documentation in `backend/`
- Architecture guide: `ARCHITECTURE.md`
- Integration guide: `FRONTEND_INTEGRATION.md`

---

**Quick Start**: `cd backend && npm install && npm run dev:api`

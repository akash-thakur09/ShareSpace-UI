# Deployment Guide

This guide covers deploying ShareSpace to various platforms.

## Pre-Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Run `npm run lint` with no errors
- [ ] Test the production build locally with `npm run preview`
- [ ] Configure environment variables
- [ ] Set up Fluid Framework backend (Azure Fluid Relay or local server)
- [ ] Configure AI API keys (if using AI features)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `VITE_FLUID_TENANT_ID` - Your Fluid tenant ID
- `VITE_FLUID_ENDPOINT` - Fluid service endpoint
- `VITE_AI_API_KEY` - OpenAI or other AI service key

## Platform-Specific Deployment

### 1. Vercel (Recommended)

**One-Click Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/sharespace)

**Manual Deploy:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Configuration:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Framework Preset: Vite

### 2. Netlify

**One-Click Deploy:**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/sharespace)

**Manual Deploy:**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

**Configuration:**
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: (leave empty)

### 3. Docker

**Build Image:**

```bash
# Build the Docker image
docker build -t sharespace:latest .

# Run locally
docker run -p 80:80 sharespace:latest

# Test
curl http://localhost
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

**Deploy to Cloud:**

```bash
# Tag for registry
docker tag sharespace:latest registry.example.com/sharespace:latest

# Push to registry
docker push registry.example.com/sharespace:latest

# Deploy (example for AWS ECS, GCP Cloud Run, etc.)
```

### 4. AWS S3 + CloudFront

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**S3 Bucket Configuration:**
- Enable static website hosting
- Set index document: `index.html`
- Set error document: `index.html` (for SPA routing)

**CloudFront Configuration:**
- Origin: Your S3 bucket
- Default Root Object: `index.html`
- Error Pages: 404 → /index.html (200)

### 5. GitHub Pages

```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

**Note:** Update `vite.config.ts` with base path:

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
})
```

### 6. Azure Static Web Apps

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create static web app
az staticwebapp create \
  --name sharespace \
  --resource-group your-resource-group \
  --source https://github.com/yourusername/sharespace \
  --location "East US 2" \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

## Post-Deployment

### 1. Configure Custom Domain

**Vercel:**
```bash
vercel domains add yourdomain.com
```

**Netlify:**
- Go to Domain Settings
- Add custom domain
- Configure DNS

### 2. Enable HTTPS

All recommended platforms provide automatic HTTPS via Let's Encrypt.

### 3. Set Up Monitoring

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

Add to `src/main.tsx`:
```typescript
import { inject } from '@vercel/analytics';
inject();
```

**Google Analytics:**
Add to `index.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

### 4. Configure CDN Caching

Headers are already configured in:
- `vercel.json` for Vercel
- `netlify.toml` for Netlify
- `nginx.conf` for Docker/custom servers

### 5. Set Up CI/CD

**GitHub Actions Example:**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_FLUID_TENANT_ID: ${{ secrets.FLUID_TENANT_ID }}
          VITE_FLUID_ENDPOINT: ${{ secrets.FLUID_ENDPOINT }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Performance Optimization

### 1. Enable Compression

Already configured in:
- Vite build (automatic)
- nginx.conf (gzip)
- Platform configs (Brotli)

### 2. Image Optimization

```bash
# Install image optimization
npm install -D vite-plugin-imagemin
```

### 3. Lazy Loading

Routes are already configured for code splitting in `vite.config.ts`.

### 4. Service Worker (Optional)

```bash
# Install Workbox
npm install -D workbox-webpack-plugin
```

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### 404 on Refresh

Ensure SPA fallback is configured:
- Vercel: `vercel.json` rewrites
- Netlify: `netlify.toml` redirects
- Nginx: `try_files` directive

### Environment Variables Not Working

- Prefix with `VITE_` for client-side access
- Rebuild after changing variables
- Check platform-specific env var configuration

### Slow Load Times

- Enable CDN caching
- Optimize images
- Check bundle size: `npm run build -- --mode analyze`
- Consider lazy loading heavy components

## Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] API keys in environment variables (not committed)
- [ ] CORS configured properly
- [ ] Rate limiting on API endpoints
- [ ] Content Security Policy (CSP) configured
- [ ] Regular dependency updates

## Monitoring & Analytics

### Recommended Tools

- **Vercel Analytics** - Built-in performance monitoring
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User analytics
- **Lighthouse CI** - Performance monitoring

### Health Checks

Set up monitoring for:
- `/health` endpoint (if using Docker/nginx)
- Build status
- Deployment status
- API availability

## Scaling Considerations

### Horizontal Scaling

- Use CDN for static assets
- Deploy to multiple regions
- Load balance API requests

### Database/State Management

- Configure Fluid Framework for production
- Set up proper Azure Fluid Relay tenant
- Consider Redis for session management

### Cost Optimization

- Enable caching aggressively
- Use serverless functions for API
- Monitor bandwidth usage
- Optimize bundle size

## Support

For deployment issues:
- Check platform documentation
- Review build logs
- Test locally with `npm run preview`
- Open an issue on GitHub

---

Last updated: 2026-02-25

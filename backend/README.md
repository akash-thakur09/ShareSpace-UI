# ShareSpace Backend

Production-grade backend for ShareSpace collaborative document editor using Yjs CRDTs and NestJS.

## Architecture Overview

### Why This Stack?

**Yjs + CRDT**: Industry-standard CRDT library used by Figma, Linear, and others. Provides:
- Conflict-free real-time collaboration
- Offline support
- Efficient binary protocol
- Battle-tested in production

**y-websocket Protocol**: Standard WebSocket protocol for Yjs:
- Compatible with all Yjs clients
- Awareness (presence) built-in
- Automatic sync and reconnection
- No custom protocol needed

**NestJS**: Enterprise-grade Node.js framework:
- TypeScript-first
- Dependency injection
- Modular architecture
- Production-ready patterns

### System Architecture

```
┌─────────────┐
│   Frontend  │ (React + TipTap + Yjs)
│  Port 3000  │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       │ REST API        │ WebSocket       │
       ▼                 ▼                 │
┌─────────────┐   ┌─────────────┐        │
│  NestJS API │   │ Yjs Server  │        │
│  Port 4000  │   │  Port 3001  │        │
└──────┬──────┘   └──────┬──────┘        │
       │                 │                 │
       └────────┬────────┘                 │
                ▼                          │
         ┌─────────────┐                  │
         │ PostgreSQL  │                  │
         │  Port 5432  │                  │
         └─────────────┘                  │
                                          │
         ┌─────────────┐                  │
         │   Redis     │◄─────────────────┘
         │  Port 6379  │  (Optional scaling)
         └─────────────┘
```

### Data Flow

1. **Document Creation**:
   - Frontend → POST /documents → NestJS API
   - API generates public ID (6 chars)
   - Creates UUID internally
   - Initializes empty Yjs document
   - Returns public ID to frontend

2. **Real-time Collaboration**:
   - Frontend connects to ws://localhost:3001?doc={publicId}
   - Yjs server loads document from database
   - Clients exchange CRDT updates via WebSocket
   - Server persists updates every 30s

3. **Document Persistence**:
   - Yjs server stores binary Yjs state
   - Snapshots created periodically
   - Can restore from any snapshot

### Document ID Strategy

- **Public ID**: 6-character nanoid (e.g., "a3k9m2")
  - Used in URLs
  - Safe to expose
  - Collision-resistant

- **Internal ID**: UUID v4
  - Never exposed to frontend
  - Used for database relations
  - Guaranteed uniqueness

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── document/
│   │   │   ├── entities/
│   │   │   │   ├── document.entity.ts
│   │   │   │   └── document-snapshot.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-document.dto.ts
│   │   │   │   └── update-document.dto.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── document.service.ts
│   │   │   └── document.module.ts
│   │   └── health/
│   │       ├── health.controller.ts
│   │       └── health.module.ts
│   ├── app.module.ts
│   ├── main.ts              # NestJS API server
│   └── yjs-server.ts        # Yjs WebSocket server
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (optional, for scaling)

### Installation

```bash
cd backend
npm install
```

### Database Setup

```bash
# Create database
createdb sharespace

# Or using psql
psql -U postgres
CREATE DATABASE sharespace;
\q
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your settings
```

### Running in Development

You need to run TWO servers:

```bash
# Terminal 1: NestJS API Server
npm run dev:api

# Terminal 2: Yjs WebSocket Server
npm run dev:yjs
```

Or use a process manager:

```bash
# Install PM2
npm install -g pm2

# Start both servers
pm2 start npm --name "api" -- run dev:api
pm2 start npm --name "yjs" -- run dev:yjs

# View logs
pm2 logs

# Stop all
pm2 stop all
```

### Verify Setup

```bash
# Check API health
curl http://localhost:4000/health

# Check Yjs server
curl http://localhost:3001
```

## API Endpoints

### Documents

#### Create Document
```http
POST /documents
Content-Type: application/json

{
  "title": "My Document",
  "metadata": {}
}

Response:
{
  "publicId": "a3k9m2",
  "title": "My Document",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "metadata": {}
}
```

#### Get Document
```http
GET /documents/:publicId

Response:
{
  "publicId": "a3k9m2",
  "title": "My Document",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastAccessedAt": "2024-01-01T00:00:00.000Z",
  "metadata": {}
}
```

#### Update Document
```http
PUT /documents/:publicId
Content-Type: application/json

{
  "title": "Updated Title",
  "metadata": { "tags": ["important"] }
}
```

#### Create Snapshot
```http
POST /documents/:publicId/snapshots

Response:
{
  "id": "uuid",
  "version": 1,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Snapshots
```http
GET /documents/:publicId/snapshots

Response:
[
  {
    "id": "uuid",
    "version": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "metadata": {}
  }
]
```

#### Restore Snapshot
```http
POST /documents/:publicId/snapshots/:snapshotId/restore
```

### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "sharespace-api"
}
```

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001?doc=a3k9m2');
```

### Message Format

The server uses the standard y-websocket protocol:

- **Sync Messages** (type 0): CRDT updates
- **Awareness Messages** (type 1): User presence

This is handled automatically by the Yjs client library.

## Scaling Strategy

### Horizontal Scaling

For production with multiple backend instances:

1. **Stateless API**: NestJS API is already stateless
2. **Yjs Server Scaling**: Use Redis for pub/sub

```typescript
// Install y-redis
npm install y-redis

// Modify yjs-server.ts to use Redis
import { RedisPersistence } from 'y-redis';

const persistence = new RedisPersistence({
  host: 'localhost',
  port: 6379,
});
```

3. **Load Balancer**: Use nginx or AWS ALB
   - Sticky sessions for WebSocket
   - Round-robin for API

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_documents_public_id ON documents(public_id);
CREATE INDEX idx_snapshots_document_id ON document_snapshots(document_id);
CREATE INDEX idx_snapshots_created_at ON document_snapshots(created_at DESC);
```

### Caching Strategy

- Redis for hot documents
- CDN for static assets
- Database query caching

## Production Deployment

### Environment Variables

```bash
NODE_ENV=production
API_PORT=4000
YJS_PORT=3001
DB_HOST=your-db-host
DB_PASSWORD=secure-password
REDIS_HOST=your-redis-host
```

### Build

```bash
npm run build
```

### Run

```bash
# Using PM2
pm2 start dist/main.js --name api
pm2 start dist/yjs-server.js --name yjs

# Or using Docker
docker-compose up -d
```

### Monitoring

- Health endpoint: `/health`
- Metrics: Add Prometheus/Grafana
- Logging: Winston + CloudWatch
- Error tracking: Sentry

## Performance Benchmarks

Expected performance:

- **Concurrent Users**: 1000+ per instance
- **Latency**: <50ms for updates
- **Throughput**: 10k+ ops/sec
- **Memory**: ~100MB per 1000 documents

## Security Considerations

1. **Input Validation**: All DTOs validated
2. **Rate Limiting**: Add express-rate-limit
3. **Authentication**: Add JWT middleware
4. **CORS**: Configured per environment
5. **SQL Injection**: TypeORM prevents this
6. **XSS**: Frontend sanitization

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
psql -U postgres -d sharespace
```

### WebSocket Connection Failed
```bash
# Check Yjs server is running
curl http://localhost:3001

# Check firewall rules
netstat -an | grep 3001
```

### Document Not Syncing
```bash
# Check browser console for errors
# Verify document exists in database
psql -U postgres -d sharespace
SELECT * FROM documents WHERE public_id = 'a3k9m2';
```

## Development Tips

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n AddNewColumn

# Run migrations
npm run migration:run
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Debugging

```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev:api

# Debug Yjs protocol
# Add to yjs-server.ts:
console.log('Message:', messageType, decoder);
```

## Common Pitfalls

1. **Don't slice UUIDs**: Use separate public IDs
2. **Don't trust frontend IDs**: Generate server-side
3. **Don't store HTML**: Store Yjs binary state
4. **Don't poll**: Use WebSocket for real-time
5. **Don't skip persistence**: Always save to database

## Next Steps

- [ ] Add authentication (JWT)
- [ ] Add authorization (document permissions)
- [ ] Add Redis for scaling
- [ ] Add monitoring (Prometheus)
- [ ] Add rate limiting
- [ ] Add document sharing
- [ ] Add user management
- [ ] Add webhooks
- [ ] Add API documentation (Swagger)
- [ ] Add E2E tests

## Resources

- [Yjs Documentation](https://docs.yjs.dev/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [y-websocket Protocol](https://github.com/yjs/y-websocket)
- [TypeORM Documentation](https://typeorm.io/)

## License

MIT

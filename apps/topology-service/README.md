# Topology Service

Real-time service dependency graph management service built with NestJS 11.

## Features

- **Service Registration**: Register and manage services with metadata
- **Dependency Management**: Define and track dependencies between services
- **Real-time Updates**: WebSocket support for live graph updates
- **Advanced Graph Algorithms**:
  - Cycle detection (Tarjan's algorithm)
  - Topological sorting
  - Transitive dependency resolution
  - Blast radius calculation
  - Shortest path finding
- **Caching**: Redis-based hot graph caching
- **Persistence**: MongoDB for graph snapshots
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **API Documentation**: Full OpenAPI/Swagger documentation

## Tech Stack

- **Framework**: NestJS 11
- **Runtime**: Node.js 20
- **Language**: TypeScript 5.7+ (strict mode)
- **Cache**: Redis 7
- **Database**: MongoDB 7
- **WebSocket**: Socket.IO
- **Logging**: Pino (structured JSON logging)
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://localhost:27017/topology
GRAPH_CACHE_TTL=300
MAX_DEPTH=10
```

### Development

```bash
# Start in development mode
npm run start:dev

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Lint
npm run lint
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f topology-service

# Stop services
docker-compose down
```

## API Endpoints

### Ingestion

- `POST /api/v1/ingestion/services` - Register a service
- `PUT /api/v1/ingestion/services/:id` - Update a service
- `DELETE /api/v1/ingestion/services/:id` - Deregister a service
- `POST /api/v1/ingestion/dependencies` - Register a dependency
- `PUT /api/v1/ingestion/dependencies/:source/:target/:type` - Update a dependency
- `DELETE /api/v1/ingestion/dependencies/:source/:target/:type` - Remove a dependency
- `POST /api/v1/ingestion/reports` - Submit dependency report

### Query

- `GET /api/v1/query/services` - Get all services
- `GET /api/v1/query/services/:id` - Get a specific service
- `GET /api/v1/query/dependencies` - Get all dependencies
- `GET /api/v1/query/dependencies/:serviceId/direct` - Get direct dependencies
- `GET /api/v1/query/dependencies/:serviceId/transitive` - Get transitive dependencies
- `GET /api/v1/query/dependencies/:serviceId/reverse` - Get reverse dependencies
- `GET /api/v1/query/blast-radius/:serviceId` - Calculate blast radius
- `GET /api/v1/query/path/:sourceId/:targetId` - Find shortest path
- `POST /api/v1/query/subgraph` - Extract subgraph
- `GET /api/v1/query/statistics` - Get graph statistics
- `GET /api/v1/query/cycles` - Detect cycles
- `GET /api/v1/query/topological-sort` - Get topological sort
- `GET /api/v1/query/export` - Export graph as JSON

### Health

- `GET /health` - Complete health check
- `GET /health/liveness` - Liveness probe
- `GET /health/readiness` - Readiness probe

### WebSocket

Connect to `/graph` namespace for real-time graph updates:

```javascript
const socket = io('http://localhost:3001/graph');

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.emit('subscribe', { eventTypes: ['node_added', 'edge_added'] });

socket.on('graph_update', (event) => {
  console.log('Update:', event);
});
```

## API Documentation

Access Swagger UI at: `http://localhost:3001/api`

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Architecture

```
src/
├── graph/              # Graph data structure and algorithms
│   ├── entities/       # ServiceNode, DependencyEdge
│   ├── dto/           # Data transfer objects
│   └── graph.service.ts
├── ingestion/         # Service/dependency registration
│   ├── ingestion.controller.ts
│   └── graph.gateway.ts  # WebSocket gateway
├── query/             # Graph query endpoints
│   └── query.controller.ts
├── infrastructure/    # Infrastructure concerns
│   ├── health/       # Health checks
│   ├── persistence/  # MongoDB persistence
│   └── schemas/      # Mongoose schemas
├── common/           # Shared utilities
│   ├── config/      # Configuration
│   ├── filters/     # Exception filters
│   └── interceptors/ # Request interceptors
├── app.module.ts
└── main.ts
```

## License

MIT

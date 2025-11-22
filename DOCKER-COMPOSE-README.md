# Running FreshBonds Locally with Docker Compose

> **👨‍💻 For Developers:** See [DEVELOPMENT-GUIDE.md](./DEVELOPMENT-GUIDE.md) for the recommended development workflow with hot-reloading!

## Prerequisites
- Docker and Docker Compose installed
- MongoDB Atlas account (or local MongoDB instance)
- Environment variables configured

## Setup Instructions

### 1. Create Environment File
Copy the example environment file and fill in your values:
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A strong random string for JWT signing
- `IPG_*`: Your payment gateway credentials

### 2. Build and Run Services
```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **User Service**: http://localhost:3001
- **Product Service**: http://localhost:3002

## Service Architecture

```
┌─────────────┐
│  Frontend   │ :3000
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ :8080
└──────┬──────┘
       │
       ├─────────────┐
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│User Service │ │Product Svc  │
│    :3001    │ │    :3002    │
└─────────────┘ └─────────────┘
       │             │
       └──────┬──────┘
              ▼
      ┌──────────────┐
      │ MongoDB Atlas│
      └──────────────┘
```

## Development Workflow

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f api-gateway
docker-compose logs -f user-service
docker-compose logs -f product-service
```

### Restart a Service
```bash
docker-compose restart frontend
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose up -d --build frontend

# Rebuild all services
docker-compose up -d --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### MongoDB Connection Issues
- Verify your `MONGODB_URI` is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure network access is configured in Atlas

### Frontend Can't Connect to API
- Ensure API Gateway is running: `docker-compose ps`
- Check API Gateway logs: `docker-compose logs api-gateway`
- Verify the frontend can reach the gateway: `curl http://localhost:8080/health`

### Service Crashes on Startup
```bash
# Check logs for errors
docker-compose logs <service-name>

# Remove containers and rebuild
docker-compose down
docker-compose up --build
```

## Hot Reload in Development

The frontend service is configured with volume mounting, so changes to React code will hot-reload automatically. Backend services require a restart:

```bash
docker-compose restart user-service
```

## Differences from Production (ArgoCD)

| Aspect | Docker Compose (Local) | Kubernetes (Production) |
|--------|----------------------|------------------------|
| Networking | Bridge network | Service mesh |
| Secrets | .env file | Sealed Secrets |
| Scaling | Single instance | Multiple replicas |
| Health checks | Docker healthchecks | Kubernetes probes |
| Ingress | Direct port mapping | Nginx Ingress Controller |
| Monitoring | Container logs | Prometheus + Grafana |
| Security | Basic | Falco, NetworkPolicies, PSS |

## Next Steps

Once you've validated locally, deploy to Kubernetes:
```bash
# Sync with ArgoCD
kubectl apply -f bootstrap/bootstrap-app.yaml
```

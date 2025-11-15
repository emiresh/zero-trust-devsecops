# Docker Build Args Management Guide

## 📋 Overview

Build arguments (`ARG`) are used to pass values **at build time** to Docker images. They are different from environment variables (`ENV`) which are available at runtime.

---

## 🎯 Current Setup

### Frontend Service (Requires Build Arg)

**File**: `src/frontend/Dockerfile`

The frontend is a **React + Vite** application that needs the API URL baked into the build because:
1. Vite replaces `import.meta.env.VITE_API_URL` at build time
2. The production build is static HTML/JS files served by nginx
3. No dynamic environment variables in the browser

**Dockerfile:**
```dockerfile
FROM node:20-alpine as build

# Accept build argument
ARG VITE_API_URL
# Convert to environment variable for the build process
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build  # This is when VITE_API_URL is used

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

**How to build:**

1. **Local Development (Docker Compose):**
   ```yaml
   frontend:
     build: 
       context: ./src/frontend
       args:
         VITE_API_URL: /api  # Relative path for same domain
   ```

2. **For Kubernetes (Different API URL):**
   ```bash
   docker build \
     --build-arg VITE_API_URL=/api \
     -t emiresh/freshbonds-frontend:v1.2.0 \
     ./src/frontend
   ```

3. **For Different Environments:**
   ```bash
   # Production (same domain, relative path)
   docker build --build-arg VITE_API_URL=/api -t emiresh/freshbonds-frontend:v1.2.0 .
   
   # Staging (different domain, absolute URL)
   docker build --build-arg VITE_API_URL=https://api-staging.freshbonds.com -t emiresh/freshbonds-frontend:staging .
   
   # Local development (localhost)
   docker build --build-arg VITE_API_URL=http://localhost:8080/api -t emiresh/freshbonds-frontend:dev .
   ```

---

### Backend Services (No Build Args Needed)

**Files**: 
- `src/api-gateway/Dockerfile`
- `src/user-service/Dockerfile`
- `src/product-service/Dockerfile`

Backend services use **runtime environment variables** instead of build args because:
1. They run Node.js servers that can read `process.env` at runtime
2. Same Docker image can be used in different environments
3. More flexible and secure (secrets not baked into image)

**Example - User Service:**
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=nodejs:nodejs . .

USER nodejs
EXPOSE 3001

# No ARG needed! Environment variables are passed at runtime
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

**How to run:**

1. **Docker Compose (environment variables):**
   ```yaml
   user-service:
     build: ./src/user-service
     environment:
       - MONGODB_URI=${MONGODB_URI}
       - JWT_SECRET=${JWT_SECRET}
       - NODE_ENV=production
   ```

2. **Kubernetes (from Sealed Secrets):**
   ```yaml
   envFrom:
     - secretRef:
         name: freshbonds-secrets
   ```

3. **Manual docker run:**
   ```bash
   docker run \
     -e MONGODB_URI="mongodb+srv://..." \
     -e JWT_SECRET="your-secret" \
     -e NODE_ENV=production \
     -p 3001:3001 \
     emiresh/freshbonds-user-service:v1.2.1
   ```

---

## 🔄 Build Args vs Environment Variables

| Aspect | Build Args (ARG) | Environment Variables (ENV) |
|--------|------------------|----------------------------|
| **When set** | Build time | Runtime |
| **Visibility** | Baked into image layers | Not in image |
| **Security** | ⚠️ Visible in image history | ✅ Can be secret |
| **Flexibility** | ❌ Need rebuild to change | ✅ Change without rebuild |
| **Use case** | Frontend config, versions | Backend config, secrets |
| **Example** | `VITE_API_URL=/api` | `MONGODB_URI=mongodb://...` |

---

## 🛠️ Complete Build & Deployment Workflow

### Step 1: Build All Images

```bash
#!/bin/bash
# build-all.sh

VERSION="v1.2.1"

# Backend services (no build args)
echo "🔨 Building backend services..."
docker build -t emiresh/freshbonds-api-gateway:$VERSION ./src/api-gateway
docker build -t emiresh/freshbonds-user-service:$VERSION ./src/user-service
docker build -t emiresh/freshbonds-product-service:$VERSION ./src/product-service

# Frontend (with build arg)
echo "🎨 Building frontend..."
docker build \
  --build-arg VITE_API_URL=/api \
  -t emiresh/freshbonds-frontend:$VERSION \
  ./src/frontend

echo "✅ All images built successfully!"
```

### Step 2: Push to Docker Hub

```bash
#!/bin/bash
# push-all.sh

VERSION="v1.2.1"

docker push emiresh/freshbonds-api-gateway:$VERSION
docker push emiresh/freshbonds-user-service:$VERSION
docker push emiresh/freshbonds-product-service:$VERSION
docker push emiresh/freshbonds-frontend:$VERSION

echo "✅ All images pushed to Docker Hub!"
```

### Step 3: Update Kubernetes

```yaml
# apps/freshbonds/values.yaml
deployments:
  - name: apigateway
    image:
      tag: v1.2.1  # Update version
  
  - name: frontend
    image:
      tag: v1.2.1  # This image has VITE_API_URL=/api baked in
  
  - name: user-service
    image:
      tag: v1.2.1  # Will read MONGODB_URI from sealed secret at runtime
  
  - name: product-service
    image:
      tag: v1.2.1  # Will read MONGODB_URI from sealed secret at runtime
```

---

## ⚠️ Important Notes

### For Frontend:
- **Always specify `VITE_API_URL` when building**
- If you forget the build arg, frontend will fail to connect to API
- Current production value: `VITE_API_URL=/api` (relative path)
- This works because nginx is on freshbonds.com and API is on freshbonds.com/api

### For Backend:
- **Never use build args for secrets** (MONGODB_URI, JWT_SECRET, etc.)
- Always use environment variables at runtime
- In Kubernetes, use Sealed Secrets
- In docker-compose, use `.env` file

### Version Tags:
- ❌ **Never use `latest` in production**
- ✅ **Always use semantic versioning** (v1.2.1, v1.2.2, etc.)
- This ensures ArgoCD detects changes and updates pods

---

## 🔍 Troubleshooting

### Problem: Frontend can't connect to API

**Check 1: Was VITE_API_URL set during build?**
```bash
# Inspect the image
docker run --rm -it emiresh/freshbonds-frontend:v1.2.1 sh
# Inside container, check nginx config
cat /etc/nginx/nginx.conf | grep proxy_pass
# Should show: proxy_pass http://apigateway-service:8080;
```

**Solution:**
```bash
# Rebuild with correct build arg
docker build --build-arg VITE_API_URL=/api -t emiresh/freshbonds-frontend:v1.2.1 ./src/frontend
docker push emiresh/freshbonds-frontend:v1.2.1
```

### Problem: Backend can't connect to MongoDB

**Check 1: Are environment variables set?**
```bash
kubectl exec -it user-service-xxx -n dev -- env | grep MONGODB_URI
```

**Check 2: Is sealed secret deployed?**
```bash
kubectl get sealedsecrets -n dev
kubectl get secrets freshbonds-secrets -n dev
```

**Solution:**
```bash
# Recreate sealed secret if needed
kubectl delete sealedsecret freshbonds-secrets -n dev
kubectl apply -f apps/freshbonds/templates/sealed-secret.yaml
kubectl rollout restart deployment user-service -n dev
```

---

## 📚 Quick Reference

### Build Commands

```bash
# Frontend (with build arg)
docker build --build-arg VITE_API_URL=/api -t emiresh/freshbonds-frontend:v1.2.1 ./src/frontend

# Backend (no build args)
docker build -t emiresh/freshbonds-user-service:v1.2.1 ./src/user-service
docker build -t emiresh/freshbonds-product-service:v1.2.1 ./src/product-service
docker build -t emiresh/freshbonds-api-gateway:v1.2.1 ./src/api-gateway
```

### Docker Compose

```bash
# Build all services (uses docker-compose.yml args)
docker-compose build

# Build specific service
docker-compose build frontend

# Build and run
docker-compose up --build
```

### Kubernetes

```bash
# Check current image versions
kubectl get deployment -n dev -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}'

# Force update after image push
kubectl rollout restart deployment/frontend -n dev
kubectl rollout restart deployment/user-service -n dev
kubectl rollout restart deployment/product-service -n dev
kubectl rollout restart deployment/apigateway -n dev
```

---

## ✅ Summary

| Service | Build Args? | Runtime Env Vars? | Why? |
|---------|-------------|-------------------|------|
| Frontend | ✅ `VITE_API_URL` | ❌ | Static build, no server |
| API Gateway | ❌ | ✅ All secrets | Node.js server |
| User Service | ❌ | ✅ All secrets | Node.js server |
| Product Service | ❌ | ✅ All secrets | Node.js server |

**Golden Rule:**  
- Use **build args** for values that are NOT secrets and need to be in the static build (frontend)
- Use **environment variables** for everything else, especially secrets (backend)

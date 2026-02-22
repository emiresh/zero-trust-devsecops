# Fresh Bonds - Microservices Application

Production-ready microservices application with Kubernetes deployment using ArgoCD GitOps workflow.

## Architecture

- **API Gateway** (Port 8080) - Central entry point, payment integration
- **User Service** (Port 8082) - Authentication and user management
- **Product Service** (Port 8081) - Product catalog
- **Frontend** (React + Vite) - User interface served via Nginx

## Tech Stack

- **Backend**: Node.js 18-20, Express, Mongoose 8.x
- **Frontend**: React, Vite
- **Database**: MongoDB Atlas
- **Container**: Docker with multi-stage builds
- **Orchestration**: Kubernetes 1.28.15 (3-node cluster)
- **GitOps**: ArgoCD with bootstrap pattern
- **Security**: Sealed Secrets, non-root containers
- **Ingress**: Nginx with cert-manager/Let's Encrypt TLS

## Quick Start

### Building Docker Images

```bash
# Build all services with specific version
./scripts/build-and-push.sh v1.2.1

# Or build individually
docker build -t emiresh/freshbonds-api-gateway:v1.2.1 ./src/api-gateway
docker build -t emiresh/freshbonds-user-service:v1.2.1 ./src/user-service
docker build -t emiresh/freshbonds-product-service:v1.2.1 ./src/product-service

# Frontend requires build arg
docker build \
  --build-arg VITE_API_URL=/api \
  -t emiresh/freshbonds-frontend:v1.2.1 \
  ./src/frontend
```

### Pushing to Docker Hub

```bash
docker push emiresh/freshbonds-api-gateway:v1.2.1
docker push emiresh/freshbonds-user-service:v1.2.1
docker push emiresh/freshbonds-product-service:v1.2.1
docker push emiresh/freshbonds-frontend:v1.2.1
```

### Deploying with ArgoCD

ArgoCD automatically syncs from the `main` branch. The bootstrap app manages all resources in `clusters/test-cluster/`:

```bash
# Check deployment status
kubectl get applications -n argocd

# Watch pod updates
kubectl get pods -n dev -w

# Check service health
kubectl logs -n dev -l app=api-gateway
```

### Database Initialization (First Time Setup)

After deploying for the first time, the database initialization job runs automatically:

```bash
# Watch the job progress
kubectl logs -n dev -f job/freshbonds-db-init

# Verify completion
kubectl get jobs -n dev
```

The job creates the admin user and is idempotent (safe to run multiple times).

## Build Arguments vs Environment Variables

### Frontend (Build-time)
The frontend uses **build arguments** because Vite bundles environment variables into the static JavaScript at build time:

```bash
# VITE_API_URL must be set during docker build
docker build --build-arg VITE_API_URL=/api -t image:tag ./src/frontend
```

**Why?** React/Vite creates static files. The API URL is baked into the bundle during `npm run build`.

### Backend Services (Runtime)
Backend services use **environment variables** because Node.js reads them at runtime:

```yaml
# Set in Kubernetes deployment
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: mongodb-credentials
        key: uri
```

**Why?** Server-side code can read `process.env` while running. No rebuild needed to change config.

## Production Features

### Health Checks
All services expose health endpoints:
- `GET /health/live` - Liveness probe (process alive)
- `GET /health/ready` - Readiness probe (dependencies ready)

### Kubernetes Probes
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Graceful Shutdown
Services handle SIGTERM/SIGINT signals:
- 5-second drain period for active requests
- MongoDB connections closed cleanly
- Prevents data loss during pod termination

### Security
- ✅ Non-root containers (user `nodejs:1001`)
- ✅ No hardcoded credentials
- ✅ Sealed Secrets for sensitive data
- ✅ Rate limiting on API gateway
- ✅ TLS termination with Let's Encrypt

### Container Best Practices
- ✅ Multi-stage builds (smaller images)
- ✅ `dumb-init` for proper signal handling
- ✅ HEALTHCHECK directives
- ✅ .dockerignore files
- ✅ Reproducible builds with package-lock.json

## Directory Structure

```
zero-trust-devsecops/
├── apps/
│   └── freshbonds/          # Helm chart
│       ├── values.yaml      # Image tags, health check config
│       └── templates/       # Kubernetes manifests
├── bootstrap/
│   └── bootstrap-app.yaml   # ArgoCD bootstrap (recurse: true)
├── clusters/
│   └── test-cluster/
│       ├── 00-namespaces/
│       ├── 01-projects/
│       ├── 05-infrastructure/
│       │   ├── cert-manager/
│       │   ├── kube-prometheus-stack.yaml
│       │   ├── nginx-ingress.yaml
│       │   └── local-path-provisioner.yaml
│       ├── 10-apps/
│       │   └── dev-app.yaml
│       └── 15-ingress/
├── src/
│   ├── api-gateway/
│   ├── user-service/
│   ├── product-service/
│   └── frontend/
└── scripts/
    └── build-and-push.sh
```

## ArgoCD Bootstrap Pattern

The `bootstrap-app` uses `recurse: true` to automatically manage all YAML files in `clusters/test-cluster/`. This means:

- ✅ No need for individual Application CRDs
- ✅ Add new manifests by simply creating YAML files
- ✅ ArgoCD auto-discovers and deploys them

**Don't create separate Applications for resources already in `clusters/test-cluster/`** - this causes namespace conflicts!

## Current Version: v1.2.1

### Recent Improvements
- ✅ Health check endpoints with liveness/readiness probes
- ✅ Graceful shutdown handlers
- ✅ Removed hardcoded MongoDB credentials
- ✅ Fixed deprecated Mongoose options
- ✅ Non-root Docker containers with dumb-init
- ✅ Docker HEALTHCHECK directives
- ✅ .dockerignore files for cleaner builds
- ✅ Kubernetes health probes configured

### Next Steps
1. **Push v1.2.1 images to Docker Hub** (built locally only)
2. **Monitor ArgoCD auto-deployment** once images are pushed
3. **Verify health probes** in running pods
4. **Set up monitoring dashboards** (Prometheus/Grafana available)

## Future Improvements

### High Priority
- [ ] Structured logging with correlation IDs
- [ ] Centralized error handling middleware
- [ ] Input validation with Joi/Yup
- [ ] API request/response logging
- [ ] MongoDB connection pooling optimization
- [ ] Implement retry logic for service calls

### Medium Priority
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit test coverage (Jest)
- [ ] Integration tests
- [ ] Performance monitoring (APM)
- [ ] Distributed tracing (Jaeger/Tempo)

### DevOps
- [ ] Multi-environment configs (dev/staging/prod)
- [x] **CI/CD pipeline (GitHub Actions)** - 5 specialized pipelines with left-shift security
- [x] **Automated testing in pipeline** - PR validation, policy checks, security scanning
- [x] **Image scanning (Trivy)** - Blocks CRITICAL vulnerabilities
- [x] **IaC scanning (Checkov)** - Validates Terraform/K8s security
- [x] **Secret scanning (Gitleaks)** - Prevents credential leaks
- [x] **SBOM generation (Syft)** - Software bill of materials for all images
- [x] **Monthly security audits** - Automated vulnerability scans
- [x] **Monthly secret rotation** - JWT, DB credentials, API keys
- [ ] Backup/restore procedures

## Troubleshooting

### Pods Not Updating
**Issue**: Changed `values.yaml` but pods still run old image  
**Solution**: Images must be in Docker Hub. ArgoCD syncs config, but kubelet pulls images from registry.

```bash
# Check if images exist in Docker Hub
docker pull emiresh/freshbonds-api-gateway:v1.2.1

# Force pod recreation
kubectl rollout restart deployment -n dev
```

### Health Probe Failures
**Issue**: Pods in CrashLoopBackOff with readiness probe failures  
**Solution**: Check if service is binding to correct port and health endpoint exists

```bash
# Check pod logs
kubectl logs -n dev <pod-name>

# Exec into pod and test health endpoint
kubectl exec -n dev <pod-name> -- curl localhost:8080/health/live
```

### MongoDB Connection Issues
**Issue**: "MongooseError: Operation buffering timed out"  
**Solution**: Verify sealed secret exists and contains valid MongoDB URI

```bash
# Check if secret exists
kubectl get sealedsecret -n dev mongodb-credentials

# Verify secret was decrypted
kubectl get secret -n dev mongodb-credentials -o yaml
```

### Frontend API Calls Failing
**Issue**: Frontend shows CORS errors or 404 on API calls  
**Solution**: Frontend was built with wrong VITE_API_URL

```bash
# Rebuild with correct build arg
docker build --build-arg VITE_API_URL=/api -t emiresh/freshbonds-frontend:v1.2.1 ./src/frontend

# Push and update values.yaml
docker push emiresh/freshbonds-frontend:v1.2.1
```

## 🚀 CI/CD Pipeline Architecture

This project uses a **5-pipeline architecture** with **left-shift security** and **zero-trust** principles:

### Pipeline Overview

```
Developer Push → PR Validation (< 2 min)
                      ↓
                Code Review
                      ↓
              Merge to main
                      ↓
          ┌───────────┴────────────┐
          ↓                        ↓
  App CI/CD (8-10 min)    Terraform (2-4 min)
  - Build & SBOM          - Format & Validate
  - Security Scan         - Checkov IaC Scan
  - Push Images           - Plan Preview
  - GitOps Update         - Zero-Trust Gates

       Monthly (1st @ 2-3 AM UTC)
          ↓                        ↓
  Security Audit          Secret Rotation
  - All Images            - JWT Keys
  - Policies              - DB Passwords
  - Compliance            - API Keys
```

### 1️⃣ PR Validation (`pr-validation.yml`) - < 2 min
**Runs on:** Every pull request  
**Purpose:** Fast feedback before code review

- ✅ Code linting (ESLint, yamllint)
- ✅ Secret scanning (Gitleaks)
- ✅ Terraform format check
- ✅ K8s manifest validation
- ✅ Security anti-patterns detection
- ✅ PR size analysis

**Result:** Automated PR comment with validation status

### 2️⃣ App CI/CD (`app-cicd.yml`) - 8-10 min
**Runs on:** Push to `main`/`develop` (after PR merge)  
**Purpose:** Build, scan, and deploy applications

- ✅ OPA & Kyverno policy validation
- ✅ Docker multi-arch builds (amd64 + arm64)
- ✅ **SBOM generation** (Syft)
- ✅ **Trivy security scan** (blocks CRITICAL vulnerabilities)
- ✅ **Secret scanning** (embedded credentials)
- ✅ Push to Docker Hub
- ✅ Update GitOps manifests (`values.yaml`)
- ✅ ArgoCD auto-sync trigger

**Zero-Trust:** Deployment blocked if:
- ❌ CRITICAL vulnerabilities found
- ❌ Policy violations detected
- ❌ Secrets embedded in images

### 3️⃣ Terraform (`terraform.yml`) - 2-4 min
**Runs on:** Changes to `terraform/**`  
**Purpose:** Validate infrastructure as code

- ✅ Terraform format & validate
- ✅ Checkov IaC security scanning
- ✅ Plan preview (PR only)
- ✅ Zero-Trust security gates

### 4️⃣ Security Scan (`security-scan.yml`) - Monthly
**Schedule:** 1st of month @ 2 AM UTC  
**Purpose:** Comprehensive security audit

- 🔍 All production images
- 🔍 Policy compliance
- 🔍 Dependency scanning
- 🔍 IaC security audit

### 5️⃣ Secret Rotation (`secret-rotation.yml`) - Monthly
**Schedule:** 1st of month @ 3 AM UTC  
**Purpose:** Automated credential rotation

- 🔑 JWT signing keys
- 🔑 Database passwords
- 🔑 API keys
- 🔐 TLS certificates

**Complete Documentation:** See [docs/PIPELINE-ARCHITECTURE.md](docs/PIPELINE-ARCHITECTURE.md)

---

## Development Workflow

### With Automated CI/CD (Current)

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make code changes** in `src/`

3. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push -u origin feature/my-feature
   ```

4. **Open Pull Request**
   - ✅ **PR Validation runs automatically** (< 2 min)
   - ✅ Checks: linting, secrets, security
   - ✅ Get automated feedback comment

5. **Code Review & Merge**
   - Team reviews code
   - Merge PR to `main`

6. **Automated Deployment** 🚀
   - ✅ **App CI/CD pipeline triggers automatically**
   - ✅ Builds Docker images with `v1.0.X` tag
   - ✅ Scans for vulnerabilities (blocks if CRITICAL)
   - ✅ Generates SBOM
   - ✅ Pushes to Docker Hub
   - ✅ Updates `apps/freshbonds/values.yaml`
   - ✅ ArgoCD syncs new images to cluster
   - ✅ Kubernetes rolls out updated pods

7. **Verify deployment**
   ```bash
   # Watch pods update
   kubectl get pods -n dev -w
   
   # Check new version
   kubectl describe pod -n dev -l app=api-gateway | grep Image:
   ```

**That's it!** No manual image builds, no manual manifest updates. Everything is automated with security gates.

### Manual Override (Emergency Only)

If you need to bypass the pipeline:

```bash
# Build manually
./scripts/build-and-push.sh v1.2.1

# Update manifests
sed -i 's/tag: .*/tag: v1.2.1/' apps/freshbonds/values.yaml
git add apps/freshbonds/values.yaml
git commit -m "chore: manual deploy v1.2.1"
git push
```

## Monitoring

Access monitoring tools (requires port-forward or ingress):

```bash
# Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090

# Alertmanager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093

# ArgoCD
kubectl port-forward -n argocd svc/argocd-server 8080:443
```

## License

Proprietary - Fresh Bonds

## Support

For issues, contact the DevOps team or check ArgoCD logs:

```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

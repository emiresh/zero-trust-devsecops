# System Architecture - Complete Overview

**FreshBonds Zero-Trust DevSecOps Platform**

Complete architecture documentation covering infrastructure, application services, security layers, and operational workflows.

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Layer](#infrastructure-layer)
3. [Kubernetes Platform](#kubernetes-platform)
4. [Application Services](#application-services)
5. [Security Architecture](#security-architecture)
6. [GitOps & CI/CD](#gitops--cicd)
7. [Monitoring & Observability](#monitoring--observability)
8. [Data Flow](#data-flow)
9. [Network Architecture](#network-architecture)
10. [Disaster Recovery](#disaster-recovery)

---

## 🏗️ Architecture Overview

### System Layers

```
┌───────────────────────────────────────────────────────────────┐
│                         USER LAYER                            │
│              (Web Browsers, Mobile Apps, APIs)                │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                       EDGE LAYER                              │
│    NGINX Ingress Controller + Let's Encrypt (TLS)            │
│    Rate Limiting, WAF, DDoS Protection                        │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                           │
│  Frontend → API Gateway → Microservices (User, Product)      │
│  Service Mesh Communication, JWT Auth, Rate Limits           │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                      DATA LAYER                               │
│         MongoDB Atlas (Users, Products, Sessions)             │
│         Encrypted at Rest, TLS in Transit                     │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER (Cross-Cutting)             │
│  Falco Runtime Security | Kyverno Policies | OPA Rules        │
│  Image Scanning | Secret Encryption | Network Policies       │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                  OBSERVABILITY LAYER                          │
│  Prometheus (Metrics) | Grafana (Dashboards) | PagerDuty      │
│  Falco Alerts | Log Aggregation | Distributed Tracing        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                          │
│  OCI Compute (3 ARM64 Instances) | Kubernetes v1.28           │
│  VCN, Subnets, Security Lists, Load Balancers                │
└───────────────────────────────────────────────────────────────┘
```

### Architecture Principles

**Zero-Trust Security**:
- ❌ No implicit trust
- ✅ Verify every request
- ✅ Least privilege access
- ✅ Defense in depth

**Cloud-Native Design**:
- ✅ Containerized microservices
- ✅ Declarative infrastructure (Terraform)
- ✅ GitOps deployment (ArgoCD)
- ✅ Scalable & resilient

**DevSecOps Integration**:
- ✅ Security checks in CI/CD
- ✅ Automated secret rotation
- ✅ Runtime security monitoring
- ✅ Compliance as code

---

## 🌐 Infrastructure Layer

### Cloud Provider: Oracle Cloud Infrastructure (OCI)

**Region**: `us-ashburn-1`  
**Compartment**: `zero-trust-devsecops`

### Compute Resources

**3 ARM64 Instances** (Ampere Altra):

| Instance | Type | Shape | vCPU | RAM | Role | Subnet |
|----------|------|-------|------|-----|------|--------|
| `freshbonds-control-plane-1` | Kubernetes Master | VM.Standard.A1.Flex | 2 | 12 GB | Control Plane | Public |
| `freshbonds-worker-1` | Kubernetes Worker | VM.Standard.A1.Flex | 2 | 12 GB | Worker Node | Private |
| `freshbonds-worker-2` | Kubernetes Worker | VM.Standard.A1.Flex | 2 | 12 GB | Worker Node | Private |

**OS**: Ubuntu 22.04 LTS ARM64  
**Boot Volume**: 50 GB per instance  
**SSH**: Key-based authentication only

### Security Features

**Instance Hardening**:
```hcl
instance_options {
  are_legacy_imds_endpoints_disabled = true  # CKV_OCI_5
}
```

**Metadata Service**:
- IMDSv2 only (token-based)
- Legacy endpoints disabled
- Instance identity verification

### Networking

#### Virtual Cloud Network (VCN)

```
VCN: 10.0.0.0/16 (65,536 IPs)
├─ Public Subnet:  10.0.0.0/24 (254 hosts)
│  ├─ Control Plane: 10.0.0.231
│  └─ Internet Gateway
│
└─ Private Subnet: 10.0.1.0/24 (254 hosts)
   ├─ Worker 1: 10.0.1.231
   ├─ Worker 2: 10.0.1.232
   └─ NAT Gateway (via control plane)
```

#### Security Lists

**Ingress Rules**:
| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 | SSH (control plane access) |
| 80 | TCP | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (application traffic) |
| 6443 | TCP | 10.0.0.0/16 | Kubernetes API Server |
| 10250 | TCP | 10.0.0.0/16 | Kubelet API |
| 2379-2380 | TCP | 10.0.0.0/16 | etcd |
| 10257 | TCP | 10.0.0.0/16 | kube-controller-manager |
| 10259 | TCP | 10.0.0.0/16 | kube-scheduler |
| 30000-32767 | TCP | 10.0.0.0/16 | NodePort Services |

**Egress Rules**:
| Port | Protocol | Destination | Purpose |
|------|----------|-------------|---------|
| ALL | TCP | 0.0.0.0/0 | Internet access (updates, registries) |

**Network Path**:
```
Internet
   ↓
Internet Gateway (10.0.0.0/24)
   ↓
Control Plane (10.0.0.231)
   ↓
Workers (10.0.1.x) via cluster networking
   ↓
NAT via Control Plane for internet access
```

### Infrastructure as Code

**Terraform Modules**:
```
terraform/
├── provider.tf        # OCI provider config
├── backend.tf         # State in OCI Object Storage
├── instances.tf       # 3 compute instances
├── vcn.tf            # Virtual Cloud Network
├── subnet.tf         # Public/private subnets
├── security_list.tf  # Firewall rules
├── route_tables.tf   # Routing configuration
├── gateway.tf        # Internet/NAT gateways
└── outputs.tf        # Resource identifiers
```

**State Management**:
- **Backend**: OCI Object Storage (S3-compatible)
- **Locking**: DynamoDB-compatible locking
- **Encryption**: At-rest encryption enabled
- **Versioning**: Historical state versions preserved

---

## ⚓ Kubernetes Platform

### Cluster Configuration

**Version**: v1.28  
**Container Runtime**: containerd  
**CNI**: Calico (network policies + VXLAN)  
**Architecture**: ARM64 (Ampere Altra)

### Node Roles

```
Control Plane (10.0.0.231):
  • kube-apiserver
  • kube-controller-manager
  • kube-scheduler
  • etcd (single-node, consider HA for production)

Worker Nodes (10.0.1.231, 10.0.1.232):
  • kubelet
  • kube-proxy
  • Application pods
```

### Core Components

#### ArgoCD (GitOps)

**Namespace**: `argocd`  
**Version**: v2.9+  
**Access**: https://argocd.freshbonds.me

**Applications Managed**:
1. `freshbonds-app` - Main application (frontend, services)
2. `infrastructure` - Monitoring, Falco, Sealed Secrets
3. `ingress-config` - NGINX Ingress Controller

**Sync Strategy**:
```yaml
syncPolicy:
  automated:
    prune: true        # Delete removed resources
    selfHeal: true     # Revert manual changes
  syncOptions:
    - CreateNamespace=true
```

**Repository Structure**:
```
clusters/test-cluster/
├── 00-namespaces/      # Namespace definitions
├── 01-projects/        # ArgoCD app-of-apps
├── 05-infrastructure/  # Monitoring, security tools
├── 10-apps/           # Application deployments
└── 15-ingress/        # Ingress routes
```

---

#### Sealed Secrets Controller

**Namespace**: `sealed-secrets`  
**Version**: v0.24.0  
**Public Key**: `sealed-secrets-key2pffg` (active for 99 days)

**Encryption Flow**:
```
1. Secret created manually or in GitHub Actions
2. Encrypted with public key (kubeseal)
3. SealedSecret committed to Git
4. Controller decrypts with private key
5. Secret created in target namespace
```

**Key Rotation**:
- **Schedule**: Every 90 days (automated via GitHub Actions)
- **Process**: New key generated, secrets re-encrypted, old key kept for 30 days
- **Backup**: Private keys backed up to GitHub Secrets

---

#### NGINX Ingress Controller

**Namespace**: `ingress-nginx`  
**Service Type**: NodePort (30080 HTTP, 30443 HTTPS)  
**External LB**: OCI Load Balancer

**Features**:
- TLS termination (Let's Encrypt)
- Rate limiting
- Request routing
- Custom error HTTP pages

**Ingress Routes**:
```yaml
freshbonds.me              → frontend:3000
api.freshbonds.me          → api-gateway:8080
argocd.freshbonds.me       → argocd-server:443
grafana.freshbonds.me      → grafana:3000
```

---

#### Prometheus & Grafana

**Prometheus**:
- **Namespace**: `monitoring`
- **Retention**: 15 days
- **Scrape Interval**: 30s
- **Targets**: Kubernetes metrics, node-exporter, app metrics

**Grafana**:
- **Namespace**: `monitoring`
- **Dashboards**: Pre-configured for Kubernetes, Falco, App metrics
- **Data Sources**: Prometheus, Loki (logs)

**Alertmanager**:
- **Integration**: PagerDuty
- **Routes**: Critical → PagerDuty, Warning → Slack
- **Silences**: Maintenance window support

---

#### Falco Runtime Security

**Namespace**: `falco`  
**Version**: Latest (Helm chart)  
**Kernel Module**: Deployed as DaemonSet

**Rules**:
```yaml
Detects:
  - Privilege escalation attempts
  - Unexpected network connections
  - File system modifications
  - Shell spawned in containers
  - Sensitive file access
```

**Alert Targets**:
- Grafana (dashboard)
- PagerDuty (critical events)
- Log aggregation

**Example Alert**:
```
Critical: Shell spawned in container
Container: product-service-7b8f9d-xyz
Command: /bin/bash
User: root
Action: Investigate immediately
```

---

## 🎯 Application Services

### Microservices Architecture

```
                    ┌──────────────┐
                    │   Frontend   │
                    │  (React SPA) │
                    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
                    │ API Gateway  │ ← Rate limiting, routing
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ↓                         ↓
     ┌────────────────┐        ┌───────────────┐
     │ User Service   │        │Product Service│
     │ (Auth, Users)  │        │(Catalog, Inv) │
     └────────┬───────┘        └───────┬───────┘
              │                        │
              └────────────┬───────────┘
                           ↓
                  ┌─────────────────┐
                  │  MongoDB Atlas  │
                  └─────────────────┘
```

### Service Details

#### 1. Frontend

**Technology**: React + Vite + Tailwind CSS  
**Port**: 3000  
**Build**: Multi-stage Docker (node:18 → nginx:alpine)  
**Architectures**: AMD64 + ARM64

**Features**:
- Server-side rendering ready
- Progressive Web App (PWA)
- Responsive design
- API client (axios)

**Deployment**:
```yaml
Replicas: 2
Resources:
  requests: {cpu: 100m, memory: 128Mi}
  limits: {cpu: 500m, memory: 512Mi}
```

---

#### 2. API Gateway

**Technology**: Express.js  
**Port**: 8080  
**Responsibilities**:
- Request routing to backend services
- Rate limiting (100 req/min per IP)
- Payment gateway integration
- Request/response transformation

**Routes**:
```javascript
/api/users/*     → user-service:8082
/api/products/*  → product-service:8081
/api/payments/*  → payment processing
/health          → Health check
```

**Security**:
- JWT validation
- CORS configured
- Helmet.js (security headers)
- Request size limits

---

#### 3. User Service

**Technology**: Express.js + JWT + bcrypt  
**Port**: 8082  
**Database**: MongoDB (`users` collection)

**Endpoints**:
```
POST   /register          # New user registration
POST   /login             # Authentication
GET    /users/:id         # Get user details
PUT    /users/:id         # Update user
DELETE /users/:id         # Delete user (soft delete)
POST   /verify-token      # JWT verification
```

**Authentication Flow**:
```
1. User sends credentials
2. Service validates against MongoDB
3. bcrypt password verification
4. JWT issued (exp: 24h)
5. JWT required for protected routes
```

---

#### 4. Product Service

**Technology**: Express.js + Mongoose  
**Port**: 8081  
**Database**: MongoDB (`products` collection)

**Endpoints**:
```
GET    /products          # List products (pagination)
GET    /products/:id      # Product details
POST   /products          # Create product (admin)
PUT    /products/:id      # Update product (admin)
DELETE /products/:id      # Delete product (admin)
GET    /search?q=         # Search products
```

**Features**:
- Full-text search
- Inventory tracking
- Image upload support
- Category filtering

---

### Service Communication

**Protocol**: HTTP/REST (future: gRPC)  
**Service Discovery**: Kubernetes DNS  
**Load Balancing**: Kubernetes Service (ClusterIP)

**Example**:
```javascript
// API Gateway calling User Service
const response = await axios.get('http://user-service.dev.svc.cluster.local:8082/users/123', {
  headers: { Authorization: `Bearer ${jwt}` }
});
```

---

## 🔐 Security Architecture

### Defense in Depth

```
Layer 1: Infrastructure Security
  - Security Lists (firewall rules)
  - IMDSv2 only
  - SSH key authentication
  ↓
Layer 2: Network Security
  - Network Policies (Calico)
  - Pod-to-pod encryption (future mTLS)
  - Ingress TLS termination
  ↓
Layer 3: Platform Security
  - RBAC (role-based access)
  - Pod Security Standards (restricted)
  - Resource quotas
  ↓
Layer 4: Application Security
  - JWT authentication
  - Input validation
  - SQL injection prevention
  ↓
Layer 5: Runtime Security
  - Falco anomaly detection
  - Image signature verification
  - Read-only root filesystems
  ↓
Layer 6: Data Security
  - Secrets encryption (Sealed Secrets)
  - Database TLS
  - Encryption at rest
```

### Security Tools Stack

| Tool | Purpose | Layer |
|------|---------|-------|
| **Trivy** | Container/IaC/dependency scanning | Left-shift |
| **Checkov** | Terraform security validation | Left-shift |
| **Kyverno** | Kubernetes policy enforcement | Admission control |
| **OPA** | Custom policy rules | Admission control |
| **Falco** | Runtime anomaly detection | Runtime |
| **Sealed Secrets** | Encryption in Git | Secret management |
| **Cert-Manager** | TLS certificate automation | Network |

---

### Secret Management

**Sealed Secrets Architecture**:
```
GitHub Repository
  ↓ (plain secrets never committed)
GitHub Actions Workflow
  ↓ (secret-rotation.yml)
MongoDB Atlas API (rotate password)
  ↓
kubeseal (encrypt with public key)
  ↓
SealedSecret YAML (committed to Git)
  ↓
ArgoCD (sync to cluster)
  ↓
Sealed Secrets Controller (decrypt with private key)
  ↓
Kubernetes Secret (in cluster)
  ↓
Application Pods (mounted as env vars)
```

**Key Management**:
- Private key stored in cluster (first) + GitHub Secret (backup)
- Public key fetched from cluster or GitHub
- Rotation every 90 days
- Old keys retained for 30 days (renewal grace period)

---

### Policy Enforcement

**Kyverno Policies** (`policies/kyverno/`):
```yaml
pod-security.yaml:
  - Require non-root containers
  - Drop ALL capabilities
  - Read-only root filesystem
  - Disallow privilege escalation
  
image-verification.yaml:
  - Require signature verification
  - Block unsigned images
  - Validate image registry
```

**OPA Policies** (`policies/opa/`):
```rego
security.rego:
  - Enforce resource limits
  - Require security context
  - Block hostPath volumes
  
network.rego:
  - Require network policies
  - Block external egress (except allowed)
```

---

## 🔄 GitOps & CI/CD

### GitHub Actions Workflows

**5 Automated Workflows**:

1. **app-cicd.yml** - Build, scan, deploy services
2. **secret-rotation.yml** - Rotate secrets monthly
3. **security-scan.yml** - Scheduled vulnerability scans
4. **terraform.yml** - Infrastructure changes
5. **pr-validation.yml** - Fast PR feedback

### Deployment Flow (GitOps)

```
Developer Push
  ↓
GitHub Repository
  ↓
GitHub Actions Workflow
  ↓ (build + scan)
Docker Images → Docker Hub
  ↓
Update Image Tags in Git
  ↓
ArgoCD Detects Change
  ↓ (sync interval: 3 min)
Pull Updated Manifests
  ↓
Apply to Kubernetes
  ↓
Rolling Update (maxSurge: 1, maxUnavailable: 0)
  ↓
Health Checks (readiness probes)
  ↓
Service Ready
```

**Zero-Downtime Deployment**:
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # Add 1 pod before removing old
    maxUnavailable: 0    # Never have 0 pods running

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## 📊 Monitoring & Observability

### Metrics Collection

**Prometheus Scraping**:
```
Kubernetes API         → Cluster metrics
Node Exporter          → System metrics (CPU, RAM, disk)
cAdvisor              → Container metrics
Service /metrics      → Application metrics
Falco                 → Security event metrics
```

**Custom Metrics** (Application):
```javascript
// Example: product-service
const responseTime = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
```

---

### Dashboards

**Grafana Dashboards**:
1. **Kubernetes Overview** - Cluster health, node resource usage
2. **Application Metrics** - Request rate, latency, errors
3. **Falco Security Events** - Runtime security alerts
4. **MongoDB Atlas** - Database performance
5. **Ingress Traffic** - HTTP requests, TLS handshakes

---

### Alerting

**PagerDuty Integration**:
```yaml
Critical Alerts (immediate response):
  - Pod CrashLoopBackOff
  - Node NotReady
  - High error rate (> 5%)
  - Falco critical event
  
Warning Alerts (within 1 hour):
  - High CPU/RAM usage (> 80%)
  - Certificate expiring (< 7 days)
  - Database slow queries
```

**Alert Flow**:
```
Prometheus Alert Rules
  ↓
Alertmanager
  ↓ (routing)
PagerDuty API
  ↓
Incident Created
  ↓
On-Call Engineer Notified
```

---

## 🌊 Data Flow

### Request Flow (End-to-End)

```
1. User Browser
   ↓ HTTPS GET /
   
2. Internet → OCI Load Balancer
   ↓ Port 443
   
3. NGINX Ingress (NodePort 30443)
   ↓ TLS termination
   ↓ Route based on hostname
   
4. Frontend Service (ClusterIP)
   ↓ Return HTML/JS/CSS
   
5. Browser renders page
   ↓ JavaScript makes API call
   ↓ HTTPS POST /api/products
   
6. NGINX Ingress
   ↓ Route to api-gateway
   
7. API Gateway (ClusterIP:8080)
   ↓ Validate JWT
   ↓ Route to product-service
   
8. Product Service (ClusterIP:8081)
   ↓ Query MongoDB
   
9. MongoDB Atlas (TLS)
   ↓ Return data
   
10. Product Service → API Gateway → Browser
    ↓ JSON response
    
11. Frontend renders data
```

---

### Database Access Pattern

```
Application Pod
  ↓ Connection String (from Secret)
  ↓ mongodb+srv://user:pass@cluster.mongodb.net/freshbonds
  ↓
NAT Gateway (via Control Plane)
  ↓ NAT to public IP
  ↓
Internet
  ↓
MongoDB Atlas SRV DNS
  ↓ Resolves to replica set
  ↓
MongoDB Replica Set (Primary + Secondaries)
  ↓ TLS 1.2+ required
  ↓ SCRAM-SHA-256 authentication
  ↓
Query Execution
  ↓
Response (BSON)
```

---

## 🚨 Disaster Recovery

### Backup Strategy

**What's Backed Up**:
1. **Sealed Secrets Private Keys** (automated every rotation)
2. **Terraform State** (versioned in OCI Object Storage)
3. **MongoDB** (automated daily snapshots via Atlas)
4. **Git Repository** (source of truth for everything else)

**Recovery Scenarios**:

#### Scenario 1: Lost Sealed Secrets Key
```bash
# 1. Retrieve from GitHub Secret
echo "$SEALED_SECRETS_PRIVATE_KEY" | base64 -d > privatekey.pem

# 2. Restore to cluster
kubectl create secret tls sealed-secrets-key \
  --cert=cert.pem \
  --key=privatekey.pem \
  -n sealed-secrets
```

---

#### Scenario 2: Complete Cluster Loss
```bash
# 1. Provision new infrastructure
cd terraform
terraform apply

# 2. Install Kubernetes
# (manual process or automation script)

# 3. Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 4. Restore Sealed Secrets key
kubectl create secret tls sealed-secrets-key ...

# 5. Bootstrap ArgoCD application
kubectl apply -f bootstrap/bootstrap-app.yaml

# 6. ArgoCD syncs all applications
# (automatic)

# 7. Verify
kubectl get pods --all-namespaces
```

**Recovery Time Objective (RTO)**: 4-6 hours  
**Recovery Point Objective (RPO)**: < 1 hour (Git commits)

---

## 📁 Directory Structure

```
zero-trust-devsecops/
├── .github/workflows/          # CI/CD pipelines
│   ├── app-cicd.yml
│   ├── secret-rotation.yml
│   ├── security-scan.yml
│   ├── terraform.yml
│   └── pr-validation.yml
│
├── apps/                       # Helm charts for applications
│   └── freshbonds/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── ingress.yaml
│           └── sealed-secret.yaml
│
├── bootstrap/                  # ArgoCD bootstrap
│   └── bootstrap-app.yaml
│
├── clusters/test-cluster/      # GitOps manifests
│   ├── 00-namespaces/
│   ├── 01-projects/
│   ├── 05-infrastructure/
│   ├── 10-apps/
│   └── 15-ingress/
│
├── docs/                       # Documentation
│   ├── workflows/              # GitHub Actions workflows
│   ├── architecture/           # System architecture
│   ├── security/               # Security documentation
│   ├── monitoring/             # Monitoring setup
│   └── deployment/             # Deployment guides
│
├── policies/                   # Security policies
│   ├── kyverno/
│   └── opa/
│
├── scripts/                    # Automation scripts
│   ├── build-and-push.sh
│   ├── setup-pipeline.sh
│   └── backup-sealed-secrets-keys.sh
│
├── src/                        # Application source code
│   ├── frontend/
│   ├── api-gateway/
│   ├── user-service/
│   └── product-service/
│
└── terraform/                  # Infrastructure as Code
    ├── instances.tf
    ├── vcn.tf
    ├── security_list.tf
    └── ...
```

---

## 🎯 Key Design Decisions

### 1. ARM64 Architecture
**Decision**: Use Ampere Altra ARM64 instances  
**Rationale**: 
- Cost-effective (OCI free tier)
- Energy efficient
- Growing ecosystem support
**Trade-off**: Requires multi-arch Docker builds

### 2. Private Subnet for Workers
**Decision**: Workers in private subnet, NAT via control plane  
**Rationale**:
- Reduced attack surface
- Lower cost (no public IPs)
**Trade-off**: Control plane is single point of failure for NAT

### 3. MongoDB Atlas (Cloud)
**Decision**: External managed database  
**Rationale**:
- Managed backups & HA
- Reduced operational burden
- Geographic distribution
**Trade-off**: Egress costs, internet dependency

### 4. ArgoCD GitOps
**Decision**: Pull-based deployment vs push-based  
**Rationale**:
- Git as single source of truth
- Declarative desired state
- Automatic drift correction
**Trade-off**: Learning curve, sync latency

### 5. Sealed Secrets
**Decision**: Controller-based encryption vs external KMS  
**Rationale**:
- Native Kubernetes integration
- No external dependencies
- GitOps-friendly
**Trade-off**: Key management responsibility

---

## 📚 Related Documentation

- [Infrastructure Guide](../docs/DEVELOPMENT-GUIDE.md)
- [Security Tools](./SECURITY-OVERVIEW.md)
- [GitOps Workflows](../workflows/README.md)
- [Monitoring Setup](../monitoring/MONITORING-GUIDE.md)
- [Runbooks](../deployment/RUNBOOKS.md)

---

**Last Updated**: March 2026  
**Architecture Version**: 2.0  
**Review Schedule**: Quarterly

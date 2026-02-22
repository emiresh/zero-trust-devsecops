# 🏗️ FreshBonds - Complete Project Architecture & Flow

**Last Updated:** February 2026  
**Project:** Zero-Trust DevSecOps Microservices Platform

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Microservices Components](#microservices-components)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Kubernetes & ArgoCD Flow](#kubernetes--argocd-flow)
6. [Security & Monitoring](#security--monitoring)
7. [Complete Deployment Flow](#complete-deployment-flow)
8. [Directory Structure](#directory-structure)

---

## 🎯 Project Overview

**FreshBonds** is a production-ready microservices application implementing **Zero-Trust DevSecOps** principles with:

- 🏢 **4 Microservices**: Frontend, API Gateway, User Service, Product Service
- 🔐 **Security-First**: Trivy scanning, OPA/Kyverno policies, Falco runtime security
- 🚀 **GitOps**: ArgoCD with automated syncing
- 📦 **Multi-Architecture**: AMD64 + ARM64 Docker images
- 🔄 **Automated CI/CD**: Smart change detection, security scanning, automated deployments
- 🔒 **Secret Management**: Sealed Secrets with automated rotation
- 📊 **Full Observability**: Prometheus, Grafana, Falco, PagerDuty

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTERNET / USERS                                │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    NGINX INGRESS CONTROLLER                             │
│                  (TLS Termination via Let's Encrypt)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                ↓                                   ↓
┌───────────────────────────┐         ┌────────────────────────────┐
│      FRONTEND SERVICE      │         │    API GATEWAY SERVICE     │
│     (React + Vite)        │         │    (Express.js: 8080)      │
│   Nginx: Port 3000        │         │                            │
│   Multi-Arch: AMD64+ARM64 │         │  • Payment Integration     │
└───────────────────────────┘         │  • Request Routing         │
                                      │  • Rate Limiting           │
                                      └────────────────────────────┘
                                                  │
                        ┌─────────────────────────┼─────────────────────────┐
                        ↓                         ↓                         ↓
            ┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
            │   USER SERVICE      │   │  PRODUCT SERVICE    │   │ More Services... │
            │  (Express.js: 8082) │   │ (Express.js: 8081)  │   └──────────────────┘
            │                     │   │                     │
            │ • Authentication    │   │ • Product Catalog   │
            │ • User Management   │   │ • Inventory         │
            │ • JWT Validation    │   │ • Search            │
            └─────────────────────┘   └─────────────────────┘
                        │                         │
                        └────────────┬────────────┘
                                     ↓
                        ┌────────────────────────┐
                        │   MONGODB ATLAS        │
                        │  (Cloud Database)      │
                        │                        │
                        │ • Users Collection     │
                        │ • Products Collection  │
                        └────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER (3 Nodes)                         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │  Node 1      │  │  Node 2      │  │  Node 3      │                │
│  │  (ARM64)     │  │  (ARM64)     │  │  (ARM64)     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
│  Infrastructure:                                                        │
│  • ArgoCD (GitOps)         • Sealed Secrets (Encryption)              │
│  • Falco (Runtime Security) • Prometheus (Metrics)                    │
│  • Grafana (Dashboards)    • Cert-Manager (TLS)                       │
│  • PagerDuty (Alerting)    • Kyverno (Policy Enforcement)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, Tailwind CSS | User interface |
| **API Gateway** | Node.js 18, Express | Request routing, payment integration |
| **Services** | Node.js 18, Express, Mongoose 8.x | Business logic |
| **Database** | MongoDB Atlas | Data persistence |
| **Container** | Docker (multi-stage builds) | Application packaging |
| **Orchestration** | Kubernetes 1.28.15 (3-node) | Container orchestration |
| **GitOps** | ArgoCD | Continuous deployment |
| **Security** | Trivy, Falco, OPA, Kyverno | Vulnerability scanning, runtime security |
| **Ingress** | Nginx + cert-manager | Load balancing, TLS |
| **Monitoring** | Prometheus, Grafana | Metrics and dashboards |
| **Alerting** | PagerDuty | Incident management |

---

## 🔧 Microservices Components

### 1. Frontend Service

**Location:** `src/frontend/`  
**Port:** 3000  
**Tech:** React + Vite + Nginx  
**Architecture:** Multi-arch (AMD64 + ARM64)

**Key Features:**
- React 18 with Vite for fast builds
- Tailwind CSS for styling
- Nginx for production serving
- Build-time environment variable injection (`VITE_API_URL`)
- Static file serving with caching

**Build Command:**
```bash
docker build --build-arg VITE_API_URL=/api -t emiresh/freshbonds-frontend:v1.0.X ./src/frontend
```

**Dockerfile Strategy:**
- Stage 1: Node.js build (npm install + vite build)
- Stage 2: Nginx production serve
- Non-root user (nginx:1000)
- Read-only root filesystem

---

### 2. API Gateway Service

**Location:** `src/api-gateway/`  
**Port:** 8080  
**Tech:** Express.js + Axios

**Key Features:**
- Central entry point for all client requests
- Routes requests to User Service (8082) and Product Service (8081)
- Payment gateway integration (IPG)
- CORS handling
- Request/response logging
- Health check endpoints (`/health/live`, `/health/ready`)

**Environment Variables:**
```bash
USER_SERVICE_URL=http://user-service:8082
PRODUCT_SERVICE_URL=http://product-service:8081
IPG_APP_NAME=<payment_gateway_app>
IPG_APP_ID=<id>
IPG_APP_TOKEN=<token>
IPG_HASH_SALT=<salt>
IPG_CALLBACK_URL=<callback>
```

**Endpoints:**
- `/api/users/*` → routes to User Service
- `/api/products/*` → routes to Product Service
- `/api/payment/*` → handles payment processing
- `/health/*` → health checks

---

### 3. User Service

**Location:** `src/user-service/`  
**Port:** 8082 (internal: 3001)  
**Tech:** Express.js + Mongoose + JWT

**Key Features:**
- User registration and authentication
- JWT token generation and validation
- Password hashing (bcrypt)
- MongoDB integration for user data
- Health check endpoints

**Environment Variables:**
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secret>
SERVICE_PORT=3001
```

**Database Collections:**
- `users`: User accounts with hashed passwords

---

### 4. Product Service

**Location:** `src/product-service/`  
**Port:** 8081 (internal: 3002)  
**Tech:** Express.js + Mongoose

**Key Features:**
- Product catalog management
- Product CRUD operations
- Inventory tracking
- Search and filtering
- Health check endpoints

**Environment Variables:**
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<secret>
SERVICE_PORT=3002
```

**Database Collections:**
- `products`: Product information, pricing, inventory

---

## 🔄 GitHub Actions Workflows

You have **3 main workflows** that automate different aspects of the DevSecOps pipeline:

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Schedule:** Triggered on code changes (not scheduled)

**Triggers:**
```yaml
on:
  push:
    branches: [main, develop, release/**]
    paths: ['src/**', 'apps/*/templates/**', 'Dockerfile', '.github/workflows/ci-cd.yml']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # Manual trigger
```

**Pipeline Stages:**

```
┌──────────────────────────────────────────────────────────────┐
│ STAGE 1: DETECT CHANGES (Change Detection)                  │
├──────────────────────────────────────────────────────────────┤
│ • Git diff analysis to find changed files                   │
│ • Identifies which services need rebuilding                 │
│ • Outputs: JSON array of services to build                  │
│                                                              │
│ Examples:                                                    │
│   - src/frontend/ changed → ["frontend"]                    │
│   - src/api-gateway/ + src/user-service/ → ["api-gateway", │
│     "user-service"]                                          │
│   - Dockerfile changed → rebuild ALL services               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STAGE 2: POLICY CHECKS (Security & Compliance)              │
├──────────────────────────────────────────────────────────────┤
│ 1. OPA Policy Validation (policies/opa/)                    │
│    • Business rules validation                              │
│    • Security policy enforcement                            │
│    • Uses Conftest for testing                              │
│                                                              │
│ 2. Kyverno Policy Validation (policies/kyverno/)            │
│    • Pod Security Standards (PSS)                           │
│    • Admission control simulation                           │
│    • Image signing/verification rules                       │
│                                                              │
│ 3. Checkov IaC Security Scanning                            │
│    • Kubernetes manifest security                           │
│    • Terraform configuration analysis                       │
│    • Dockerfile best practices                              │
│    • Generates SARIF reports                                │
│                                                              │
│ ⛔ BLOCKS deployment if critical issues found               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STAGE 3: BUILD & SCAN (Per Service - Matrix Strategy)       │
├──────────────────────────────────────────────────────────────┤
│ For each changed service:                                   │
│                                                              │
│ 1. Build Docker Image                                       │
│    • Frontend: Multi-arch (AMD64 + ARM64)                   │
│    • Backend: ARM64 only (cluster architecture)             │
│    • Frontend builds AMD64 first for scanning               │
│                                                              │
│ 2. Trivy Security Scan (Pre-Push)                           │
│    • Scans for OS vulnerabilities                           │
│    • Scans for library vulnerabilities                      │
│    • Severity levels: CRITICAL, HIGH, MEDIUM, LOW           │
│    • Generates SARIF and JSON reports                       │
│                                                              │
│ 3. Security Gate                                            │
│    ⛔ BLOCKS if CRITICAL vulnerabilities found              │
│    ⚠️  Allows HIGH vulnerabilities (with warning)           │
│                                                              │
│ 4. Push to Docker Hub                                       │
│    • Tagged: emiresh/freshbonds-{service}:v1.0.{run_number}│
│    • Latest: emiresh/freshbonds-{service}:latest           │
│    • Frontend: Push multi-arch manifest                     │
│    • Backend: Push ARM64 image                              │
│                                                              │
│ 5. Artifact Upload                                          │
│    • Trivy SARIF results (for GitHub Security tab)         │
│    • Trivy JSON results (for reporting)                     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STAGE 4: UPDATE MANIFESTS (GitOps)                          │
├──────────────────────────────────────────────────────────────┤
│ 1. Update Helm Values                                       │
│    • File: apps/freshbonds/values.yaml                      │
│    • Updates image tags: v1.0.{run_number}                  │
│    • Uses sed to replace existing tags                      │
│                                                              │
│ 2. Commit to Main Branch                                    │
│    • Message: "chore: update image tags to v1.0.X [skip ci]"│
│    • [skip ci] prevents infinite loop                       │
│    • Git push triggers ArgoCD sync                          │
│                                                              │
│ 3. ArgoCD Auto-Sync                                         │
│    • ArgoCD detects manifest change (within 3 minutes)      │
│    • Automatically syncs to Kubernetes cluster               │
│    • Rolls out new pods with updated images                 │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STAGE 5: NOTIFY (Reporting)                                 │
├──────────────────────────────────────────────────────────────┤
│ • Pipeline summary                                           │
│ • Stage results                                              │
│ • Success/failure status                                     │
└──────────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ **Smart Detection**: Only builds changed services
- 🔐 **Security Gates**: Blocks on critical vulnerabilities
- 🚀 **Multi-Arch**: AMD64 + ARM64 for frontend
- 📊 **Full Reporting**: SARIF uploads to GitHub Security
- 🔄 **Zero-Loop**: `[skip ci]` prevents infinite commits

**Typical Runtime:**
- Detect Changes: ~30 seconds
- Policy Checks: ~2-3 minutes
- Build & Scan (per service): ~5-8 minutes
- Update Manifests: ~30 seconds
- **Total: ~8-12 minutes** (for single service)

---

### 2. Security Scanning (`security-scan.yml`)

**Schedule:**
- **Daily:** Every day at 2:00 AM UTC (off-peak hours)
- **Weekly:** Every Monday at 3:00 AM UTC (comprehensive scan)

**Cron Schedules:**
```yaml
schedule:
  - cron: '0 2 * * *'      # Daily at 2 AM UTC
  - cron: '0 3 * * 1'      # Weekly on Monday at 3 AM UTC
```

**Also Triggers On:**
- Push to main (Dockerfile, package.json, terraform, policies changes)
- Pull requests to main
- Manual workflow dispatch

**Scan Types:**

```
┌──────────────────────────────────────────────────────────────┐
│ IMAGE SCANNING (Trivy)                                       │
├──────────────────────────────────────────────────────────────┤
│ For each service: [frontend, api-gateway, user-service,     │
│                    product-service]                          │
│                                                              │
│ 1. Pull latest image from Docker Hub                        │
│ 2. Run Trivy scan (OS + Library vulnerabilities)            │
│ 3. Analyze results:                                          │
│    • Count CRITICAL vulnerabilities                         │
│    • Count HIGH vulnerabilities                             │
│    • Count MEDIUM vulnerabilities                           │
│                                                              │
│ 4. Create GitHub Issue if CRITICAL or HIGH found            │
│    • Title: "🔐 Security Alert: Vulnerabilities in {service}"│
│    • Includes detailed vulnerability report                 │
│    • Auto-assigns to team                                   │
│                                                              │
│ 5. Upload results as artifacts (30-day retention)           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ POLICY SCANNING (Same as CI/CD)                             │
├──────────────────────────────────────────────────────────────┤
│ • OPA policy validation                                      │
│ • Kyverno policy validation                                  │
│ • Checkov IaC security scanning                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ DEPENDENCY SCANNING                                          │
├──────────────────────────────────────────────────────────────┤
│ • npm audit for Node.js dependencies                         │
│ • Checks package.json and package-lock.json                  │
│ • Reports outdated packages                                  │
│ • Identifies known CVEs                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE SCANNING                                      │
├──────────────────────────────────────────────────────────────┤
│ • Terraform configuration analysis                           │
│ • Kubernetes manifest security                               │
│ • Network policy validation                                  │
│ • RBAC configuration review                                  │
└──────────────────────────────────────────────────────────────┘
```

**Alert Thresholds:**
- 🔴 **CRITICAL**: Immediate GitHub issue creation
- 🟠 **HIGH**: GitHub issue creation
- 🟡 **MEDIUM**: Logged in report
- 🟢 **LOW**: Logged in report

**Reports Generated:**
- Trivy JSON reports (per service)
- SARIF files for GitHub Security tab
- Summary in GitHub Actions

**Use Cases:**
- Daily: Catch newly disclosed vulnerabilities
- Weekly: Comprehensive audit for compliance
- Manual: Pre-release security validation

---

### 3. Secret Rotation (`secret-rotation.yml`)

**Schedule:**
- **Production Secrets:** Every 14 days (1st and 15th of month) at 3:00 AM UTC
- **JWT Tokens:** Every Wednesday at 2:00 AM UTC

**Cron Schedules:**
```yaml
schedule:
  - cron: '0 3 1,15 * *'   # 1st and 15th at 3 AM UTC
  - cron: '0 2 * * 3'      # Every Wednesday at 2 AM UTC
```

**Manual Options:**
```yaml
workflow_dispatch:
  secret_type: [all, jwt, database, api-keys, tls-certs]
  force_rotation: true/false
  notification: true/false
```

**Rotation Process:**

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: PREPARATION                                          │
├──────────────────────────────────────────────────────────────┤
│ 1. Install kubeseal (for SealedSecrets)                     │
│ 2. Install kubectl                                           │
│ 3. Configure Kubernetes access (from GitHub Secrets)        │
│ 4. Fetch SealedSecrets public key                           │
│    • Try cluster first                                       │
│    • Fallback to GitHub Secret                              │
│    • Verify key validity with OpenSSL                       │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: ROTATE MONGODB PASSWORD                             │
├──────────────────────────────────────────────────────────────┤
│ 1. Generate new secure password                             │
│    • Uses: openssl rand -base64 32                          │
│    • 32 characters, alphanumeric                            │
│                                                              │
│ 2. Update MongoDB Atlas (via API)                           │
│    • API call to Atlas with new password                    │
│    • Updates user credentials                               │
│    • Verifies update success                                │
│                                                              │
│ 3. Create new MONGODB_URI                                   │
│    • Format: mongodb+srv://user:newpass@host/db             │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: ROTATE JWT SECRET                                   │
├──────────────────────────────────────────────────────────────┤
│ 1. Generate new JWT secret                                  │
│    • Uses: openssl rand -hex 64                             │
│    • 128 characters, hexadecimal                            │
│                                                              │
│ 2. Create Kubernetes secret (plain)                         │
│    • Name: freshbonds-secret                                │
│    • Namespace: dev                                          │
│    • Keys: MONGODB_URI, JWT_SECRET, IPG_*, etc.             │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: SEAL & COMMIT                                       │
├──────────────────────────────────────────────────────────────┤
│ 1. Seal the secret                                           │
│    • Uses kubeseal with cluster public key                  │
│    • Output: SealedSecret YAML                              │
│    • Encrypted, safe to commit to Git                       │
│                                                              │
│ 2. Update sealed secret file                                │
│    • Path: apps/freshbonds/templates/sealed-secret.yaml     │
│    • Replace with newly sealed version                      │
│                                                              │
│ 3. Commit and push                                           │
│    • Message: "chore: rotate secrets - {date} [skip ci]"    │
│    • Push to main branch                                    │
│    • Triggers ArgoCD sync                                   │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: RECORD & VERIFY                                     │
├──────────────────────────────────────────────────────────────┤
│ 1. Create rotation log                                      │
│    • File: docs/rotation-logs/rotation-history.md           │
│    • Records: date, secret type, status                     │
│                                                              │
│ 2. ArgoCD syncs new secret                                  │
│    • SealedSecret controller decrypts                        │
│    • Secret updated in Kubernetes                           │
│    • Pods restart automatically (rolling update)            │
│                                                              │
│ 3. Verify services are healthy                              │
│    • Check pod status                                       │
│    • Verify health endpoints                                │
│    • Monitor logs for errors                                │
└──────────────────────────────────────────────────────────────┘
```

**What Gets Rotated:**

1. **MongoDB Password**
   - Generated: Random 32-char base64
   - Updated: MongoDB Atlas user password
   - Frequency: Every 14 days

2. **JWT Secret**
   - Generated: Random 64-byte hex
   - Used for: Token signing/validation
   - Frequency: Weekly (Wednesdays)

3. **API Keys** (if applicable)
   - Payment gateway credentials
   - Third-party service tokens
   - Frequency: Manual or scheduled

**Security Features:**
- ✅ Zero downtime rotation (rolling update)
- ✅ Automatic rollback on failure
- ✅ Encrypted at rest (SealedSecrets)
- ✅ Audit trail (rotation logs)
- ✅ Verified before commit

**Typical Runtime:** ~2-3 minutes

---

## ☸️ Kubernetes & ArgoCD Flow

### ArgoCD Bootstrap Pattern

Your cluster uses the **App of Apps** pattern for GitOps:

```
┌────────────────────────────────────────────────────────────────┐
│ BOOTSTRAP APPLICATION (bootstrap/bootstrap-app.yaml)           │
├────────────────────────────────────────────────────────────────┤
│ apiVersion: argoproj.io/v1alpha1                               │
│ kind: Application                                              │
│ metadata:                                                      │
│   name: bootstrap                                              │
│   namespace: argocd                                            │
│ spec:                                                          │
│   source:                                                      │
│     repoURL: github.com/emiresh/zero-trust-devsecops           │
│     path: clusters/test-cluster                                │
│     targetRevision: main                                       │
│   syncPolicy:                                                  │
│     automated:                                                 │
│       prune: true          # Delete removed resources          │
│       selfHeal: true       # Auto-fix drift                    │
│   destination:                                                 │
│     server: https://kubernetes.default.svc                     │
└────────────────────────────────────────────────────────────────┘
                              ↓
                  Monitors all files in clusters/test-cluster/
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ clusters/test-cluster/                                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ├── 00-namespaces/                                             │
│ │   ├── dev.yaml            → Creates dev namespace           │
│ │   └── monitoring.yaml     → Creates monitoring namespace    │
│                                                                │
│ ├── 01-projects/                                               │
│ │   └── dev-project.yaml    → ArgoCD Project (RBAC)           │
│                                                                │
│ ├── 05-infrastructure/                                         │
│ │   ├── freshbonds-app.yaml        → FreshBonds application   │
│ │   ├── falco-app.yaml             → Security monitoring      │
│ │   ├── prometheus-app.yaml        → Metrics collection       │
│ │   ├── grafana-app.yaml           → Dashboards               │
│ │   └── sealed-secrets-app.yaml    → Secret encryption        │
│                                                                │
│ ├── 10-apps/                                                   │
│ │   └── (App definitions)                                     │
│                                                                │
│ └── 15-ingress/                                                │
│     └── ingress-nginx-app.yaml    → Ingress controller        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              ↓
              Each YAML file is an ArgoCD Application
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ EXAMPLE: FreshBonds Application                               │
├────────────────────────────────────────────────────────────────┤
│ apiVersion: argoproj.io/v1alpha1                               │
│ kind: Application                                              │
│ metadata:                                                      │
│   name: freshbonds                                             │
│ spec:                                                          │
│   source:                                                      │
│     repoURL: github.com/emiresh/zero-trust-devsecops           │
│     path: apps/freshbonds        # Helm chart location        │
│     helm:                                                      │
│       valueFiles:                                              │
│         - values.yaml            # Image tags updated by CI/CD │
│   syncPolicy:                                                  │
│     automated:                                                 │
│       prune: true                                              │
│       selfHeal: true                                           │
│   destination:                                                 │
│     server: https://kubernetes.default.svc                     │
│     namespace: dev                                             │
└────────────────────────────────────────────────────────────────┘
```

### Deployment Flow Diagram

```
DEVELOPER                     GITHUB                    ARGOCD                  KUBERNETES
   │                            │                          │                         │
   │ 1. Push code to            │                          │                         │
   │    src/frontend/           │                          │                         │
   ├────────────────────────────>                          │                         │
   │                            │                          │                         │
   │                       2. GitHub Actions               │                         │
   │                          CI/CD Pipeline               │                         │
   │                          (builds, tests,              │                         │
   │                           scans, pushes)              │                         │
   │                            │                          │                         │
   │                       3. Update Helm                  │                         │
   │                          values.yaml                  │                         │
   │                          with new tag                 │                         │
   │                            │                          │                         │
   │                       4. Commit to main               │                         │
   │                          [skip ci]                    │                         │
   │                            │                          │                         │
   │                            │  5. Git commit detected  │                         │
   │                            │  (within 3 minutes)      │                         │
   │                            ├─────────────────────────>│                         │
   │                            │                          │                         │
   │                            │                     6. ArgoCD syncs                │
   │                            │                        (compares Git vs            │
   │                            │                         Cluster state)             │
   │                            │                          │                         │
   │                            │                     7. Apply changes               │
   │                            │                        to cluster                  │
   │                            │                          ├────────────────────────>│
   │                            │                          │                         │
   │                            │                          │                    8. Rolling Update
   │                            │                          │                       • New pods created
   │                            │                          │                       • Old pods terminated
   │                            │                          │                       • Health checks pass
   │                            │                          │                       • Traffic shifted
   │                            │                          │                         │
   │                            │                     9. Sync complete               │
   │                            │                        Status: Healthy             │
   │                            │                          │                         │
   │ 10. Verify deployment      │                          │                         │
   │     kubectl get pods -n dev│                          │                         │
   ├────────────────────────────┴──────────────────────────┴─────────────────────────>
```

### ArgoCD Sync Modes

Your configuration uses **Automated Sync** with:

- **prune: true** - Automatically delete resources that are removed from Git
- **selfHeal: true** - Automatically fix manual changes (revert to Git state)
- **syncPolicy.retry** - Retry failed syncs with exponential backoff

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
    allowEmpty: false
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

**Sync Behavior:**
- **Auto-sync interval:** 3 minutes (ArgoCD default)
- **On failure:** Retry up to 5 times with exponential backoff
- **Manual drift:** Reverted automatically within 3 minutes
- **Webhook:** Can be configured for instant sync (optional)

---

## 🔐 Security & Monitoring

### Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: BUILD-TIME SECURITY                                   │
├─────────────────────────────────────────────────────────────────┤
│ • Trivy vulnerability scanning (blocks CRITICAL)                │
│ • Multi-stage Dockerfile (minimal attack surface)               │
│ • Non-root containers (UID 1000)                                │
│ • Read-only root filesystem                                     │
│ • Dropped capabilities (ALL)                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: ADMISSION CONTROL                                      │
├─────────────────────────────────────────────────────────────────┤
│ • OPA Policies (business rules)                                 │
│ • Kyverno Policies (Pod Security Standards)                     │
│ • Image verification (signature validation)                     │
│ • Resource limits enforcement                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: RUNTIME SECURITY                                       │
├─────────────────────────────────────────────────────────────────┤
│ • Falco: Detects anomalous behavior                             │
│   - Unexpected file access                                      │
│   - Suspicious network connections                              │
│   - Privilege escalation attempts                               │
│   - Shell spawned in container                                  │
│                                                                 │
│ • Network Policies: Restricts pod-to-pod communication         │
│ • RBAC: Least-privilege access control                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: SECRET MANAGEMENT                                      │
├─────────────────────────────────────────────────────────────────┤
│ • Sealed Secrets: Encryption at rest                            │
│ • Automated rotation (14 days / weekly)                         │
│ • MongoDB Atlas: Encrypted connections                          │
│ • TLS everywhere (cert-manager + Let's Encrypt)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: MONITORING & ALERTING                                  │
├─────────────────────────────────────────────────────────────────┤
│ • Prometheus: Metrics collection                                │
│ • Grafana: Dashboards and visualization                         │
│ • Falco: Security event exports to Prometheus                   │
│ • PagerDuty: Critical alert routing                             │
│ • AlertManager: Alert aggregation and routing                   │
└─────────────────────────────────────────────────────────────────┘
```

### Monitoring Stack

**Prometheus Exporters:**
- Node Exporter (system metrics)
- Falco Exporter (security events)
- Kube State Metrics (Kubernetes objects)
- Application metrics (custom)

**Grafana Dashboards:**
- Application health
- Security events (Falco)
- Login attempts
- Resource usage
- Network traffic

**PagerDuty Integration:**
- Critical Falco alerts (privilege escalation, etc.)
- Application down alerts
- Disk/memory exhaustion
- Certificate expiration warnings

---

## 🚀 Complete Deployment Flow

### End-to-End Flow (From Code to Production)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DEVELOPER COMMITS CODE                                       │
└─────────────────────────────────────────────────────────────────┘
$ git add src/frontend/src/App.jsx
$ git commit -m "feat: add new feature"
$ git push origin main
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GITHUB ACTIONS TRIGGERED                                     │
└─────────────────────────────────────────────────────────────────┘
• Workflow: ci-cd.yml
• Job: detect-changes → identifies "frontend" changed
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. POLICY CHECKS (Security Gate)                                │
└─────────────────────────────────────────────────────────────────┘
• OPA validation: ✅ PASSED (28 checks)
• Kyverno validation: ✅ PASSED (32 checks)
• Checkov IaC scan: ✅ PASSED (266 checks)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. BUILD DOCKER IMAGE                                           │
└─────────────────────────────────────────────────────────────────┘
• Platform: AMD64 (for scanning)
• Tag: emiresh/freshbonds-frontend:v1.0.75
• Build time: ~4 minutes
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. TRIVY SECURITY SCAN                                          │
└─────────────────────────────────────────────────────────────────┘
• Scanning for vulnerabilities...
• Results:
  - Critical: 0 ✅
  - High: 2 ⚠️ (allowed)
  - Medium: 8
  - Total: 10
• Status: ✅ PASSED (no blocking issues)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. BUILD MULTI-ARCH & PUSH                                      │
└─────────────────────────────────────────────────────────────────┘
• Building for: linux/amd64, linux/arm64
• Pushing to: docker.io/emiresh/freshbonds-frontend:v1.0.75
• Also tagged: latest
• Push time: ~2 minutes
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. UPDATE HELM VALUES                                           │
└─────────────────────────────────────────────────────────────────┘
• File: apps/freshbonds/values.yaml
• Change:
  - tag: v1.0.74
  + tag: v1.0.75
• Commit: "chore: update image tags to v1.0.75 [skip ci]"
• Push to main
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. ARGOCD DETECTS CHANGE                                        │
└─────────────────────────────────────────────────────────────────┘
• Sync interval: 3 minutes
• Git SHA detected: abc123def
• Comparing: Git (v1.0.75) vs Cluster (v1.0.74)
• Status: OutOfSync
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. ARGOCD SYNCS TO CLUSTER                                      │
└─────────────────────────────────────────────────────────────────┘
• Rendering Helm chart...
• Applying Deployment update...
• Strategy: RollingUpdate
  - maxUnavailable: 0
  - maxSurge: 1
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. KUBERNETES ROLLING UPDATE                                   │
└─────────────────────────────────────────────────────────────────┘
• New pod created: frontend-7d8f9-xyz
• Image pulled: emiresh/freshbonds-frontend:v1.0.75
• Container started
• Readiness probe: /health/ready → ✅ Healthy
• Traffic shifted to new pod
• Old pod terminated: frontend-6c7e8-abc
• Status: ✅ Deployment successful
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. VERIFICATION                                                │
└─────────────────────────────────────────────────────────────────┘
$ kubectl get pods -n dev
NAME                        READY   STATUS    RESTARTS   AGE
frontend-7d8f9-xyz          1/1     Running   0          2m
frontend-7d8f9-qwe          1/1     Running   0          1m

$ kubectl describe deployment frontend -n dev
Image: emiresh/freshbonds-frontend:v1.0.75

✅ DEPLOYMENT COMPLETE
Total time: ~12-15 minutes
```

### Zero-Downtime Deployment

**Rolling Update Strategy:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0   # Always keep at least N pods running
    maxSurge: 1         # Create 1 extra pod during update
```

**Process:**
1. New pod starts (total: N+1 pods)
2. Health checks pass
3. Service routes traffic to new pod
4. Old pod terminated (total: back to N pods)
5. Repeat until all pods updated

**Rollback (if needed):**
```bash
# Automatic rollback on failed health checks
# Manual rollback:
kubectl rollout undo deployment/frontend -n dev
```

---

## 📁 Directory Structure

```
zero-trust-devsecops/
│
├── .github/workflows/              # GitHub Actions
│   ├── ci-cd.yml                  # Main CI/CD pipeline
│   ├── security-scan.yml          # Scheduled security scanning
│   └── secret-rotation.yml        # Automated secret rotation
│
├── apps/                           # Helm Charts (ArgoCD sources)
│   └── freshbonds/
│       ├── Chart.yaml             # Helm chart metadata
│       ├── values.yaml            # Image tags (updated by CI/CD)
│       └── templates/
│           ├── deployment.yaml    # Pod definitions
│           ├── service.yaml       # Service definitions
│           ├── ingress.yaml       # Ingress routes
│           └── sealed-secret.yaml # Encrypted secrets
│
├── bootstrap/                      # ArgoCD Bootstrap
│   └── bootstrap-app.yaml         # App of Apps pattern
│
├── clusters/                       # Kubernetes Manifests (by cluster)
│   └── test-cluster/
│       ├── 00-namespaces/         # Namespace definitions
│       │   ├── dev.yaml
│       │   └── monitoring.yaml
│       ├── 01-projects/           # ArgoCD Projects
│       │   └── dev-project.yaml
│       ├── 05-infrastructure/     # Infrastructure apps
│       │   ├── freshbonds-app.yaml         # Points to apps/freshbonds
│       │   ├── falco-app.yaml              # Security monitoring
│       │   ├── prometheus-app.yaml         # Metrics
│       │   ├── grafana-app.yaml            # Dashboards
│       │   └── sealed-secrets-app.yaml     # Secret encryption
│       ├── 10-apps/               # Application definitions
│       └── 15-ingress/            # Ingress controller
│           └── ingress-nginx-app.yaml
│
├── docs/                           # Documentation
│   ├── CICD-PIPELINE.md           # CI/CD details
│   ├── FALCO-COMPLETE-GUIDE.md    # Falco setup
│   ├── CLUSTER-SECURITY-GUIDE.md  # Security configuration
│   ├── GRAFANA-APPLICATION-ALERTS.md
│   ├── PAGERDUTY-INTEGRATION.md
│   └── rotation-logs/
│       └── rotation-history.md    # Secret rotation audit trail
│
├── Future/                         # Future enhancements
│   ├── 02-rbac/                   # RBAC policies
│   ├── 03-resource-management/    # ResourceQuotas
│   └── 06-network-policies/       # NetworkPolicies
│
├── policies/                       # Policy as Code
│   ├── kyverno/                   # Kyverno policies (admission control)
│   │   ├── pod-security.yaml     # Pod Security Standards
│   │   └── image-verification.yaml
│   └── opa/                       # Open Policy Agent
│       ├── security.rego         # Security rules
│       └── network.rego          # Network policies
│
├── scripts/                        # Automation scripts
│   ├── build-and-push.sh         # Build all services
│   ├── build-and-push-frontend.sh# Build frontend only
│   ├── setup-pipeline.sh         # Initialize pipeline
│   ├── backup-sealed-secrets-keys.sh
│   ├── restore-sealed-secrets-keys.sh
│   ├── setup-pagerduty.sh
│   └── init-db.js                # MongoDB initialization
│
├── src/                            # Application Source Code
│   ├── frontend/                  # React + Vite
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── src/
│   │       └── App.jsx
│   │
│   ├── api-gateway/               # Express.js Gateway
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── server.js
│   │
│   ├── user-service/              # User Management
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── server.js
│   │   ├── models/
│   │   └── middleware/
│   │
│   └── product-service/           # Product Catalog
│       ├── Dockerfile
│       ├── package.json
│       ├── server.js
│       ├── models/
│       └── middleware/
│
├── terraform/                      # Infrastructure as Code (OCI)
│   ├── main.tf                    # Main Terraform config
│   ├── variables.tf               # Input variables
│   ├── outputs.tf                 # Output values
│   ├── provider.tf                # OCI provider config
│   ├── versions.tf                # Terraform version constraints
│   └── cloud-init.yaml            # VM initialization script
│
├── docker-compose.yml              # Local development (Docker Compose)
├── README.md                       # Main README
├── PROJECT-ARCHITECTURE.md         # This file
└── sealed-secrets-keys-backup.b64 # SealedSecrets key backup
```

---

## 🎓 Quick Reference Commands

### Docker Commands
```bash
# Build all services
./scripts/build-and-push.sh v1.2.1

# Build individual service
docker build -t emiresh/freshbonds-frontend:v1.2.1 \
  --build-arg VITE_API_URL=/api \
  ./src/frontend

# Push to Docker Hub
docker push emiresh/freshbonds-frontend:v1.2.1
```

### Kubernetes Commands
```bash
# Check deployment status
kubectl get pods -n dev
kubectl get deployments -n dev
kubectl get services -n dev

# Check logs
kubectl logs -n dev -l app=frontend --tail=50
kubectl logs -n dev -f deployment/apigateway

# Describe resources
kubectl describe pod -n dev <pod-name>
kubectl describe deployment -n dev frontend

# Port forwarding (for debugging)
kubectl port-forward -n dev svc/frontend-service 3000:80
```

### ArgoCD Commands
```bash
# List applications
kubectl get applications -n argocd

# Check sync status
argocd app get freshbonds

# Manual sync
argocd app sync freshbonds

# Rollback
kubectl rollout undo deployment/frontend -n dev

# Watch sync progress
argocd app wait freshbonds --sync
```

### GitHub Actions
```bash
# Manually trigger CI/CD
# Go to: GitHub > Actions > CI/CD Pipeline > Run workflow

# Manually trigger security scan
# Go to: GitHub > Actions > Security Scanning > Run workflow

# Manually trigger secret rotation
# Go to: GitHub > Actions > Automated Secret Rotation > Run workflow
```

### SealedSecrets
```bash
# Create secret (DON'T commit plain-secret.yaml!)
kubectl create secret generic freshbonds-secret \
  --from-literal=MONGODB_URI=mongodb+srv://... \
  --from-literal=JWT_SECRET=... \
  --dry-run=client -o yaml > plain-secret.yaml

# Seal the secret
kubeseal --controller-namespace sealed-secrets \
  --format yaml \
  < plain-secret.yaml \
  > apps/freshbonds/templates/sealed-secret.yaml

# Commit sealed secret
git add apps/freshbonds/templates/sealed-secret.yaml
git commit -m "chore: update sealed secret"
git push
```

---

## 🔄 Workflow Schedules Summary

| Workflow | Trigger | Schedule | Purpose |
|----------|---------|----------|---------|
| **CI/CD Pipeline** | Code push, PR | On-demand | Build, test, deploy services |
| **Security Scanning** | Scheduled, Manual | Daily 2 AM UTC<br>Weekly Mon 3 AM UTC | Vulnerability scanning |
| **Secret Rotation** | Scheduled, Manual | Every 14 days (1st, 15th)<br>Weekly Wed 2 AM UTC | Rotate secrets |

**Timezone:** All schedules are in **UTC**

---

## 📞 Support & Resources

- **Documentation:** `/docs` folder
- **CI/CD Details:** [docs/CICD-PIPELINE.md](docs/CICD-PIPELINE.md)
- **Security Guide:** [CLUSTER-SECURITY-GUIDE.md](CLUSTER-SECURITY-GUIDE.md)
- **Falco Setup:** [docs/FALCO-COMPLETE-GUIDE.md](docs/FALCO-COMPLETE-GUIDE.md)
- **Development Guide:** [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)

---

## ✅ Next Steps

After reviewing this document:

1. **Test CI/CD**: Make a small change to trigger the pipeline
2. **Verify ArgoCD**: Check that apps are syncing properly
3. **Review Alerts**: Configure PagerDuty integration
4. **Check Monitoring**: Access Grafana dashboards
5. **Audit Security**: Review Falco alerts and Trivy reports

**Questions?** Check the documentation in `/docs` or review workflow files in `.github/workflows/`

---

**Document Version:** 1.0  
**Last Review:** February 2026  
**Maintained By:** DevOps Team

# Application CI/CD Workflow

> **File**: `.github/workflows/app-cicd.yml`  
> **Purpose**: Secure build, scan, and deploy application microservices with zero-trust security  
> **Trigger**: Push to main/develop, manual dispatch

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Workflow Triggers](#workflow-triggers)
3. [Pipeline Stages](#pipeline-stages)
4. [Security Features](#security-features)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Application CI/CD workflow implements a **Zero-Trust DevSecOps** approach with left-shift security, ensuring vulnerabilities are caught before deployment.

### Key Features

- ✅ **Smart Change Detection** - Only builds changed microservices
- 🔒 **Left-Shift Security** - Policy validation before build  
- 🛡️ **Zero-Trust Scanning** - Blocks critical vulnerabilities
- 📦 **Multi-Architecture** - Supports AMD64 + ARM64
- 📋 **SBOM Generation** - Software Bill of Materials for compliance
- 🔄 **GitOps Deploy** - Automated Helm values update
- 🚨 **Security Artifacts** - SARIF reports for GitHub Security tab

### Microservices

| Service | Port | Platform | Description |
|---------|------|----------|-------------|
| **frontend** | 3000 | AMD64, ARM64 | React + Vite UI |
| **api-gateway** | 8080 | ARM64 | Express.js API gateway |
| **user-service** | 8082 | ARM64 | User authentication & management |
| **product-service** | 8081 | ARM64 | Product catalog & inventory |

---

## 🚀 Workflow Triggers

### Automatic Triggers

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'           # Source code changes
      - 'apps/*/templates/**'  # Kubernetes manifests
      - 'Dockerfile'       # Docker build files
      - '.github/workflows/app-cicd.yml'  # Workflow changes
    tags:
      - 'v*.*.*'          # Version tags
```

### Manual Trigger

```bash
# Via GitHub UI
Actions → App CI/CD → Run workflow

# With options
- skip_tests: false  # Emergency deployment only
```

---

## 📊 Pipeline Stages

### Stage 1: Detect Changes 🔍

**Purpose**: Identify which microservices changed to optimize build time

**How it works**:
1. Compare current commit with previous commit
2. Scan for changes in `src/*/` directories
3. Generate JSON matrix for parallel builds
4. Rebuild all if Dockerfile or workflow changed

**Outputs**:
```json
{
  "services": ["frontend", "product-service"],
  "has_changes": true
}
```

**Example**:
```bash
# If you changed src/frontend/src/App.jsx
✅ Detected: frontend
🎯 Services to build: frontend
```

---

### Stage 2: Policy Checks 🔐

**Purpose**: Validate Kubernetes manifests against security policies (Left-Shift Security)

**Tools Used**:
- **OPA (Open Policy Agent)** - Custom policy validation
- **Kyverno** - Kubernetes admission control policies
- **Checkov** - Infrastructure as Code security scanning

**What it validates**:
```
✓ Resource limits & requests defined
✓ Security contexts configured
✓ No privileged containers
✓ No root users
✓ Readiness/liveness probes present
✓ Image pull policies correct
✓ Default namespace not used
```

**Example Output**:
```
📦 Testing: freshbonds
🛡️ Validating Kubernetes manifests with Kyverno policies...
✅ All policies passed
```

**Failure Conditions**:
- Policy violations found → Pipeline BLOCKED
- Manifest validation errors → Build ABORTED

---

### Stage 3: Build & Scan 🏗️

**Purpose**: Build Docker images, generate SBOM, and perform security scans

#### 3.1 Image Build

**Strategy**:
- **Frontend**: Multi-arch (AMD64 + ARM64) using buildx
- **Backend**: ARM64 only (for Oracle Cloud ARM instances)
- **Optimization**: Load locally first for scanning, push after validation

```bash
# Frontend build (multi-arch)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=/api \
  -t emiresh/freshbonds-frontend:v1.0.123 \
  ./src/frontend

# Backend build (ARM64)
docker buildx build \
  --platform linux/arm64 \
  -t emiresh/freshbonds-user-service:v1.0.123 \
  ./src/user-service
```

#### 3.2 SBOM Generation

**Purpose**: Create Software Bill of Materials for compliance and vulnerability tracking

**Tool**: Syft (Anchore)

**Output Formats**:
- `sbom-{service}-spdx.json` - SPDX format
- `sbom-{service}-cyclonedx.json` - CycloneDX format

```bash
# Generate SBOM
syft emiresh/freshbonds-frontend:v1.0.123 -o spdx-json
syft emiresh/freshbonds-frontend:v1.0.123 -o cyclonedx-json
```

#### 3.3 Security Scanning (Zero-Trust)

**Tool**: Trivy (Aqua Security)

**Scan Types**:
1. **Vulnerability Scan** - CVEs in OS packages & dependencies
2. **Secret Scan** - Detect exposed credentials/tokens
3. **Configuration Scan** - Docker misconfigurations

**Severity Levels**:
```
🔴 CRITICAL - Blocks deployment (exit 1)
🟠 HIGH     - Reported but allowed
🟡 MEDIUM   - Informational
🟢 LOW      - Informational
```

**Example Report**:
```
┌────────────────────────────────────────┐
│ Trivy Security Scan: frontend          │
├────────────┬──────────┬────────────────┤
│ 🚨 Critical│ ⚠️ High  │ 📊 Total       │
├────────────┼──────────┼────────────────┤
│ 0          │ 2        │ 2              │
└────────────┴──────────┴────────────────┘

✅ Security scan passed - Zero-Trust validation successful
```

**Failure Behavior**:
```bash
if [[ $CRITICAL -gt 0 ]]; then
  echo "❌ BLOCKED: Critical vulnerabilities found!"
  exit 1  # Prevents image push & deployment
fi
```

#### 3.4 Artifacts Generated

**Security Artifacts** (90-day retention):
- `trivy-results.sarif` - GitHub Security tab integration
- `trivy-results.json` - Detailed vulnerability data
- `sbom-{service}-spdx.json` - Software Bill of Materials
- `sbom-{service}-cyclonedx.json` - Alternative SBOM format

---

### Stage 4: Push Images 🚀

**Purpose**: Push validated images to Docker Hub

**Conditions**:
- Only on `main` branch push
- Only after successful security scans
- Zero critical vulnerabilities

**Tagging Strategy**:
```bash
# Semantic versioning
TAG="v1.0.${GITHUB_RUN_NUMBER}"  # e.g., v1.0.123

# Images pushed:
emiresh/freshbonds-frontend:v1.0.123
emiresh/freshbonds-frontend:latest
emiresh/freshbonds-product-service:v1.0.123
emiresh/freshbonds-product-service:latest
# ... etc
```

**Multi-Arch Push**:
```bash
# Frontend: Push both AMD64 and ARM64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t emiresh/freshbonds-frontend:v1.0.123 \
  -t emiresh/freshbonds-frontend:latest \
  ./src/frontend
```

---

### Stage 5: Update Manifests (GitOps) 📝

**Purpose**: Update Helm values with new image tags for ArgoCD deployment

**Process**:
1. Update `apps/freshbonds/values.yaml` with new tags
2. Commit changes with `[skip ci]` to avoid loop
3. Push to main branch
4. ArgoCD auto-syncs within 3 minutes

**Example**:
```yaml
# Before
services:
  - name: frontend
    image:
      tag: v1.0.122

# After (automated)
services:
  - name: frontend
    image:
      tag: v1.0.123
```

**Commit Message**:
```
chore: update image tags to v1.0.123 [skip ci]
```

---

## 🛡️ Security Features

### 1. Left-Shift Security

**Definition**: Move security checks earlier in the development cycle

**Implementation**:
```
Policy Validation → BEFORE build
SBOM Generation   → DURING build
Vulnerability Scan → BEFORE push
Secret Scanning   → BEFORE push
```

**Benefits**:
- ✅ Catch issues before deployment
- ✅ Reduce remediation costs
- ✅ Faster feedback to developers

### 2. Zero-Trust Validation

**Principle**: Never trust, always verify

**Rules**:
- ❌ **BLOCK** on critical vulnerabilities
- ⚠️  **WARN** on high vulnerabilities
- ℹ️  **INFO** on medium/low vulnerabilities
- 🔒 **NO EXCEPTIONS** - Critical = No deployment

### 3. Security Artifacts

**SARIF Integration**:
```yaml
# Uploaded to GitHub Security tab
trivy-results.sarif
```

**Retention**:
- Security artifacts: 90 days
- SBOM files: 90 days (compliance)

---

## ⚙️ Configuration

### Required GitHub Secrets

```bash
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password-or-token
```

### Environment Variables

```yaml
env:
  DOCKER_REGISTRY: docker.io
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  IMAGE_PREFIX: ${{ secrets.DOCKER_USERNAME }}
```

### Permissions

```yaml
permissions:
  contents: write          # For GitOps commits
  security-events: write   # For SARIF upload
  packages: read          # For Docker registry
  pull-requests: write    # For PR comments
```

---

## 📖 Usage

### Deploying a Service

1. **Make changes** to service code in `src/{service}/`
2. **Commit and push** to `main` or `develop`
3. **Watch pipeline** in GitHub Actions tab
4. **Monitor ArgoCD** for automatic sync

### Emergency Deployment

```bash
# Skip tests (use with caution!)
Actions → App CI/CD → Run workflow
Options:
  - skip_tests: true
```

### Viewing Security Results

**GitHub Security Tab**:
```
Security → Code scanning alerts → Trivy
```

**Artifacts**:
```
Actions → Workflow Run → Artifacts →
  security-artifacts-frontend
```

---

## 🔧 Troubleshooting

### Issue: Pipeline fails on policy checks

**Symptoms**:
```
❌ Policy Checks stage failed
OPA/Kyverno validation errors
```

**Solution**:
1. Review policy violations in workflow logs
2. Fix Kubernetes manifests in `apps/*/templates/`
3. Common fixes:
   - Add resource limits/requests
   - Configure security context
   - Add probes (liveness/readiness)

### Issue: Trivy blocks deployment

**Symptoms**:
```
❌ BLOCKED: 2 critical vulnerabilities found!
```

**Solution**:
1. Review Trivy output in workflow logs
2. Options:
   - Update base image to patched version
   - Update vulnerable dependencies
   - If false positive, create suppression file (`.trivyignore`)

**Example `.trivyignore`**:
```
# False positive - fixed in next release
CVE-2024-12345
```

### Issue: Multi-arch build fails

**Symptoms**:
```
ERROR: failed to solve: failed to copy
```

**Solution**:
```bash
# Ensure QEMU is set up correctly
# Check buildx builder status
docker buildx ls

# Recreate builder if needed
docker buildx create --use --name multiarch
```

### Issue: GitOps update not syncing

**Symptoms**:
- Image tags updated in Git
- ArgoCD not deploying

**Solution**:
1. Check ArgoCD application status:
```bash
kubectl get application freshbonds-dev -n argocd
```

2. Manual sync:
```bash
kubectl patch application freshbonds-dev -n argocd \
  --type merge -p '{"spec":{}}'  # Trigger sync
```

3. Check ArgoCD logs:
```bash
kubectl logs -n argocd deployment/argocd-application-controller
```

---

## 📊 Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DETECT CHANGES                                           │
│    Scan git diff → Identify changed services                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. POLICY CHECKS (Left-Shift Security)                      │
│    OPA → Kyverno → Checkov                                  │
│    Validate K8s manifests BEFORE build                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼ (parallel matrix)
┌─────────────────────────────────────────────────────────────┐
│ 3. BUILD & SCAN (for each changed service)                  │
│    ┌──────────────────────────────────────────────────┐    │
│    │ Build ARM64 image (local load)                   │    │
│    │ Generate SBOM (Syft)                              │    │
│    │ Scan vulnerabilities (Trivy)                      │    │
│    │ Scan secrets (Trivy)                              │    │
│    ├──────────────────────────────────────────────────┤    │
│    │ Zero-Trust Check:                                 │    │
│    │   if CRITICAL > 0: BLOCK ❌                       │    │
│    │   else: PROCEED ✅                                │    │
│    └──────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PUSH IMAGES                                              │
│    docker push emiresh/freshbonds-{service}:v1.0.XXX        │
│    docker push emiresh/freshbonds-{service}:latest          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UPDATE MANIFESTS (GitOps)                                │
│    Update apps/freshbonds/values.yaml                       │
│    Git commit + push [skip ci]                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ ArgoCD Auto-Sync (within 3 minutes)                         │
│    Detects Git change → Syncs to cluster → Pods rollout     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Best Practices

### 1. Commit Messages

```bash
# Good
git commit -m "feat(frontend): add user profile page"
git commit -m "fix(api-gateway): rate limiting bug"
git commit -m "security(user-service): update dependencies"

# Avoid
git commit -m "update stuff"
git commit -m "wip"
```

### 2. Updating Dependencies

```bash
# Always test locally first
npm audit fix
npm test

# Check Trivy locally before pushing
docker build -t test:local .
trivy image --severity HIGH,CRITICAL test:local
```

### 3. Policy Compliance

```bash
# Validate manifests locally
helm template freshbonds ./apps/freshbonds > /tmp/test.yaml
kyverno apply policies/kyverno/*.yaml --resource /tmp/test.yaml
```

---

## 📚 Related Documentation

- [Secret Rotation Workflow](./SECRET-ROTATION-WORKFLOW.md)
- [Security Scanning Workflow](./SECURITY-SCAN-WORKFLOW.md)
- [Terraform Pipeline](./TERRAFORM-WORKFLOW.md)
- [Security Documentation](../security/SECURITY-OVERVIEW.md)
- [Architecture Guide](../architecture/SYSTEM-ARCHITECTURE.md)

---

**Last Updated**: March 2026  
**Maintainer**: DevSecOps Team

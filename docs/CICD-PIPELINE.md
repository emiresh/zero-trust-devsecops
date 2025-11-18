# CI/CD Pipeline Documentation
## Complete Guide to FreshBonds DevSecOps Pipeline

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Pipeline Workflows](#pipeline-workflows)
5. [Security Features](#security-features)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🎯 Overview

This repository implements a **production-grade DevSecOps pipeline** with:

✅ **Smart Build Detection** - Only builds changed services  
✅ **Security-First** - Trivy scanning, OPA/Kyverno policies  
✅ **GitOps Ready** - ArgoCD manifest updates  
✅ **Zero-Loop Commits** - `[skip ci]` prevents infinite loops  
✅ **Automated Secrets** - SealedSecrets with rotation  
✅ **Infrastructure as Code** - Terraform for OCI  
✅ **Comprehensive Monitoring** - Integrates with Falco/Prometheus/PagerDuty  

---

## 🏗️ Architecture

### Repository Structure

```
argo/
├── .github/workflows/          # GitHub Actions pipelines
│   ├── ci-cd.yml              # Main build/deploy pipeline
│   ├── security-scan.yml      # Scheduled security scanning
│   └── secret-rotation.yml    # Automated secret rotation
│
├── src/                        # Application source code
│   ├── frontend/              # React frontend
│   ├── api-gateway/           # Express.js gateway
│   ├── user-service/          # User management
│   └── product-service/       # Product management
│
├── apps/                       # Helm charts for ArgoCD
│   └── freshbonds/
│       ├── Chart.yaml
│       ├── values.yaml        # Image tags updated by pipeline
│       └── templates/
│
├── clusters/                   # Kubernetes manifests by cluster
│   └── test-cluster/
│       ├── 00-namespaces/
│       ├── 05-infrastructure/ # Falco, SealedSecrets, etc.
│       ├── 10-apps/
│       └── 15-ingress/
│
├── terraform/                  # Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── cloud-init.yaml
│
├── policies/                   # Security policies
│   ├── opa/                   # Open Policy Agent
│   └── kyverno/               # Kyverno admission policies
│
├── scripts/                    # Automation scripts
│   └── setup-pipeline.sh
│
├── secrets/                    # SealedSecrets (encrypted)
│   ├── freshbonds-secret.yaml
│   └── backups/
│
└── docs/                       # Documentation
    ├── CICD-PIPELINE.md       # This file
    ├── FALCO-COMPLETE-GUIDE.md
    └── CLUSTER-SECURITY-GUIDE.md
```

### Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer pushes code to src/frontend/                         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: DETECT CHANGES                                        │
│  • Git diff analysis                                            │
│  • Output: services=["frontend"]                                │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: POLICY CHECKS                                         │
│  • OPA Conftest: Validate K8s manifests                         │
│  • Kyverno: Test admission policies                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: BUILD & SCAN (frontend)                               │
│  • npm ci (install dependencies)                                │
│  • npm test (run tests)                                         │
│  • docker build                                                 │
│  • Trivy scan (CRITICAL/HIGH = fail)                            │
│  • docker push to Docker Hub                                    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 4: UPDATE MANIFESTS                                      │
│  • Update apps/freshbonds/values.yaml                           │
│  • Set frontend.image.tag = "abc123"                            │
│  • Commit with [skip ci]                                        │
│  • Push to main                                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 5: ARGOCD DEPLOYMENT (Automatic)                         │
│  • ArgoCD detects values.yaml change                            │
│  • Syncs new image to cluster                                   │
│  • Monitors deployment health                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 6: NOTIFY                                                │
│  • GitHub Actions summary                                       │
│  • PagerDuty alert (if failure)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

1. **GitHub Account** with repo access
2. **Docker Hub Account** (private registry)
3. **Kubernetes Cluster** (Oracle Cloud ARM)
4. **ArgoCD Installed** on cluster
5. **SealedSecrets Controller** installed

### Step 1: Clone Repository

```bash
git clone https://github.com/emiresh/argo.git
cd argo
```

### Step 2: Run Setup Script

```bash
chmod +x scripts/setup-pipeline.sh
./scripts/setup-pipeline.sh
```

This will prompt for:
- Docker Hub credentials
- MongoDB URI
- PagerDuty integration key (optional)
- OCI credentials (optional)

### Step 3: Commit and Push

```bash
git add .github/ policies/ terraform/ scripts/
git commit -m "feat: add CI/CD pipeline and security policies"
git push origin main
```

### Step 4: Verify Pipeline

Visit: `https://github.com/emiresh/argo/actions`

The pipeline should:
✅ Detect changed services  
✅ Run security scans  
✅ Build Docker images  
✅ Push to Docker Hub  
✅ Update manifests  

### Step 5: ArgoCD Sync

ArgoCD will automatically detect the manifest changes and deploy.

---

## 📦 Pipeline Workflows

### 1. Main CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main` branch
- Pull request to `main`
- Changes in: `src/**`, `apps/**/templates/**`, `.github/workflows/**`

**Stages:**

#### Stage 1: Detect Changes
```yaml
Detects which services changed:
- src/frontend/ → builds frontend
- src/api-gateway/ → builds api-gateway
- src/user-service/ → builds user-service
- src/product-service/ → builds product-service
- Infrastructure changes → builds ALL services
```

#### Stage 2: Policy Checks
```yaml
Validates:
- OPA policies (security rules)
- Kyverno policies (admission control)
Skips if no policy changes detected
```

#### Stage 3: Build & Scan (Matrix)
```yaml
For each detected service:
1. Install dependencies (npm ci)
2. Run tests (npm test)
3. Build Docker image
4. Trivy vulnerability scan
   - CRITICAL → ❌ FAIL
   - HIGH → ❌ FAIL
   - MEDIUM/LOW → ⚠️ WARN
5. Push to Docker Hub (if main branch)
```

#### Stage 4: Update Manifests
```yaml
For each built service:
1. Update apps/freshbonds/values.yaml
2. Set image tag to git SHA (short)
3. Commit with message: "chore: update image tags [skip ci]"
4. Push to main branch
```

**Why `[skip ci]`?**  
Prevents infinite loop: Commit → Pipeline → Commit → Pipeline...

#### Stage 5: Notify
```yaml
- Create GitHub Actions summary
- Send PagerDuty alert (if failure)
- Upload Trivy results as artifacts
```

**Example Run:**
```
Change: src/frontend/App.jsx modified
↓
Detect: services=["frontend"]
↓
Build: frontend → sha abc123
↓
Scan: 0 CRITICAL, 0 HIGH ✅
↓
Push: docker.io/youruser/frontend:abc123
↓
Update: apps/freshbonds/values.yaml
        frontend.image.tag = "abc123"
↓
ArgoCD: Syncs new image to cluster
```

---

### 2. Security Scan Pipeline (`security-scan.yml`)

**Triggers:**
- Schedule: Daily at 2 AM UTC
- Manual: workflow_dispatch

**Jobs:**

#### Image Scanning
```yaml
For each service (frontend, api-gateway, user-service, product-service):
1. Pull latest image from Docker Hub
2. Run Trivy scan
3. Analyze vulnerabilities
4. Create GitHub Issue (if CRITICAL/HIGH found)
5. Send PagerDuty alert (if CRITICAL)
6. Upload results as artifacts
```

#### Policy Compliance
```yaml
1. Run OPA Conftest on all K8s manifests
2. Run Kyverno policy tests
3. Report violations
4. Upload results
```

#### Dependency Scanning
```yaml
For each service:
1. Run npm audit
2. Check for vulnerable dependencies
3. Report fixable issues
4. Upload results
```

**Scheduled Scan Benefits:**
- Catches newly disclosed CVEs
- Monitors deployed images
- Ensures compliance
- Proactive security

---

### 3. Secret Rotation Pipeline (`secret-rotation.yml`)

**Triggers:**
- Schedule: Weekly on Sunday at 3 AM UTC
- Manual: workflow_dispatch with options

**Process:**

```yaml
1. Generate new secrets
   - JWT_SECRET (32 bytes, base64)
   - DB_PASSWORD (32 bytes, secure random)
   - API_KEY (32 bytes)
   - CALLBACK_TOKEN (32 bytes)

2. Backup current secrets
   - Copy to secrets/backups/backup-YYYYMMDD/

3. Create SealedSecrets
   - Fetch sealed-secrets controller public key
   - Seal new secrets
   - Create YAML manifests

4. Commit and push
   - Update secrets/freshbonds-secret.yaml
   - Commit with [skip ci]
   - Push to main

5. Trigger rolling restart
   - kubectl rollout restart deployment/freshbonds
   - kubectl rollout restart deployment/api-gateway
   - kubectl rollout restart deployment/user-service
   - kubectl rollout restart deployment/product-service

6. Verify health
   - Wait for deployments to be ready
   - Check pod status
   - Monitor logs

7. Notify
   - Create summary
   - Send PagerDuty alert (if failure)
```

**Secret Rotation Best Practices:**
- ✅ Rotate every 90 days minimum
- ✅ Always backup before rotation
- ✅ Use zero-downtime rolling restarts
- ✅ Verify application health after rotation
- ✅ Monitor for authentication errors

---

## 🔐 Security Features

### 1. Container Vulnerability Scanning

**Tool:** Trivy  
**Configuration:** `.trivy.yaml`

```yaml
Scans for:
- OS package vulnerabilities (Alpine, Ubuntu, etc.)
- Application dependencies (npm, pip, etc.)
- Misconfigurations
- Exposed secrets

Severity Levels:
- CRITICAL: CVE with CVSS >= 9.0 → ❌ FAIL BUILD
- HIGH: CVE with CVSS >= 7.0 → ❌ FAIL BUILD
- MEDIUM: CVE with CVSS >= 4.0 → ⚠️ WARNING
- LOW: CVE with CVSS < 4.0 → ℹ️ INFO
```

**Trivy Ignore:**  
Add false positives to `.trivyignore`:
```
# CVE-2023-12345 - False positive, not using affected feature
CVE-2023-12345
```

### 2. Policy as Code

#### OPA (Open Policy Agent)
Location: `policies/opa/`

**security.rego** - Container security policies:
```rego
deny[msg] {
  # No containers running as root
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext.runAsNonRoot
  msg = "Must set runAsNonRoot = true"
}

deny[msg] {
  # No privileged containers
  container.securityContext.privileged == true
  msg = "Privileged containers not allowed"
}

deny[msg] {
  # Require resource limits
  not container.resources.limits
  msg = "Must specify resource limits"
}
```

**network.rego** - Network policies:
```rego
deny[msg] {
  # Warn on LoadBalancer services (cost)
  input.kind == "Service"
  input.spec.type == "LoadBalancer"
  msg = "LoadBalancer increases costs - use Ingress"
}
```

#### Kyverno
Location: `policies/kyverno/`

**pod-security.yaml** - Pod Security Standards:
```yaml
- runAsNonRoot: true (enforced)
- privileged: false (enforced)
- allowPrivilegeEscalation: false (enforced)
- capabilities: drop ALL (enforced)
- readOnlyRootFilesystem: true (production only)
- resource limits: required
```

**image-verification.yaml** - Supply chain security:
```yaml
- Disallow :latest tag
- Require approved registries (docker.io, ghcr.io, gcr.io)
- Require imagePullPolicy
```

### 3. Secrets Management

**SealedSecrets Integration:**

```bash
# Generate sealed secret
kubectl create secret generic my-secret \
  --from-literal=key=value \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > secrets/my-secret.yaml

# Commit encrypted secret to Git (safe!)
git add secrets/my-secret.yaml
git commit -m "Add encrypted secret"
git push
```

**Secret Rotation:**
- Automated weekly rotation
- Manual trigger via workflow_dispatch
- Zero-downtime rolling updates
- Backup before rotation
- Health checks after rotation

### 4. Image Signing (Optional)

**Cosign Integration:**

```yaml
# Uncomment in ci-cd.yml:
- name: Sign Image
  run: |
    cosign sign --key ${{ secrets.COSIGN_KEY }} \
      docker.io/youruser/frontend:abc123
```

**Setup:**
```bash
# Generate key pair
cosign generate-key-pair

# Add to GitHub Secrets
gh secret set COSIGN_PRIVATE_KEY < cosign.key
gh secret set COSIGN_PASSWORD
```

---

## ⚙️ Configuration

### GitHub Secrets Required

| Secret | Description | Required |
|--------|-------------|----------|
| `DOCKER_USERNAME` | Docker Hub username | ✅ Yes |
| `DOCKER_PASSWORD` | Docker Hub password/token | ✅ Yes |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `PAGERDUTY_INTEGRATION_KEY` | PagerDuty Events API v2 key | ❌ Optional |
| `KUBECONFIG` | Base64-encoded kubeconfig | ⚠️ For secret rotation |
| `OCI_TENANCY_OCID` | Oracle Cloud tenancy OCID | ⚠️ For Terraform |
| `OCI_USER_OCID` | Oracle Cloud user OCID | ⚠️ For Terraform |
| `OCI_FINGERPRINT` | OCI API key fingerprint | ⚠️ For Terraform |
| `OCI_PRIVATE_KEY` | OCI private key (base64) | ⚠️ For Terraform |

**Set secrets via script:**
```bash
./scripts/setup-pipeline.sh
```

**Or manually:**
```bash
gh secret set DOCKER_USERNAME --body "youruser"
gh secret set DOCKER_PASSWORD --body "yourtoken"
gh secret set MONGODB_URI --body "mongodb+srv://..."
```

### values.yaml Configuration

**Location:** `apps/freshbonds/values.yaml`

```yaml
frontend:
  image:
    repository: docker.io/youruser/frontend
    tag: "abc123"  # Updated by pipeline
    pullPolicy: IfNotPresent
  
  replicas: 2
  
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

api-gateway:
  image:
    repository: docker.io/youruser/api-gateway
    tag: "abc123"  # Updated by pipeline
    pullPolicy: IfNotPresent
  
  # ... similar configuration
```

**Pipeline updates the `tag` field automatically on every build.**

### Terraform Variables

**Location:** `terraform/terraform.tfvars`

```hcl
# Copy from example
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Edit with your values
vim terraform/terraform.tfvars
```

**Required variables:**
- `tenancy_ocid`
- `user_ocid`
- `fingerprint`
- `private_key_path`
- `compartment_id`
- `ssh_public_key`

---

## 🐛 Troubleshooting

### Pipeline Fails on "Detect Changes"

**Symptom:** No services detected, even though you changed code

**Solution:**
```bash
# Check if path patterns match
.github/workflows/ci-cd.yml:
  paths:
    - 'src/**'  # Must match your directory structure

# Verify changed files
git diff --name-only HEAD~1 HEAD
```

### Trivy Scan Fails with "Too Many Vulnerabilities"

**Symptom:** Build fails with CRITICAL/HIGH vulnerabilities

**Solution:**
```bash
# Option 1: Update base image
# In Dockerfile:
FROM node:18-alpine  # Use latest LTS

# Option 2: Update dependencies
cd src/frontend
npm update
npm audit fix

# Option 3: Ignore false positives
# Add to .trivyignore:
CVE-2023-12345  # Not applicable to our use case

# Rebuild and test
docker build -t test .
docker run --rm aquasec/trivy image test
```

### Manifest Update Fails

**Symptom:** Pipeline succeeds but values.yaml not updated

**Solution:**
```bash
# Check GitHub token permissions
# Settings → Actions → General → Workflow permissions
# Must have "Read and write permissions"

# Check values.yaml format
# Ensure service names match:
apps/freshbonds/values.yaml:
  frontend:    # Must match service name in src/
    image:
      tag: "..."

# Check for sed errors in logs
# Look for: "Service X not found in values.yaml"
```

### ArgoCD Not Syncing

**Symptom:** Manifest updated but ArgoCD doesn't deploy

**Solution:**
```bash
# Check ArgoCD application status
kubectl get application freshbonds -n argocd

# Manual sync
argocd app sync freshbonds

# Check ArgoCD logs
kubectl logs -n argocd deployment/argocd-application-controller

# Verify auto-sync enabled
argocd app set freshbonds --sync-policy automated
```

### Secret Rotation Fails

**Symptom:** Secret rotation workflow errors

**Solution:**
```bash
# Check KUBECONFIG secret
gh secret list | grep KUBECONFIG

# Re-export kubeconfig
kubectl config view --flatten > /tmp/kubeconfig.yaml
cat /tmp/kubeconfig.yaml | base64 | gh secret set KUBECONFIG

# Test connection
kubectl get nodes

# Check SealedSecrets controller
kubectl get pods -n sealed-secrets

# Get public key
kubectl get secret -n sealed-secrets sealed-secrets-key \
  -o jsonpath='{.data.tls\.crt}' | base64 -d \
  > secrets/sealed-secrets-public-key.crt
```

### Docker Push Fails

**Symptom:** "unauthorized: incorrect username or password"

**Solution:**
```bash
# Verify Docker Hub credentials
docker login -u youruser

# Use access token instead of password
# Docker Hub → Account Settings → Security → Access Tokens

# Update GitHub secret
gh secret set DOCKER_PASSWORD --body "dckr_pat_..."

# Test manually
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
```

---

## 📚 Best Practices

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
vim src/frontend/App.jsx

# 3. Test locally
cd src/frontend
npm install
npm test
npm run build

# 4. Test Docker build
docker build -t frontend:test .
docker run -p 3000:3000 frontend:test

# 5. Scan for vulnerabilities
docker run --rm aquasec/trivy image frontend:test

# 6. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 7. Create PR
gh pr create --title "Add new feature" --body "Description..."

# 8. Review pipeline results in PR
# Pipeline runs on PR, shows security scan results

# 9. Merge when approved
gh pr merge

# 10. Monitor deployment
kubectl get pods -n dev -w
```

### Dockerfile Best Practices

```dockerfile
# ✅ GOOD: Specific version, non-root, multi-stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
RUN addgroup -S appuser && adduser -S appuser -G appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]

# ❌ BAD: Latest tag, root user, single stage
FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]
```

### Security Checklist

Before deploying to production:

- [ ] All services have resource limits
- [ ] No containers running as root
- [ ] No privileged containers
- [ ] No hostPath volumes
- [ ] No :latest image tags
- [ ] All capabilities dropped
- [ ] readOnlyRootFilesystem enabled
- [ ] Network policies defined
- [ ] Secrets encrypted with SealedSecrets
- [ ] Trivy scan passes (no CRITICAL/HIGH)
- [ ] OPA/Kyverno policies pass
- [ ] Liveness/readiness probes configured
- [ ] Resource quotas set per namespace
- [ ] RBAC configured (least privilege)
- [ ] Audit logging enabled
- [ ] Monitoring configured (Falco, Prometheus)
- [ ] Backup strategy implemented

### GitOps Best Practices

1. **Separate app code from manifests** ✅  
   - `/src` for application code
   - `/apps` for Helm charts
   - `/clusters` for cluster-specific config

2. **Use [skip ci] for manifest updates** ✅  
   - Prevents infinite loops
   - Format: `"chore: update images [skip ci]"`

3. **Semantic versioning for images** ✅  
   - Use git SHA as tags (immutable)
   - Format: `docker.io/user/app:abc1234`

4. **Environment promotion**:
   ```
   dev → staging → production
   
   Each environment has:
   - Separate namespace
   - Separate values file
   - Separate ArgoCD application
   ```

5. **Rollback strategy**:
   ```bash
   # Git-based rollback
   git revert HEAD
   git push origin main
   # ArgoCD automatically reverts deployment
   
   # Or manual rollback
   argocd app rollback freshbonds <revision>
   ```

---

## 🎓 Additional Resources

### Internal Documentation
- [Falco Complete Guide](../FALCO-COMPLETE-GUIDE.md)
- [Cluster Security Guide](../CLUSTER-SECURITY-GUIDE.md)
- [Terraform README](../terraform/README.md)

### External Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [Kyverno Documentation](https://kyverno.io/docs/)
- [SealedSecrets](https://github.com/bitnami-labs/sealed-secrets)

---

## 📞 Support

**Issues or Questions?**

1. Check [Troubleshooting](#troubleshooting) section
2. Review GitHub Actions logs
3. Check ArgoCD application status
4. Review Falco/Prometheus alerts
5. Create GitHub issue with:
   - Pipeline run URL
   - Error logs
   - Steps to reproduce

---

**Happy Deploying! 🚀**

*Last Updated: November 18, 2025*

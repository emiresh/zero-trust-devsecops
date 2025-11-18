# Security Tools Integration

This document provides an overview of all security tools integrated into the CI/CD pipeline.

## 🛡️ Security Tools Overview

| Tool | Purpose | Stage | Scope |
|------|---------|-------|-------|
| **Trivy** | Container vulnerability scanning | Build & Scheduled | Docker images |
| **Checkov** | Infrastructure as Code security | Policy Check & Scheduled | K8s, Terraform, Dockerfiles |
| **OPA** | Policy-as-code validation | Policy Check & Scheduled | Kubernetes manifests |
| **Kyverno** | Kubernetes admission control | Policy Check & Scheduled | Kubernetes resources |
| **npm audit** | Dependency vulnerability scanning | Scheduled | Node.js packages |
| **Falco** | Runtime security monitoring | Runtime (in cluster) | Container behavior |
| **SealedSecrets** | Secret encryption | GitOps | Kubernetes secrets |

---

## 🔍 Trivy - Container Vulnerability Scanning

**What it does:**
- Scans Docker images for known vulnerabilities (CVEs)
- Checks OS packages and application dependencies
- Detects misconfigurations and secrets in images

**When it runs:**
- During build pipeline (on every service build)
- Daily scheduled security scans
- Manual workflow dispatch

**Configuration:**
- File: `.trivy.yaml`
- Severity levels: CRITICAL, HIGH (fail), MEDIUM, LOW (warn)
- Fail threshold: Any CRITICAL or HIGH vulnerability blocks deployment

**Example output:**
```
📊 Trivy Results:
   🔴 CRITICAL: 0
   🟠 HIGH: 2
   🟡 MEDIUM: 5
   🟢 LOW: 12
```

**Actions on findings:**
1. Build fails if CRITICAL/HIGH found
2. Creates GitHub Issue with details
3. Sends PagerDuty alert
4. Blocks manifest update (no deployment)

---

## 🏗️ Checkov - Infrastructure as Code Security

**What it does:**
- Validates Kubernetes manifests against security best practices
- Scans Terraform code for misconfigurations
- Checks Dockerfiles for security issues
- Ensures compliance with CIS benchmarks

**When it runs:**
- During policy check stage in CI/CD
- Daily scheduled security scans
- Manual workflow dispatch with `iac` scan type

**What it scans:**
```
clusters/                    # All Kubernetes YAML manifests
  ├── test-cluster/
  │   ├── 00-namespaces/
  │   ├── 01-projects/
  │   ├── 05-infrastructure/
  │   ├── 10-apps/
  │   └── 15-ingress/
terraform/                   # Terraform infrastructure code
  ├── main.tf
  ├── variables.tf
  └── cloud-init.yaml
src/*/Dockerfile             # All Dockerfiles
```

**Configuration:**
- Framework: `kubernetes,terraform,dockerfile`
- Soft fail: `false` (blocks on violations)
- Output: CLI, SARIF (Security tab), JSON (artifacts)
- Skip checks: `CKV_K8S_43` (latest tag - handled by workflow)

**Common checks:**
- `CKV_K8S_8`: Liveness probe defined
- `CKV_K8S_9`: Readiness probe defined
- `CKV_K8S_10`: CPU requests defined
- `CKV_K8S_11`: CPU limits defined
- `CKV_K8S_12`: Memory requests defined
- `CKV_K8S_13`: Memory limits defined
- `CKV_K8S_14`: Image pull policy not Always
- `CKV_K8S_15`: Image tag not latest
- `CKV_K8S_16`: Container privileged disabled
- `CKV_K8S_17`: Container privilege escalation disabled
- `CKV_K8S_20`: Containers not running as root
- `CKV_K8S_21`: Default namespace not used
- `CKV_K8S_22`: Read-only root filesystem
- `CKV_K8S_23`: No hostNetwork
- `CKV_K8S_24`: No hostPID
- `CKV_K8S_25`: No hostIPC
- `CKV_K8S_28`: Drop ALL capabilities
- `CKV_K8S_29`: Apply security context
- `CKV_K8S_30`: Apply read-only root filesystem
- `CKV_K8S_31`: Seccomp profile configured
- `CKV_K8S_37`: Drop NET_RAW capability
- `CKV_K8S_38`: Service account defined
- `CKV_K8S_39`: Service account token auto-mount disabled

**Actions on findings:**
1. Displays violations in console
2. Uploads SARIF to GitHub Security tab
3. Creates GitHub Issue with violation details
4. Blocks deployment if violations found
5. Sends PagerDuty alert on critical failures

**Example output:**
```
📊 Checkov Results:
   ❌ Failed: 8
   ✅ Passed: 142
   ⏭️  Skipped: 3

Failed checks:
- CKV_K8S_10: CPU requests not defined (clusters/test-cluster/10-apps/dev-app.yaml)
- CKV_K8S_22: Read-only root filesystem not set (apps/freshbonds/templates/deployment.yaml)
```

**How to fix violations:**

1. **Missing resource limits:**
   ```yaml
   resources:
     requests:
       cpu: 100m
       memory: 128Mi
     limits:
       cpu: 500m
       memory: 512Mi
   ```

2. **Running as root:**
   ```yaml
   securityContext:
     runAsNonRoot: true
     runAsUser: 1000
     fsGroup: 1000
   ```

3. **Read-only root filesystem:**
   ```yaml
   securityContext:
     readOnlyRootFilesystem: true
   volumeMounts:
     - name: tmp
       mountPath: /tmp
   volumes:
     - name: tmp
       emptyDir: {}
   ```

4. **Drop capabilities:**
   ```yaml
   securityContext:
     capabilities:
       drop:
         - ALL
   ```

---

## 📋 OPA (Open Policy Agent) - Policy as Code

**What it does:**
- Enforces custom security policies on Kubernetes resources
- Validates configuration against organizational standards
- Prevents insecure deployments

**When it runs:**
- During policy check stage in CI/CD
- Daily scheduled policy compliance scans

**Configuration:**
- Directory: `policies/opa/`
- Files:
  - `security.rego` - Container security policies
  - `network.rego` - Network policies

**Example policies:**
```rego
# Deny containers running as root
deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext.runAsNonRoot
  msg = "Containers must not run as root"
}

# Require resource limits
deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].resources.limits
  msg = "Containers must have resource limits"
}
```

**Testing locally:**
```bash
# Install conftest
brew install conftest

# Test policies
conftest test --policy ./policies/opa clusters/**/*.yaml
```

---

## 🛡️ Kyverno - Kubernetes Admission Control

**What it does:**
- Validates Kubernetes resources at admission time
- Mutates resources to apply default security settings
- Generates required resources automatically

**When it runs:**
- During policy check stage in CI/CD
- In-cluster admission control (runtime)
- Daily scheduled policy validation

**Configuration:**
- Directory: `policies/kyverno/`
- Files:
  - `pod-security.yaml` - Pod Security Standards
  - `image-verification.yaml` - Image policies

**Example policies:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-runAsNonRoot
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Containers must run as non-root user"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
```

**Testing locally:**
```bash
# Install Kyverno CLI
kubectl krew install kyverno

# Test policies
kyverno apply policies/kyverno/*.yaml --resource clusters/**/*.yaml
```

---

## 📦 npm audit - Dependency Vulnerability Scanning

**What it does:**
- Scans Node.js dependencies for known vulnerabilities
- Checks npm packages against vulnerability databases
- Identifies fixable security issues

**When it runs:**
- Daily scheduled security scans
- Manual workflow dispatch with `dependencies` scan type

**Services scanned:**
- `frontend` (React app)
- `api-gateway` (Express.js)
- `user-service` (Express.js)
- `product-service` (Express.js)

**Example output:**
```
📦 NPM Audit Results for frontend:
   🔴 CRITICAL: 0
   🟠 HIGH: 1
   🟡 MODERATE: 3
   🟢 LOW: 7

🛠️ Fixable vulnerabilities:
   HIGH: 1 (run npm audit fix)
   MODERATE: 2 (run npm audit fix)
```

**Actions on findings:**
1. Displays vulnerability summary
2. Shows fixable issues
3. Creates artifacts with full audit results

**How to fix:**
```bash
cd src/frontend
npm audit fix              # Fix automatically
npm audit fix --force      # Fix breaking changes
npm audit                  # Verify fixes
```

---

## 🔥 Falco - Runtime Security Monitoring

**What it does:**
- Monitors container behavior at runtime
- Detects anomalous activities and security violations
- Alerts on suspicious system calls

**When it runs:**
- Continuously (DaemonSet in cluster)
- Real-time monitoring of all pods

**Deployment:**
```bash
kubectl get pods -n falco
NAME                    READY   STATUS    RESTARTS   AGE
falco-xyz123           1/1     Running   0          5d
```

**What it detects:**
- Shell execution in containers
- File modifications in sensitive directories
- Network connections to suspicious IPs
- Privilege escalation attempts
- Kernel module loading
- Process spawning anomalies

**Example alert:**
```
Warning: Shell spawned in container
  Container: frontend-xyz
  Command: /bin/sh
  User: www-data
  Namespace: dev
```

**Integration:**
- Alerts sent to Prometheus
- Visible in Grafana dashboards
- Critical alerts → PagerDuty

---

## 🔐 SealedSecrets - Secret Encryption

**What it does:**
- Encrypts Kubernetes secrets for Git storage
- Decrypts secrets in-cluster only
- Enables GitOps workflow for secrets

**When it runs:**
- During secret rotation (weekly)
- Manual secret updates

**How it works:**
```bash
# Generate secret
kubectl create secret generic my-secret \
  --from-literal=password=xyz123 \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit to Git (encrypted)
git add sealed-secret.yaml
git commit -m "chore: rotate secrets [skip ci]"
git push

# ArgoCD syncs → SealedSecrets controller decrypts → Secret created
```

**Integration:**
- Weekly automated rotation
- GitHub Secrets → SealedSecrets
- Rolling restart after rotation
- Health verification

---

## 🔄 Security Workflow Integration

### CI/CD Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Detect Changes                                    │
│  └─ Git diff analysis → Service matrix                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Security Policy Checks                            │
│  ├─ OPA Conftest (security.rego, network.rego)             │
│  ├─ Kyverno CLI (pod-security, image-verification)         │
│  └─ Checkov (Kubernetes + Terraform + Dockerfiles)         │
│     ├─ 150+ built-in checks                                 │
│     ├─ CIS benchmarks validation                            │
│     └─ SARIF upload to Security tab                         │
│                                                              │
│  ❌ FAIL → Block deployment                                 │
│  ✅ PASS → Continue to build                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: Build & Scan (per service)                        │
│  ├─ npm ci (install dependencies)                           │
│  ├─ npm test (run tests)                                    │
│  ├─ docker build (create image)                             │
│  ├─ Trivy scan (vulnerability detection)                    │
│  │  ├─ OS packages                                          │
│  │  ├─ Application dependencies                             │
│  │  └─ Misconfigurations                                    │
│  │                                                           │
│  │  CRITICAL/HIGH found?                                    │
│  │  ├─ YES → ❌ FAIL (block deployment)                     │
│  │  └─ NO → ✅ Continue                                     │
│  │                                                           │
│  └─ docker push (to Docker Hub)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STAGE 4: Update Manifests                                  │
│  ├─ Update values.yaml with new image tags                  │
│  ├─ Commit with [skip ci]                                   │
│  └─ Push to main                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  ArgoCD Auto-Sync                                            │
│  ├─ Detects manifest changes                                │
│  ├─ Validates with Kyverno (in-cluster)                     │
│  ├─ Applies to Kubernetes                                   │
│  └─ Monitors with Falco (runtime)                           │
└─────────────────────────────────────────────────────────────┘
```

### Security Scanning Schedule

```
Daily at 2 AM UTC:
├─ Image Scanning (Trivy)
│  └─ All services: frontend, api-gateway, user-service, product-service
├─ Policy Compliance (OPA + Kyverno)
│  └─ All Kubernetes manifests
├─ IaC Scanning (Checkov)
│  ├─ Kubernetes manifests (clusters/)
│  ├─ Terraform files (terraform/)
│  └─ Dockerfiles (src/*/Dockerfile)
└─ Dependency Scanning (npm audit)
   └─ All Node.js services

Weekly on Sunday at 3 AM UTC:
└─ Secret Rotation (SealedSecrets)
   ├─ Generate new secrets
   ├─ Seal with controller public key
   ├─ Commit encrypted secrets [skip ci]
   ├─ Rolling restart deployments
   └─ Health verification
```

---

## 📊 Security Reporting

### GitHub Security Tab

All security findings are uploaded to GitHub's Security tab:

1. **Trivy scan results** - Container vulnerabilities
2. **Checkov scan results** - IaC violations
3. **Dependency graphs** - npm audit findings

**View results:**
```
Repository → Security → Code scanning alerts
├─ Trivy (category: trivy-container)
├─ Checkov (category: checkov-iac)
└─ Dependabot (automatic)
```

### GitHub Issues

Automated issue creation for:
- Critical/High container vulnerabilities
- IaC policy violations
- Dependency security issues

**Labels:**
- `security` - Security-related issue
- `trivy` / `checkov` / `npm-audit` - Tool that found it
- `automated` - Auto-generated

### PagerDuty Alerts

Critical security events trigger PagerDuty alerts:
- Build failures due to vulnerabilities
- Policy violations blocking deployment
- IaC security violations
- Secret rotation failures

**Alert format:**
```json
{
  "summary": "Security: 3 CRITICAL vulnerabilities in frontend",
  "severity": "error",
  "source": "GitHub Actions",
  "custom_details": {
    "workflow": "CI/CD Pipeline",
    "service": "frontend",
    "critical": "3",
    "high": "5",
    "run_url": "https://github.com/..."
  }
}
```

---

## 🔧 Manual Security Scans

### Scan specific service:
```bash
# Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image youruser/frontend:latest

# npm audit
cd src/frontend
npm audit
```

### Test policies locally:
```bash
# OPA
conftest test --policy ./policies/opa clusters/**/*.yaml

# Kyverno
kyverno apply policies/kyverno/*.yaml --resource clusters/**/*.yaml

# Checkov
checkov -d . --framework kubernetes,terraform,dockerfile
```

### Run full security scan:
```bash
gh workflow run security-scan.yml -f scan_type=all
```

---

## 📚 Best Practices

### 1. Regular Updates
- Update base images monthly
- Update dependencies weekly
- Rotate secrets weekly (automated)

### 2. False Positive Management
- Add to `.trivyignore` with justification
- Document Checkov skips in code comments
- Create exceptions in OPA policies

### 3. Vulnerability Remediation SLA
- **CRITICAL**: Fix within 24 hours
- **HIGH**: Fix within 7 days
- **MEDIUM**: Fix within 30 days
- **LOW**: Fix during regular updates

### 4. Policy Development
- Test policies before enforcing
- Use `validationFailureAction: Audit` initially
- Monitor for false positives
- Gradually enforce stricter policies

### 5. Secret Management
- Never commit plain secrets
- Use SealedSecrets for GitOps
- Rotate regularly (automated)
- Use different secrets per environment

---

## 🆘 Troubleshooting

### Checkov blocking deployment

**Problem:** Checkov finding violations and blocking builds

**Solution:**
```bash
# Run Checkov locally to see violations
checkov -d . --framework kubernetes --compact

# Fix common issues
# 1. Add resource limits
# 2. Set runAsNonRoot: true
# 3. Drop ALL capabilities
# 4. Set read-only root filesystem

# Skip false positives (use sparingly)
# In YAML file:
metadata:
  annotations:
    checkov.io/skip: CKV_K8S_43=Using workflow-generated tags
```

### Trivy finding vulnerabilities

**Problem:** Build failing due to container vulnerabilities

**Solution:**
```bash
# Update base image
FROM node:20-alpine  # Use latest LTS

# Update dependencies
npm update
npm audit fix

# Add to .trivyignore if false positive
echo "CVE-2024-12345" >> .trivyignore
```

### Policy conflicts

**Problem:** OPA and Kyverno policies conflicting

**Solution:**
- Align policies between OPA and Kyverno
- Use OPA for pre-deployment validation
- Use Kyverno for runtime admission control
- Test both before enforcing

---

## 📖 Additional Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Checkov Documentation](https://www.checkov.io/documentation.html)
- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [Kyverno Documentation](https://kyverno.io/docs/)
- [Falco Documentation](https://falco.org/docs/)
- [SealedSecrets Documentation](https://sealed-secrets.netlify.app/)

---

**Questions?** Create a GitHub issue or check the [CI/CD Pipeline Documentation](./CICD-PIPELINE.md).

# GitHub Actions Workflows

This directory contains the CI/CD pipelines for the FreshBonds project.

## 📋 Workflows Overview

### 1. `ci-cd.yml` - Main CI/CD Pipeline

**Purpose:** Build, test, scan, and deploy services automatically

**Triggers:**
- Push to `main` branch
- Pull requests to `main`
- Changes in: `src/**`, `apps/**/templates/**`, `.github/workflows/**`

**What it does:**
1. **Detect Changes** - Smart detection of which services changed
2. **Policy Checks** - Validates OPA and Kyverno policies, runs Checkov IaC scanning
3. **Build & Scan** - Builds Docker images and scans for vulnerabilities with Trivy
4. **Update Manifests** - Updates `apps/freshbonds/values.yaml` with new image tags
5. **Notify** - Sends notifications and creates summaries

**Exit Codes:**
- `0` - Success (all checks passed, no critical vulnerabilities)
- `1` - Failure (build failed, critical/high vulnerabilities, or policy violations)

**Key Features:**
- ✅ Only builds changed services (efficient)
- ✅ Fails on CRITICAL/HIGH vulnerabilities
- ✅ Updates manifests with `[skip ci]` (prevents loops)
- ✅ Integrates with PagerDuty for alerts

---

### 2. `security-scan.yml` - Security Scanning

**Purpose:** Scheduled security audits and vulnerability detection

**Triggers:**
- Schedule: Daily at 2 AM UTC
- Manual: `workflow_dispatch` with scan type selection

**What it does:**
1. **Image Scanning** - Scans all deployed images with Trivy
2. **Policy Compliance** - Tests OPA and Kyverno policies
3. **Dependency Scanning** - Runs `npm audit` for all services
4. **IaC Scanning** - Runs Checkov for Kubernetes, Terraform, and Dockerfile validation
5. **GitHub Issues** - Automatically creates issues for vulnerabilities
6. **PagerDuty Alerts** - Sends alerts for critical findings

**Scan Types:**
- `all` - Full security audit (default)
- `images` - Container vulnerability scanning only
- `policies` - Policy compliance checking only
- `dependencies` - NPM dependency audit only
- `iac` - Infrastructure as Code scanning (Checkov) only

**Key Features:**
- ✅ Catches newly disclosed CVEs
- ✅ Monitors production images
- ✅ Creates actionable GitHub Issues
- ✅ Integrates with PagerDuty

---

### 3. `secret-rotation.yml` - Automated Secret Rotation

**Purpose:** Rotate secrets automatically for security

**Triggers:**
- Schedule: Weekly on Sunday at 3 AM UTC
- Manual: `workflow_dispatch` with namespace/secret selection

**What it does:**
1. **Generate Secrets** - Creates new secure random secrets
2. **Backup** - Backs up current secrets before rotation
3. **Seal Secrets** - Creates SealedSecrets for GitOps
4. **Deploy** - Commits and pushes encrypted secrets
5. **Restart** - Triggers rolling restart of applications
6. **Verify** - Checks deployment health after rotation

**Parameters:**
- `namespace` - Target namespace (dev/production)
- `secret_type` - Type of secret (all/jwt/database/api-keys)
- `force_rotation` - Force rotation even if recent

**Key Features:**
- ✅ Zero-downtime rotation
- ✅ Automatic backups
- ✅ Health verification
- ✅ SealedSecrets integration

---

## 🚀 Usage

### Automatic Triggers

All workflows trigger automatically:

```bash
# Push changes to main
git push origin main
# → Triggers ci-cd.yml

# Daily at 2 AM UTC
# → Triggers security-scan.yml

# Weekly on Sunday at 3 AM UTC
# → Triggers secret-rotation.yml
```

### Manual Triggers

#### Run CI/CD manually:
```bash
gh workflow run ci-cd.yml
```

#### Run security scan:
```bash
# Full scan
gh workflow run security-scan.yml

# Image scan only
gh workflow run security-scan.yml -f scan_type=images

# Policy compliance only
gh workflow run security-scan.yml -f scan_type=policies

# IaC scanning only
gh workflow run security-scan.yml -f scan_type=iac
```

#### Rotate secrets manually:
```bash
# Rotate all secrets in dev
gh workflow run secret-rotation.yml \
  -f namespace=dev \
  -f secret_type=all

# Rotate only JWT secrets with force
gh workflow run secret-rotation.yml \
  -f namespace=production \
  -f secret_type=jwt \
  -f force_rotation=true
```

---

## 📊 Monitoring Workflows

### View workflow runs:
```bash
# List recent runs
gh run list --limit 10

# Watch current run
gh run watch

# View specific run with logs
gh run view <run-id> --log
```

### Cancel a run:
```bash
gh run cancel <run-id>
```

### Re-run failed jobs:
```bash
gh run rerun <run-id>
```

---

## 🔐 Required Secrets

Configure these in GitHub repository settings:

### Essential Secrets
```bash
DOCKER_USERNAME          # Docker Hub username
DOCKER_PASSWORD          # Docker Hub password/token
MONGODB_URI              # MongoDB connection string
```

### Optional Secrets
```bash
PAGERDUTY_INTEGRATION_KEY  # For PagerDuty alerts
KUBECONFIG                 # For secret rotation (base64 encoded)
```

### Set secrets via CLI:
```bash
gh secret set DOCKER_USERNAME --body "youruser"
gh secret set DOCKER_PASSWORD --body "yourtoken"
gh secret set MONGODB_URI --body "mongodb+srv://..."
```

---

## 🐛 Troubleshooting

### Workflow not triggering

**Check:**
1. Branch protection rules
2. Path filters in workflow
3. GitHub Actions enabled
4. Workflow syntax

```bash
# Validate workflow syntax
gh workflow view ci-cd.yml
```

### Build failing on vulnerability scan

**Fix:**
1. Check Trivy results in logs
2. Update base image or dependencies
3. Add false positives to `.trivyignore`

```bash
# Test locally
docker run --rm aquasec/trivy image yourimage:tag
```

### Manifest not updating

**Check:**
1. GitHub token permissions (Settings → Actions → Workflow permissions)
2. `values.yaml` format matches service names
3. Look for sed errors in logs

**Fix:**
```yaml
# Ensure format matches:
apps/freshbonds/values.yaml:
  frontend:      # Must match service name
    image:
      tag: "..."
```

### Secret rotation failing

**Check:**
1. KUBECONFIG secret is set and valid
2. SealedSecrets controller is running
3. Public key is available

```bash
# Re-export kubeconfig
kubectl config view --flatten | base64 | gh secret set KUBECONFIG

# Check SealedSecrets
kubectl get pods -n sealed-secrets
```

---

## 📚 Workflow Details

### CI/CD Pipeline Stages

```
Stage 1: Detect Changes
├─ Analyzes git diff
├─ Identifies changed services
└─ Creates JSON matrix

Stage 2: Policy Checks (if policies changed)
├─ OPA Conftest validation
├─ Kyverno policy testing
├─ Checkov IaC scanning
│  ├─ Kubernetes manifests
│  ├─ Terraform files
│  └─ Dockerfiles
└─ Reports violations

Stage 3: Build & Scan (matrix per service)
├─ npm ci (install dependencies)
├─ npm test (run tests)
├─ docker build (create image)
├─ Trivy scan (security check)
│  ├─ CRITICAL → FAIL ❌
│  ├─ HIGH → FAIL ❌
│  └─ MEDIUM/LOW → WARN ⚠️
└─ docker push (to Docker Hub)

Stage 4: Update Manifests
├─ Update values.yaml with new tags
├─ Commit with [skip ci]
└─ Push to main

Stage 5: Notify
├─ Create GitHub summary
├─ Upload artifacts
└─ Send PagerDuty alerts (if failure)
```

### Security Scan Stages

```
Job 1: Scan Images (matrix per service)
├─ Pull latest image
├─ Run Trivy scan
├─ Analyze results
├─ Create GitHub Issue (if vulnerabilities)
└─ Send PagerDuty alert (if critical)

Job 2: Scan Policies
├─ OPA Conftest tests
├─ Kyverno policy tests
└─ Report violations

Job 3: Scan Dependencies (matrix per service)
├─ npm audit
├─ Report vulnerabilities
└─ Show fixable issues

Job 4: Scan IaC (Checkov)
├─ Kubernetes manifest validation
├─ Terraform security checks
├─ Dockerfile best practices
├─ Create GitHub Issue (if violations)
└─ Upload SARIF to Security tab

Job 5: Summary
└─ Aggregate all results
```

### Secret Rotation Stages

```
Stage 1: Setup
├─ Install kubeseal
├─ Configure kubectl
└─ Verify cluster connection

Stage 2: Generate Secrets
├─ JWT_SECRET (32 bytes)
├─ DB_PASSWORD (32 bytes)
├─ API_KEY (32 bytes)
└─ CALLBACK_TOKEN (32 bytes)

Stage 3: Backup
└─ Copy current secrets to backups/

Stage 4: Create SealedSecrets
├─ Fetch public key from cluster
├─ Seal new secrets
└─ Create YAML manifests

Stage 5: Deploy
├─ Commit encrypted secrets
├─ Push to main [skip ci]
└─ ArgoCD syncs automatically

Stage 6: Restart Applications
├─ Rolling restart deployments
├─ Wait for ready state
└─ Verify health

Stage 7: Notify
├─ Create summary
└─ Send PagerDuty alert (if failure)
```

---

## 🎓 Best Practices

### Workflow Development

1. **Test locally first**
   ```bash
   # Use act to test workflows locally
   brew install act
   act -l  # List workflows
   act push  # Test push trigger
   ```

2. **Use matrix strategy** for parallel builds
   ```yaml
   strategy:
     matrix:
       service: [frontend, api-gateway, user-service, product-service]
   ```

3. **Add [skip ci]** to prevent loops
   ```bash
   git commit -m "chore: update manifests [skip ci]"
   ```

4. **Use artifacts** for debugging
   ```yaml
   - uses: actions/upload-artifact@v4
     with:
       name: trivy-results
       path: trivy-results.json
   ```

5. **Set timeouts** to prevent hanging
   ```yaml
   jobs:
     build:
       timeout-minutes: 30
   ```

### Security Best Practices

1. **Never commit secrets** to workflows
   - Use GitHub Secrets
   - Reference: `${{ secrets.SECRET_NAME }}`

2. **Pin action versions**
   ```yaml
   uses: actions/checkout@v4  # ✅ Good
   uses: actions/checkout@main  # ❌ Bad
   ```

3. **Minimal permissions**
   ```yaml
   permissions:
     contents: read
     security-events: write
   ```

4. **Fail on critical vulnerabilities**
   ```bash
   if [[ $CRITICAL -gt 0 ]]; then
     exit 1
   fi
   ```

---

## 📖 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Full Pipeline Documentation](../docs/CICD-PIPELINE.md)

---

**Questions?** Check the [troubleshooting guide](../docs/CICD-PIPELINE.md#troubleshooting) or create a GitHub issue.

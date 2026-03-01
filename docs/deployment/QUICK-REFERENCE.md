# CI/CD Pipeline - Quick Reference

## 🚀 Quick Commands

### Setup
```bash
# Initial setup
./scripts/setup-pipeline.sh

# Make scripts executable
chmod +x scripts/*.sh
```

### Build & Deploy
```bash
# Trigger pipeline (push to main)
git add .
git commit -m "feat: your changes"
git push origin main

# Monitor pipeline
gh run watch

# View latest run
gh run view
```

### Security Scanning
```bash
# Manual security scan
gh workflow run security-scan.yml

# View Trivy results locally
docker run --rm aquasec/trivy image docker.io/youruser/frontend:latest
```

### Secret Rotation
```bash
# Manual secret rotation
gh workflow run secret-rotation.yml \
  -f namespace=dev \
  -f secret_type=jwt \
  -f force_rotation=true

# View rotation history
cat secrets/rotation-logs/rotation-history.md
```

### Terraform
```bash
cd terraform/

# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply

# Destroy
terraform destroy
```

### ArgoCD
```bash
# Sync application
argocd app sync freshbonds

# Get status
argocd app get freshbonds

# View history
argocd app history freshbonds

# Rollback
argocd app rollback freshbonds <revision>
```

## 📝 Common Workflows

### Deploy New Feature
1. Create branch: `git checkout -b feature/xyz`
2. Make changes in `src/`
3. Test locally
4. Push: `git push origin feature/xyz`
5. Create PR: `gh pr create`
6. Merge when approved
7. Pipeline automatically builds & deploys

### Fix Security Vulnerability
1. Check Trivy results in GitHub Actions
2. Update `Dockerfile` base image or dependencies
3. Test: `docker build && trivy scan`
4. Commit and push
5. Pipeline re-scans and verifies fix

### Update Infrastructure
1. Edit `terraform/*.tf`
2. Plan: `terraform plan`
3. Apply: `terraform apply`
4. Update cluster configuration in Git
5. ArgoCD syncs changes

### Rotate Secrets
1. Trigger: `gh workflow run secret-rotation.yml`
2. Wait for completion
3. Verify: `kubectl get pods -n dev`
4. Check logs: `kubectl logs -n dev deployment/freshbonds`

## 🔧 Troubleshooting

### Pipeline Stuck
```bash
# Cancel current run
gh run cancel

# View logs
gh run view --log
```

### Image Not Updating
```bash
# Check values.yaml
git diff HEAD~1 apps/freshbonds/values.yaml

# Force ArgoCD sync
argocd app sync freshbonds --force
```

### Secret Not Working
```bash
# Check sealed secret
kubectl get sealedsecret -n dev

# Check if secret created
kubectl get secret freshbonds-secret -n dev

# Restart pods
kubectl rollout restart deployment/freshbonds -n dev
```

## 📊 Monitoring

### Pipeline Status
```bash
# List recent runs
gh run list --limit 10

# Watch current run
gh run watch

# View specific run
gh run view 123456
```

### Application Health
```bash
# Pod status
kubectl get pods -n dev

# Deployment status
kubectl get deployments -n dev

# View logs
kubectl logs -f -n dev deployment/freshbonds

# Port forward for testing
kubectl port-forward -n dev svc/freshbonds 3000:3000
```

### Security Alerts
```bash
# View Falco alerts
kubectl logs -n falco daemonset/falco

# Check GitHub Issues (auto-created)
gh issue list --label security

# PagerDuty incidents
# Check PagerDuty dashboard
```

## 🔐 Security

### Image Signing (Optional)
```bash
# Generate keys
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key docker.io/user/app:tag

# Verify
cosign verify --key cosign.pub docker.io/user/app:tag
```

### Policy Testing
```bash
# Test OPA policies
conftest test --policy policies/opa clusters/**/*.yaml

# Test Kyverno policies
kyverno apply policies/kyverno/*.yaml --resource clusters/**/*.yaml
```

## 📚 Reference

### Image Tags
Format: `<git-sha-short>` (e.g., `abc1234`)

### Secrets
- Encrypted with SealedSecrets
- Stored in `secrets/`
- Rotated weekly automatically

### Environments
- `dev` - Development namespace
- `production` - Production namespace

### Registries
- Docker Hub: `docker.io/youruser/`
- GitHub Container Registry: `ghcr.io/emiresh/`

## 🆘 Get Help

1. Check logs: `gh run view --log`
2. Review docs: `docs/CICD-PIPELINE.md`
3. Create issue: `gh issue create`
4. PagerDuty alert for critical issues

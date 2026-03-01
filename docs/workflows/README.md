# GitHub Actions Workflows Documentation

This directory contains detailed documentation for all automated workflows in the project.

---

## 📋 Workflow Documentation

Each workflow has comprehensive documentation covering triggers, process flow, configuration, troubleshooting, and best practices.

| Workflow | Purpose | Trigger | Duration |
|----------|---------|---------|----------|
| [App CI/CD](./APP-CICD-WORKFLOW.md) | Build, scan, and deploy microservices | Push to main, Manual | ~8-12 min |
| [Secret Rotation](./SECRET-ROTATION-WORKFLOW.md) | Rotate secrets & credentials | Monthly, Manual | ~5 min |
| [Security Scan](./SECURITY-SCAN-WORKFLOW.md) | Scheduled security audits | Monthly, Manual | ~10 min |
| [Terraform Pipeline](./TERRAFORM-WORKFLOW.md) | Infrastructure as Code deployment | Push to terraform/, Manual | ~15 min |
| [PR Validation](./PR-VALIDATION-WORKFLOW.md) | Fast PR feedback | PR open/update | ~3-5 min |

---

## 🎯 Quick Reference

### Running Workflows Manually

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select workflow from left sidebar
3. Click "Run workflow" button
4. Configure options (if any)
5. Click green "Run workflow" button
```

### Viewing Workflow Runs

```bash
# Recent runs
Actions → Select workflow → View runs

# Specific run details
Actions → Workflow run → View logs/artifacts
```

### Common Options

**App CI/CD**:
- `skip_tests`: Skip tests (emergency only)

**Secret Rotation**:
- `secret_type`: all|jwt|database|api-keys|tls-certs
- `force_rotation`: Force even if recent
- `notification`: Send alerts

**Security Scan**:
- `scan_type`: all|containers|iac|dependencies
- `severity`: critical|high|all

**Terraform**:
- `action`: plan|apply|destroy
- `auto_approve`: Skip approval (use cautiously)

---

## 🔄 Workflow Dependencies

```
┌─────────────────┐
│   PR Created    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PR Validation   │ ← Fast feedback (3-5 min)
└────────┬────────┘
         │
         ▼ (on merge)
┌─────────────────┐
│   App CI/CD     │ ← Full build & security scan
└────────┬────────┘
         │
         ▼ (updates manifests)
┌─────────────────┐
│ ArgoCD Sync     │ ← Deployment to cluster
└─────────────────┘

Monthly Schedule:
┌─────────────────┐
│ Secret Rotation │ ← Automated security maintenance
└─────────────────┘

Monthly Schedule:
┌─────────────────┐
│ Security Scan   │ ← Proactive vulnerability detection
└─────────────────┘
```

---

## 🛡️ Security Gates

All workflows implement security gates:

### Left-Shift Security
- Policy validation **before** build
- Manifest scanning **before** deployment
- Secret scanning **during** build

### Zero-Trust Validation
- ❌ **BLOCK** on critical vulnerabilities
- ⚠️  **WARN** on high vulnerabilities  
- ℹ️  **INFO** on medium/low

### Compliance
- SBOM generation for all images
- SARIF reports to Security tab
- 90-day artifact retention

---

## 📊 Monitoring Workflows

### GitHub Actions Dashboard
```
Actions → View all workflows
- Success/failure status
- Run duration trends
- Artifact downloads
```

### Notifications
- Email on failure
- PagerDuty alerts (critical)
- GitHub Issues (audit trail)

### Artifacts
```
Actions → Workflow run → Artifacts
- security-artifacts-{service}
- trivy-results.sarif
- sbom-{service}.json
```

---

## 🔧 Troubleshooting

### Workflow won't trigger

**Check**:
1. Path filters match changed files
2. Branch protection rules
3. Workflow permissions

### Workflow fails repeatedly

**Steps**:
1. Check workflow logs
2. Review failed step
3. Check related documentation
4. Look for similar issues in GitHub Issues

### Need to re-run

```bash
# Re-run all jobs
Actions → Failed run → Re-run all jobs

# Re-run specific job
Actions → Failed run → Click job → Re-run job
```

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Security Tools Guide](../security/SECURITY-OVERVIEW.md)
- [Architecture Overview](../architecture/SYSTEM-ARCHITECTURE.md)
- [Development Guide](../DEVELOPMENT-GUIDE.md)

---

**Last Updated**: March 2026

# Deployment & Development Documentation

Setup guides, deployment procedures, and infrastructure management.

---

## 📚 Available Documents

### 🚀 Getting Started

**[Development Guide](./DEVELOPMENT-GUIDE.md)** - **START HERE**

Complete setup for local development:
- Prerequisites and dependencies
- Local environment setup
- Running services locally
- Debugging and testing
- Common issues and solutions

**[Docker Compose Setup](./DOCKER-COMPOSE-GUIDE.md)**

Local multi-service orchestration:
- Docker Compose configuration
- Service dependencies
- Local networking
- Volume management
- Quick start commands

---

### 🌍 Environments

**[Dev vs Prod Environments](./DEV-VS-PROD.md)**

Differences between environments:
- Configuration differences
- Resource allocation
- Security settings
- Testing strategies
- Promotion workflows

---

### 🏗️ Infrastructure

**[Terraform Pipeline Guide](./TERRAFORM-PIPELINE-GUIDE.md)**

Infrastructure as Code deployment:
- Terraform workflow overview
- OCI resource management
- State management
- Change procedures
- Troubleshooting

**[Terraform Backend Migration](./TERRAFORM-BACKEND-MIGRATION.md)**

Backend state migration guide:
- Migration from local to remote state
- OCI Object Storage setup
- State locking configuration
- Rollback procedures

---

### 📖 Quick Reference

**[Quick Reference](./QUICK-REFERENCE.md)**

Common commands and procedures:
- kubectl shortcuts
- ArgoCD commands
- Debugging commands
- Service deployment
- Rollback procedures

---

## 🎯 Quick Start Guides

### For New Developers

1. **Read**: [Development Guide](./DEVELOPMENT-GUIDE.md)
2. **Setup**: Clone repo and install dependencies
3. **Run**: Use [Docker Compose](./DOCKER-COMPOSE-GUIDE.md) for local services
4. **Develop**: Make changes and test locally
5. **Submit**: Create PR (see [PR Validation](../workflows/PR-VALIDATION-WORKFLOW.md))

### For DevOps Engineers

1. **Read**: [Terraform Pipeline Guide](./TERRAFORM-PIPELINE-GUIDE.md)
2. **Review**: [Architecture](../architecture/SYSTEM-ARCHITECTURE.md)
3. **Deploy**: Use [Workflows](../workflows/TERRAFORM-WORKFLOW.md)
4. **Monitor**: Check [Monitoring](../monitoring/README.md)

---

## 🔧 Common Tasks

### Deploy New Service

```bash
# 1. Build and push image
./scripts/build-and-push.sh v1.0.0

# 2. Update Helm values
vim apps/freshbonds/values.yaml

# 3. Commit changes (ArgoCD auto-syncs)
git add apps/freshbonds/values.yaml
git commit -m "feat: deploy service v1.0.0"
git push
```

### Rollback Deployment

```bash
# Via kubectl
kubectl rollout undo deployment/service-name -n dev

# Via ArgoCD
argocd app rollback freshbonds --revision <previous-revision>
```

### Debug Pod Issues

```bash
# View logs
kubectl logs -n dev <pod-name> --previous

# Exec into pod
kubectl exec -it -n dev <pod-name> -- /bin/sh

# Describe pod
kubectl describe pod -n dev <pod-name>
```

---

## 🔗 Related Documentation

- [Workflows](../workflows/README.md) - CI/CD pipelines
- [Architecture](../architecture/SYSTEM-ARCHITECTURE.md) - System design
- [Security](../security/CLUSTER-SECURITY-GUIDE.md) - Cluster hardening

---

**Maintained By**: Platform Engineering Team  
**Last Updated**: March 2026

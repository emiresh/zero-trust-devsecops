# Documentation Index

**FreshBonds Zero-Trust DevSecOps Platform**

Complete documentation structure for the project including workflows, architecture, security, monitoring, and deployment guides.

---

## 📚 Documentation Structure

```
docs/
├── README.md (this file)              # Master index
├── workflows/                         # CI/CD Pipeline Documentation
│   ├── README.md                      # Workflows overview
│   ├── APP-CICD-WORKFLOW.md          # Main deployment pipeline
│   ├── SECRET-ROTATION-WORKFLOW.md    # Secret rotation automation
│   ├── SECURITY-SCAN-WORKFLOW.md      # Security audits
│   ├── TERRAFORM-WORKFLOW.md          # Infrastructure pipeline
│   └── PR-VALIDATION-WORKFLOW.md      # PR validation
├── architecture/                      # System Architecture
│   ├── README.md                      # Architecture overview
│   └── SYSTEM-ARCHITECTURE.md         # ⭐ Complete architecture (START HERE)
├── security/                          # Security Documentation
│   ├── README.md                      # Security overview
│   ├── SECURITY-OVERVIEW.md           # ⭐ Complete security guide (START HERE)
│   ├── SECURITY-TOOLS.md              # Tools reference
│   ├── CLUSTER-SECURITY-GUIDE.md      # K8s hardening
│   ├── FALCO-COMPLETE-GUIDE.md        # Runtime security
│   └── SEALEDSECRETS-PERMANENT-KEY.md # Key management
├── monitoring/                        # Monitoring & Observability
│   ├── README.md                      # Monitoring overview
│   ├── GRAFANA-APPLICATION-ALERTS.md  # App alerts
│   ├── GRAFANA-LOG-ALERTS.md          # Log alerts
│   ├── GRAFANA-LOGIN-ALERTS.md        # Auth monitoring
│   └── PAGERDUTY-INTEGRATION.md       # Incident management
└── deployment/                        # Deployment Guides
│   ├── README.md                      # Deployment overview
│   ├── DEVELOPMENT-GUIDE.md           # Local development setup
│   ├── DOCKER-COMPOSE-GUIDE.md        # Docker Compose
│   ├── DEV-VS-PROD.md                 # Environment differences
│   ├── QUICK-REFERENCE.md             # Common commands
│   ├── TERRAFORM-PIPELINE-GUIDE.md    # IaC deployment
│   └── TERRAFORM-BACKEND-MIGRATION.md # State migration
└── rotation-logs/                     # Secret Rotation Logs
    ├── README.md                      # Logs overview
    └── rotation-history.md            # Rotation audit trail
```

---

## � Quick Navigation

### By Directory

- **[Workflows README](./workflows/README.md)** - CI/CD pipeline documentation
- **[Architecture README](./architecture/README.md)** - System design and infrastructure
- **[Security README](./security/README.md)** - Security tools, policies, and procedures
- **[Monitoring README](./monitoring/README.md)** - Observability and alerting
- **[Deployment README](./deployment/README.md)** - Setup and deployment guides- **[Rotation Logs README](./rotation-logs/README.md)** - Secret rotation audit trail
### Start Here Documents ⭐

New to the project? Start with these:

1. **[System Architecture](./architecture/SYSTEM-ARCHITECTURE.md)** - Understand the overall system
2. **[Security Overview](./security/SECURITY-OVERVIEW.md)** - Learn the security model
3. **[Development Guide](./deployment/DEVELOPMENT-GUIDE.md)** - Set up your local environment
4. **[Workflows Overview](./workflows/README.md)** - Understand the CI/CD pipelines

---

## 🔄 Workflows Documentation

**Location**: [`docs/workflows/`](./workflows/) | **[README](./workflows/README.md)**

Comprehensive documentation for all GitHub Actions workflows:

| Workflow | Description | Duration | Trigger |
|----------|-------------|----------|---------|
| [App CI/CD](./workflows/APP-CICD-WORKFLOW.md) | Build, scan, deploy services | ~8-12 min | Push to main, Manual |
| [Secret Rotation](./workflows/SECRET-ROTATION-WORKFLOW.md) | Rotate credentials | ~5 min | Monthly, Manual |
| [Security Scan](./workflows/SECURITY-SCAN-WORKFLOW.md) | Scheduled security audits | ~10 min | Monthly, Manual |
| [Terraform](./workflows/TERRAFORM-WORKFLOW.md) | Infrastructure deployment | ~15 min | Terraform changes, Manual |
| [PR Validation](./workflows/PR-VALIDATION-WORKFLOW.md) | Fast PR feedback | ~3-5 min | PR open/update |

**Quick Reference**: [Workflows README](./workflows/README.md)

---

## 🏗️ Architecture Documentation

**Location**: [`docs/architecture/`](./architecture/) | **[README](./architecture/README.md)**

### System Architecture

**[Complete System Architecture](./architecture/SYSTEM-ARCHITECTURE.md)**

Covers:
- Infrastructure layer (OCI compute, networking)
- Kubernetes platform (cluster setup, core components)
- Application services (microservices architecture)
- Security architecture (defense in depth)
- GitOps & CI/CD (deployment flows)
- Monitoring & observability (Prometheus, Grafana, Falco)
- Data flow patterns
- Network architecture
- Disaster recovery

**Key Diagrams**:
```
System Layers → Infrastructure → Platform → Application → Security
Network Flow → Internet → Ingress → Services → Database
GitOps Flow → Git → GitHub Actions → Docker Hub → ArgoCD → Kubernetes
```

---

## 🔐 Security Documentation

**Location**: [`docs/security/`](./security/) | **[README](./security/README.md)**

### Security Overview

**[Complete Security Guide](./security/SECURITY-OVERVIEW.md)**

Covers:
- Zero-trust security philosophy
- Security layers (7-layer defense)
- Left-shift security (pre-commit to CI/CD)
- Runtime security (Falco monitoring)
- Secret management (Sealed Secrets)
- Network security (policies, segmentation)
- Access control (RBAC)
- Compliance & auditing
- Incident response playbook
- Security tools reference

**Security Tools Stack**:
| Tool | Purpose | Phase |
|------|---------|-------|
| Trivy | Container/IaC scanning | Left-shift |
| Checkov | Terraform validation | Left-shift |
| Kyverno | Policy enforcement | Admission |
| OPA | Custom policies | Admission |
| Falco | Runtime monitoring | Runtime |
| Sealed Secrets | Encryption | Secret mgmt |

---

## 📊 Monitoring Documentation

**Location**: [`docs/monitoring/`](./monitoring/) | **[README](./monitoring/README.md)**

### Available Guides

- **Grafana Setup**: Dashboard configuration, data sources
- **Prometheus**: Metrics collection, alert rules
- **Falco Alerts**: Runtime security monitoring
- **PagerDuty Integration**: Incident alerting
- **Log Aggregation**: Future Loki/ELK setup

**Related Files**:
- [Grafana Application Alerts](./monitoring/GRAFANA-APPLICATION-ALERTS.md)
- [Grafana Log Alerts](./monitoring/GRAFANA-LOG-ALERTS.md)
- [Grafana Login Alerts](./monitoring/GRAFANA-LOGIN-ALERTS.md)
- [PagerDuty Integration Guide](./monitoring/PAGERDUTY-INTEGRATION.md)

---

## 🚀 Deployment Documentation

**Location**: [`docs/deployment/`](./deployment/) | **[README](./deployment/README.md)**

### Guides

- **Development Setup**: Local development environment
- **Cluster Setup**: Kubernetes cluster installation
- **GitOps Setup**: ArgoCD bootstrap process
- **Service Deployment**: Deploying microservices
- **Troubleshooting**: Common issues and solutions

**Related Files**:
- [Development Guide](./deployment/DEVELOPMENT-GUIDE.md)
- [Docker Compose Setup](./deployment/DOCKER-COMPOSE-GUIDE.md)
- [Dev vs Prod Environments](./deployment/DEV-VS-PROD.md)
- [Quick Reference](./deployment/QUICK-REFERENCE.md)
- [Terraform Backend Migration](./deployment/TERRAFORM-BACKEND-MIGRATION.md)
- [Terraform Pipeline Guide](./deployment/TERRAFORM-PIPELINE-GUIDE.md)

---

## 🔗 Quick Links

### For Developers

- **Getting Started**: [Development Guide](./DEVELOPMENT-GUIDE.md)
- **Contributing**: [CONTRIBUTING.md](../CONTRIBUTING.md) *(to be created)*
- **Code Style**: Application-specific conventions
- **PR Process**: [PR Validation Workflow](./workflows/PR-VALIDATION-WORKFLOW.md)

### For DevOps Engineers

- **Infrastructure**: [Terraform Workflow](./workflows/TERRAFORM-WORKFLOW.md)
- **Cluster Security**: [Cluster Security Guide](./security/CLUSTER-SECURITY-GUIDE.md)
- **Monitoring Setup**: [Monitoring Documentation](./monitoring/)
- **Incident Response**: [Security Overview - Incident Response](./security/SECURITY-OVERVIEW.md#incident-response)

### For Security Teams

- **Security Overview**: [Complete Security Guide](./security/SECURITY-OVERVIEW.md)
- **Security Tools**: [Security Tools Documentation](./security/SECURITY-TOOLS.md)
- **Compliance**: [Security Overview - Compliance](./security/SECURITY-OVERVIEW.md#compliance--auditing)
- **Scans & Reports**: [Security Scan Workflow](./workflows/SECURITY-SCAN-WORKFLOW.md)

### For Operations

- **Monitoring**: [Monitoring Documentation](./monitoring/)
- **Alerts**: [PagerDuty Integration](./monitoring/PAGERDUTY-INTEGRATION.md)
- **Secret Rotation**: [Secret Rotation Workflow](./workflows/SECRET-ROTATION-WORKFLOW.md)
- **Rotation Logs**: [Secret Rotation Logs](./rotation-logs/README.md)
- **Runbooks**: *(to be created)*

---

## 📖 Documentation by Topic

### CI/CD & Automation
- [App CI/CD Workflow](./workflows/APP-CICD-WORKFLOW.md)
- [Secret Rotation Workflow](./workflows/SECRET-ROTATION-WORKFLOW.md)
- [Security Scan Workflow](./workflows/SECURITY-SCAN-WORKFLOW.md)
- [Terraform Workflow](./workflows/TERRAFORM-WORKFLOW.md)
- [PR Validation Workflow](./workflows/PR-VALIDATION-WORKFLOW.md)
- [Workflows Overview](./workflows/README.md)

### Infrastructure
- [System Architecture](./architecture/SYSTEM-ARCHITECTURE.md)
- [Terraform Pipeline Guide](./deployment/TERRAFORM-PIPELINE-GUIDE.md)
- [Terraform Backend Migration](./deployment/TERRAFORM-BACKEND-MIGRATION.md)
- [Cluster Security Setup](./security/CLUSTER-SECURITY-GUIDE.md)

### Security
- [Security Overview](./security/SECURITY-OVERVIEW.md)
- [Security Tools](./security/SECURITY-TOOLS.md)
- [Cluster Security Guide](./security/CLUSTER-SECURITY-GUIDE.md)
- [Sealed Secrets Permanent Key](./security/SEALEDSECRETS-PERMANENT-KEY.md)
- [Falco Complete Guide](./security/FALCO-COMPLETE-GUIDE.md)
- [Secret Rotation Logs](./rotation-logs/README.md)

### Monitoring & Observability
- [Grafana Application Alerts](./monitoring/GRAFANA-APPLICATION-ALERTS.md)
- [Grafana Log Alerts](./monitoring/GRAFANA-LOG-ALERTS.md)
- [Grafana Login Alerts](./monitoring/GRAFANA-LOGIN-ALERTS.md)
- [PagerDuty Integration](./monitoring/PAGERDUTY-INTEGRATION.md)

### Development
- [Development Guide](./deployment/DEVELOPMENT-GUIDE.md)
- [Docker Compose Setup](./deployment/DOCKER-COMPOSE-GUIDE.md)
- [Dev vs Prod](./deployment/DEV-VS-PROD.md)

### Reference
- [Quick Reference](./deployment/QUICK-REFERENCE.md)
- [Workflows Overview](./workflows/README.md)
- [Architecture Overview](./architecture/README.md)

---

## 🔄 Documentation Maintenance

### Update Schedule

| Documentation | Update Frequency | Owner |
|---------------|------------------|-------|
| Workflow docs | On workflow changes | DevOps Team |
| Architecture | Quarterly review | Platform Team |
| Security | Monthly review | Security Team |
| Runbooks | On incident | Oncall Engineer |

### Contributing to Documentation

1. **Find the right location**:
   ```
   Workflow changes      → docs/workflows/
   Architecture changes  → docs/architecture/
   Security updates      → docs/security/
   New monitoring setup  → docs/monitoring/
   Deployment guides     → docs/deployment/
   ```

2. **Use markdown format**:
   - Clear headings
   - Code examples
   - Diagrams (ASCII or Mermaid)
   - Links to related docs

3. **Submit PR**:
   - Update relevant documentation
   - Link to related changes
   - Request review from doc owner

---

## 📝 Documentation Standards

### Structure

All documentation should include:
- **Overview**: What the document covers
- **Table of Contents**: For longer docs (> 200 lines)
- **Examples**: Code snippets, commands
- **Troubleshooting**: Common issues
- **Related Links**: Cross-references

### Code Blocks

```bash
# Always specify language
# Include comments for complex commands
kubectl get pods -n dev | grep product-service
```

### Diagrams

Use ASCII art for simple flows:
```
User → Ingress → Service → Pod → Database
```

Or Mermaid for complex diagrams (future).

---

## 🎯 Quick Start Guides

### For New Developers

1. Read [Development Guide](./deployment/DEVELOPMENT-GUIDE.md)
2. Setup local environment: [Docker Compose Setup](./deployment/DOCKER-COMPOSE-GUIDE.md)
3. Understand workflows: [PR Validation](./workflows/PR-VALIDATION-WORKFLOW.md)
4. Review architecture: [System Architecture](./architecture/SYSTEM-ARCHITECTURE.md)

### For New DevOps Engineers

1. Understand infrastructure: [System Architecture](./architecture/SYSTEM-ARCHITECTURE.md)
2. Review security: [Security Overview](./security/SECURITY-OVERVIEW.md)
3. Learn workflows: [Workflows README](./workflows/README.md)
4. Setup monitoring: [Monitoring Documentation](./monitoring/)

### For Security Auditors

1. Review security architecture: [Security Overview](./security/SECURITY-OVERVIEW.md)
2. Check compliance: [Security Overview - Compliance](./security/SECURITY-OVERVIEW.md#compliance--auditing)
3. Examine tools: [Security Tools](./SECURITY-TOOLS.md)
4. Review scans: [Security Scan Workflow](./workflows/SECURITY-SCAN-WORKFLOW.md)

---

## 🆘 Getting Help

### Documentation Issues

- Missing documentation? [Create an issue](../issues/new)
- Unclear instructions? [Submit a PR](../pulls)
- Questions? [Ask in Discussions](../discussions)

### Technical Support

- **Workflow issues**: Check workflow documentation
- **Security questions**: Review security overview
- **Infrastructure problems**: See architecture docs
- **Monitoring setup**: Check monitoring guides

---

## 📜 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | March 2026 | Complete documentation reorganization |
| 1.5 | February 2026 | Added workflow documentation |
| 1.0 | January 2026 | Initial documentation |

---

**Last Updated**: March 2026  
**Maintained By**: Platform Engineering Team  
**Review Schedule**: Quarterly

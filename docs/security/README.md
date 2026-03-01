# Security Documentation

Complete security architecture, tools, and procedures for the zero-trust DevSecOps platform.

---

## 📚 Available Documents

### 🆕 Current Documentation

**[Security Overview](./SECURITY-OVERVIEW.md)** - **START HERE**

Comprehensive security guide covering:
- Zero-trust security philosophy
- 7-layer defense architecture
- Left-shift security (pre-commit to CI/CD)
- Runtime security monitoring (Falco)
- Secret management (Sealed Secrets)
- Network security & policies
- Compliance & auditing
- Incident response playbook
- Security tools reference

---

### 🛠️ Tool-Specific Guides

**[Security Tools](./SECURITY-TOOLS.md)**

Reference guide for all security tools:
- Trivy (container & IaC scanning)
- Checkov (infrastructure validation)
- Kyverno (policy enforcement)
- OPA (custom policies)
- Falco (runtime monitoring)
- Gitleaks (secret scanning)

**[Falco Complete Guide](./FALCO-COMPLETE-GUIDE.md)**

Detailed Falco runtime security setup:
- Installation and configuration
- Custom rules
- Alert integration
- Troubleshooting

**[Cluster Security Guide](./CLUSTER-SECURITY-GUIDE.md)**

Kubernetes cluster hardening:
- Pod Security Standards
- Network Policies
- RBAC configuration
- Security contexts
- Admission controllers

---

### 🔐 Secret Management

**[Sealed Secrets Permanent Key](./SEALEDSECRETS-PERMANENT-KEY.md)**

Guide for managing Sealed Secrets encryption keys:
- Key generation and backup
- Key rotation procedures
- Recovery scenarios

> **Note**: For automated secret rotation workflow, see [Secret Rotation Workflow](../workflows/SECRET-ROTATION-WORKFLOW.md)

---

## 🚨 Quick Access

### Security Checklists
- [Pre-Deployment Checklist](./SECURITY-OVERVIEW.md#security-checklist)
- [Post-Deployment Checklist](./SECURITY-OVERVIEW.md#security-checklist)
- [Monthly Security Tasks](./SECURITY-OVERVIEW.md#security-checklist)

### Incident Response
- [Detection](./SECURITY-OVERVIEW.md#detection)
- [Response Playbook](./SECURITY-OVERVIEW.md#response-playbook)
- [Recovery Procedures](./SECURITY-OVERVIEW.md#incident-response)

### Compliance
- [PCI DSS](./SECURITY-OVERVIEW.md#compliance-standards)
- [SOC 2](./SECURITY-OVERVIEW.md#compliance-standards)
- [GDPR](./SECURITY-OVERVIEW.md#compliance-standards)

---

## 🔗 Related Documentation

- [Workflows](../workflows/README.md) - Security scan workflow
- [Architecture](../architecture/SYSTEM-ARCHITECTURE.md) - Security architecture
- [Monitoring](../monitoring/PAGERDUTY-INTEGRATION.md) - Security alerts

---

**Maintained By**: Security Team  
**Last Updated**: March 2026

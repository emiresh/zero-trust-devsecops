# Documentation Index

This directory documents the infrastructure, security controls, CI/CD
pipelines, and operational procedures implemented in this repository. It
supports the research artefact described in [`../thesis/`](../thesis/); for
the evaluated, citable account of the system, start with the thesis or the
IEEE paper rather than these operational guides.

## Structure

```
docs/
├── architecture/    System and infrastructure architecture
├── security/        Security tools, policies, and hardening guides
├── workflows/       One document per GitHub Actions pipeline
├── monitoring/      Grafana, Loki, and PagerDuty alerting
├── deployment/      Local development and Terraform guides
└── rotation-logs/   Automated secret-rotation audit trail
```

## Start Here

1. [System Architecture](./architecture/SYSTEM-ARCHITECTURE.md) - infrastructure, platform, and application layers
2. [Security Overview](./security/SECURITY-OVERVIEW.md) - the Zero Trust security model and control layers
3. [Development Guide](./deployment/DEVELOPMENT-GUIDE.md) - local environment setup
4. [Workflows Overview](./workflows/README.md) - the six CI/CD pipelines

## Workflows

| Workflow | Description | Trigger |
|---|---|---|
| [PR Validation](./workflows/PR-VALIDATION-WORKFLOW.md) | Fast pre-merge checks | Pull request |
| [App CI/CD](./workflows/APP-CICD-WORKFLOW.md) | Build, scan, deploy services | Push to `main` |
| [Terraform](./workflows/TERRAFORM-WORKFLOW.md) | Infrastructure validation and apply | Changes to `terraform/` |
| [Security Scan](./workflows/SECURITY-SCAN-WORKFLOW.md) | Scheduled vulnerability and policy audit | Monthly |
| [Secret Rotation](./workflows/SECRET-ROTATION-WORKFLOW.md) | Automated credential rotation | Monthly |

## Security

| Document | Covers |
|---|---|
| [Security Overview](./security/SECURITY-OVERVIEW.md) | Zero Trust model, layered controls, incident response |
| [Security Tools](./security/SECURITY-TOOLS.md) | Trivy, Checkov, Kyverno, OPA, Falco, Gitleaks reference |
| [Cluster Security Guide](./security/CLUSTER-SECURITY-GUIDE.md) | Kubernetes hardening on Oracle Cloud Infrastructure |
| [Falco Guide](./security/FALCO-COMPLETE-GUIDE.md) | Runtime security monitoring setup and rule authoring |
| [Sealed Secrets Key Management](./security/SEALEDSECRETS-PERMANENT-KEY.md) | Controller key backup and recovery |

## Monitoring

| Document | Covers |
|---|---|
| [Grafana Application Alerts](./monitoring/GRAFANA-APPLICATION-ALERTS.md) | Log-based application alerting |
| [Grafana Log Alerts](./monitoring/GRAFANA-LOG-ALERTS.md) | General Loki alert rules |
| [Grafana Login Alerts](./monitoring/GRAFANA-LOGIN-ALERTS.md) | Brute-force and enumeration detection |
| [PagerDuty Integration](./monitoring/PAGERDUTY-INTEGRATION.md) | Alertmanager-to-PagerDuty routing |

## Deployment

| Document | Covers |
|---|---|
| [Development Guide](./deployment/DEVELOPMENT-GUIDE.md) | Local setup and development workflow |
| [Docker Compose Guide](./deployment/DOCKER-COMPOSE-GUIDE.md) | Running the stack locally |
| [Dev vs. Prod](./deployment/DEV-VS-PROD.md) | Environment differences |
| [Quick Reference](./deployment/QUICK-REFERENCE.md) | Common commands |
| [Terraform Pipeline Guide](./deployment/TERRAFORM-PIPELINE-GUIDE.md) | Infrastructure deployment |
| [Terraform Backend Migration](./deployment/TERRAFORM-BACKEND-MIGRATION.md) | OCI backend migration notes |

## Secret Rotation Audit Trail

[`rotation-logs/rotation-history.md`](./rotation-logs/rotation-history.md) is
appended to automatically by the monthly secret-rotation workflow and serves
as the audit evidence discussed in the thesis evaluation (Section 5.4).

## Contributing to This Documentation

Add new documents to the directory that matches their topic
(`workflows/`, `architecture/`, `security/`, `monitoring/`, or
`deployment/`), use clear headings and runnable code examples, and cross-link
related documents. Pull requests are welcome; see the repository
[README](../README.md) for how the project is licensed and how to reach the
author.

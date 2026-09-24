# Zero-Trust DevSecOps: A Kubernetes Microservices Reference Implementation

This repository is the artefact for a Master of Information Security (MIS) research
project at the University of Colombo School of Computing (UCSC): a reproducible,
open-source reference implementation that operationalises Zero Trust Architecture
(NIST SP 800-207) as automated controls across the full delivery lifecycle of a
Kubernetes microservices application.

The system combines infrastructure as code, GitOps-driven deployment, dual-engine
policy-as-code enforcement (Kyverno + Open Policy Agent), container and dependency
scanning with SBOM generation, automated secret rotation, eBPF-based runtime threat
detection (Falco), and an AI-assisted incident-enrichment layer. It is deployed on a
three-node Kubernetes cluster on Oracle Cloud Infrastructure and evaluated against
NIST SP 800-207 and the MITRE ATT&CK for Containers matrix.

**Research paper and thesis:** see [`thesis/`](thesis/) for the full 76-page final
report ([`thesis/FINAL_REPORT.pdf`](thesis/FINAL_REPORT.pdf)) and a condensed IEEE
conference-format paper ([`thesis/ieee-paper/`](thesis/ieee-paper/)).

## Research Contribution and Novelty

The novelty of this work is the integrated artefact, not any individual tool.
Trivy, Kyverno, Falco, and Argo CD are each well studied in isolation; this
project's contribution is connecting them into a single, evidence-generating
continuous-compliance pipeline and evaluating that pipeline as a whole against
NIST Zero Trust tenets and MITRE ATT&CK technique coverage, rather than
against any one control in isolation. Specifically, the work contributes:

1. A reproducible, production-deployed Zero-Trust DevSecOps reference
   implementation for Kubernetes microservices.
2. A lifecycle-based continuous compliance model connecting PR validation,
   CI/CD scanning, GitOps deployment, scheduled audits, secret rotation,
   runtime detection, and incident reporting into one pipeline.
3. A dual policy-as-code design (Kyverno + Open Policy Agent) demonstrating
   that combining a Kubernetes-native engine with a general-purpose one gives
   broader control coverage than either alone.
4. A supply-chain evidence model: dual-format SBOM generation (SPDX +
   CycloneDX) paired with continuous vulnerability rescanning.
5. A secret lifecycle automation pattern spanning generation, sealing,
   GitOps deployment, and Git-based audit logging.
6. A non-blocking AI-assisted runtime security reporting design, where LLM
   enrichment augments Falco events without ever gating the primary alert
   path.
7. An evidence-based evaluation methodology mapping implementation artefacts
   to NIST SP 800-207 tenets and MITRE ATT&CK for Containers techniques,
   rather than relying on design claims alone.

**Evaluation highlights** (full detail in [`thesis/`](thesis/)):

| Metric | Result |
|---|---|
| NIST SP 800-207 Zero Trust tenets satisfied | 7 / 7 |
| Policy and runtime rules enforced (Kyverno + OPA + Falco) | 39 |
| Security tools integrated across CI/CD | 10, across 6 pipelines |
| MITRE ATT&CK for Containers techniques covered | 13, across 8 / 12 tactics |
| CI/CD gates tested against injected critical CVEs and policy violations | Blocked in all tested cases |
| Measured runtime detection latency (Falco/eBPF) | < 30 seconds |

## Application

FreshBonds is a demonstration farm-to-table e-commerce application used as the
subject system for the security framework. The business logic is intentionally
simple; the point of the project is the security automation around it.

- **API Gateway** (port 8080) - central entry point, request proxying, payment initiation
- **User Service** (port 8082) - authentication, JWT issuance, role-based access
- **Product Service** (port 8081) - product catalogue, ownership and admin controls
- **Frontend** (React + Vite) - user interface served via Nginx

## Tech Stack

- **Backend**: Node.js 18-20, Express, Mongoose 8.x
- **Frontend**: React, Vite
- **Database**: MongoDB Atlas
- **Containers**: Docker, multi-stage builds, non-root execution
- **Orchestration**: Kubernetes 1.28 (three-node cluster)
- **GitOps**: Argo CD with a recursive bootstrap pattern
- **Policy as code**: Kyverno, Open Policy Agent (OPA/Conftest)
- **Supply chain**: Trivy, Syft (SPDX + CycloneDX SBOMs), Checkov, Gitleaks
- **Runtime security**: Falco (eBPF), Falcosidekick
- **Observability**: Prometheus, Grafana, Loki, Alertmanager, PagerDuty
- **Secrets**: Bitnami Sealed Secrets with automated monthly rotation
- **AI enrichment**: FastAPI collector + Azure OpenAI (optional, non-blocking)

## Repository Structure

```
zero-trust-devsecops/
├── src/                     FreshBonds microservices (frontend, gateway, user, product)
├── apps/freshbonds/         Helm chart: values, templates, SealedSecret
├── terraform/               OCI infrastructure as code
├── clusters/test-cluster/   Argo CD-managed cluster manifests (namespaces, infra, apps, ingress)
├── bootstrap/               Argo CD bootstrap application (GitOps entry point)
├── policies/                Kyverno ClusterPolicies and OPA/Rego rules
├── .github/workflows/       CI/CD: PR validation, app pipeline, Terraform, security scan,
│                            secret rotation, AI collector pipeline
├── research/                AI Security Collector (FastAPI + Azure OpenAI enrichment)
├── docs/                    Architecture, security, deployment, and workflow documentation
├── thesis/                  Final report (PDF) and condensed IEEE-format paper
└── scripts/                 Build, deploy, and maintenance scripts
```

## Quick Start

### Building Docker Images

```bash
# Build all services with a specific version tag
./scripts/build-and-push.sh v1.2.1

# Or build individually
docker build -t <registry>/freshbonds-api-gateway:v1.2.1 ./src/api-gateway
docker build -t <registry>/freshbonds-user-service:v1.2.1 ./src/user-service
docker build -t <registry>/freshbonds-product-service:v1.2.1 ./src/product-service

# Frontend requires a build-time API URL
docker build \
 --build-arg VITE_API_URL=/api \
 -t <registry>/freshbonds-frontend:v1.2.1 \
 ./src/frontend
```

### Deploying with Argo CD

Argo CD syncs automatically from `main`. The bootstrap application manages every
resource under `clusters/test-cluster/`:

```bash
kubectl get applications -n argocd
kubectl get pods -n dev -w
kubectl logs -n dev -l app=api-gateway
```

### Local Development

For local development with Docker Compose, see
[`docs/deployment/DOCKER-COMPOSE-GUIDE.md`](docs/deployment/DOCKER-COMPOSE-GUIDE.md)
and [`docs/deployment/DEVELOPMENT-GUIDE.md`](docs/deployment/DEVELOPMENT-GUIDE.md).

## Build Arguments vs. Environment Variables

**Frontend (build-time):** Vite bundles environment variables into the static
JavaScript output, so `VITE_API_URL` must be passed as a Docker build argument, not
a runtime environment variable.

**Backend services (runtime):** Node.js reads `process.env` at runtime, so
configuration (for example `MONGODB_URI`) is supplied through Kubernetes secrets and
requires no rebuild to change.

## Production Features

- **Health checks**: every service exposes `GET /health/live` (liveness) and
 `GET /health/ready` (readiness), wired to Kubernetes probes.
- **Graceful shutdown**: services handle `SIGTERM`/`SIGINT` with a bounded drain
 period and clean database disconnection.
- **Container hardening**: non-root execution, dropped Linux capabilities,
 read-only root filesystems, `dumb-init` for signal handling, multi-stage builds,
 and `HEALTHCHECK` directives.
- **Secrets**: no hardcoded credentials; all sensitive values are Sealed Secrets
 decrypted only inside the target cluster.

## CI/CD Pipeline Architecture

Six specialised GitHub Actions workflows integrate ten security tools across the
delivery lifecycle, following a shift-left-and-extend-right design: fast checks run
before merge, deeper checks run on deployment, and audit checks run on a schedule.

| Pipeline | Trigger | Duration | Security tools | Blocking on |
|---|---|---|---|---|
| PR Validation | Pull request | < 2 min | ESLint, yamllint, Gitleaks, kubeval | Leaked secrets, invalid manifests |
| App CI/CD | Push to `main`/`develop` | 8-10 min | OPA/Conftest, Kyverno CLI, Trivy (CVE + secret), Checkov, Syft | Critical CVEs, policy violations, embedded secrets |
| Terraform | Changes to `terraform/**` | 2-4 min | Checkov, `terraform validate` | IaC violations, format errors |
| Security Scan | Monthly | 15-20 min | Trivy, npm audit, OPA, Kyverno, Checkov | Opens an issue and pages on-call |
| Secret Rotation | Monthly | 3-5 min | `kubeseal`, `openssl` | Rolls back on failed health check |
| AI Collector CI/CD | Push to `research/` | 5-8 min | Trivy, Syft | Critical CVEs |

Full workflow documentation is in [`docs/workflows/`](docs/workflows/).

## Documentation

Full documentation is indexed in [`docs/README.md`](docs/README.md), organised by
audience:

- **Architecture**: [`docs/architecture/SYSTEM-ARCHITECTURE.md`](docs/architecture/SYSTEM-ARCHITECTURE.md)
- **Security**: [`docs/security/SECURITY-OVERVIEW.md`](docs/security/SECURITY-OVERVIEW.md),
 [`docs/security/SECURITY-TOOLS.md`](docs/security/SECURITY-TOOLS.md),
 [`docs/security/CLUSTER-SECURITY-GUIDE.md`](docs/security/CLUSTER-SECURITY-GUIDE.md),
 [`docs/security/FALCO-COMPLETE-GUIDE.md`](docs/security/FALCO-COMPLETE-GUIDE.md)
- **Workflows**: [`docs/workflows/`](docs/workflows/) - one document per GitHub Actions pipeline
- **Monitoring**: [`docs/monitoring/`](docs/monitoring/) - Grafana, Loki, and PagerDuty alerting
- **Deployment**: [`docs/deployment/`](docs/deployment/) - local development, Docker Compose,
 and Terraform guides
- **AI Security Collector**: [`research/README.md`](research/README.md)

## Development Workflow

1. Create a feature branch and make changes under `src/`.
2. Open a pull request; PR Validation runs automatically (under two minutes) and
 comments with lint, secret-scan, and manifest-validation results.
3. On merge to `main`, App CI/CD builds and scans the images, generates SBOMs,
 updates `apps/freshbonds/values.yaml`, and Argo CD reconciles the cluster.
4. Verify the rollout:
 ```bash
 kubectl get pods -n dev -w
 kubectl describe pod -n dev -l app=api-gateway | grep Image:
 ```

## Monitoring

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
kubectl port-forward -n argocd svc/argocd-server 8080:443
```

## License

This is an open research project, released so the framework and findings can be
freely reused.

- **Code** (application services, infrastructure, CI/CD, policies, scripts) is
 licensed under the [MIT License](LICENSE).
- **Written content** (the thesis, the IEEE paper, diagrams, and `docs/`) is
 licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](LICENSE-DOCS).

See [`NOTICE`](NOTICE) for third-party attributions. If you use this work in
academic writing, please cite the thesis or paper in [`thesis/`](thesis/) (see
[`CITATION.cff`](CITATION.cff)).

## Author

EMIM Ekanayaka - Master of Information Security (MIS), University of Colombo
School of Computing (UCSC).

# Automating Continuous Compliance in DevSecOps Through Zero Trust

**Author:** (Your Name)  
**Program / Department:** (Your University / Department)  
**Degree:** (e.g., MSc in Information Systems)  
**Supervisor:** (Name)  
**Date:** January 6, 2026  

---

## Abstract
Modern software delivery relies on continuous integration and continuous delivery (CI/CD), cloud-native architectures, and infrastructure-as-code (IaC). While these practices increase delivery velocity, they can also amplify security risk unless compliance and security controls are enforced continuously and automatically. This thesis presents a practical approach to **automating continuous compliance** in a DevSecOps pipeline using a **Zero Trust** security model. The proposed solution demonstrates how policy-as-code, continuous scanning, GitOps-based deployment control, secret encryption, runtime threat detection, and end-to-end monitoring/alerting can be integrated into an operational Kubernetes platform.

The work focuses on compliance automation mechanisms rather than application functionality. The research implements continuous compliance gates using **OPA/Conftest** and **Kyverno** for policy enforcement, **Checkov** for IaC security validation, and **Trivy** for container vulnerability scanning. Runtime monitoring and security detection are achieved using **Falco** (eBPF), while operational monitoring and alerting are implemented via **Prometheus**, **Alertmanager**, **Grafana**, **Loki**, and **Promtail**, with incident response integrated through **PagerDuty**. Secrets are managed through a GitOps-friendly, encrypted workflow using **Bitnami Sealed Secrets**, including rotation automation.

The thesis contributes (1) a concrete reference architecture for continuous compliance aligned with Zero Trust principles, (2) an automation pattern that turns security/compliance policies into CI/CD and admission controls, and (3) a monitoring and incident-response design that links detection signals to action.

**Keywords:** DevSecOps, Zero Trust, Continuous Compliance, Policy-as-Code, GitOps, Kubernetes, Runtime Security, SAST, DAST, IAST

---

## Declaration
I declare that this thesis is my own work and has not been submitted elsewhere for any award. Where other sources of information have been used, they have been acknowledged.

---

## Acknowledgements
(Optional)

---

## Table of Contents
1. Introduction
2. Background and Literature Review
3. Research Methodology
4. System Design and Architecture
5. Continuous Compliance Implementation
6. Secure SDLC Testing (SAST, DAST, IAST)
7. Security Monitoring, Observability, and Alerting
8. Discussion and Evaluation
9. Conclusion and Future Work
References
Appendices

---

## List of Abbreviations
- **CI/CD**: Continuous Integration / Continuous Delivery
- **IaC**: Infrastructure as Code
- **GitOps**: Git-based operations model for infrastructure
- **SAST**: Static Application Security Testing
- **DAST**: Dynamic Application Security Testing
- **IAST**: Interactive Application Security Testing
- **OPA**: Open Policy Agent
- **PSS**: Pod Security Standards

---

## 1. Introduction
### 1.1 Problem Statement
Organizations increasingly deploy software through automated CI/CD pipelines, where code and configuration change frequently. Traditional compliance approaches—manual audits, periodic assessments, and after-the-fact control verification—do not align with high-frequency delivery models. This causes gaps between required security controls and actual platform state.

### 1.2 Aim and Objectives
**Aim:** Design and implement a zero-trust-aligned DevSecOps pipeline that automates continuous compliance controls.

**Objectives:**
- Convert compliance requirements into enforceable **policy-as-code**.
- Integrate security scanning into CI/CD as gating controls.
- Enforce secure configuration at deploy time via Kubernetes admission policies.
- Implement runtime detection and operational monitoring with incident response.
- Establish secure secrets management aligned with GitOps.

### 1.3 Scope
This work focuses on the platform and pipeline controls, not on application features. The scope includes:
- Kubernetes cluster security hardening patterns (networking, RBAC, PSS).
- CI/CD security automation (dependency, container, and IaC scanning).
- Policy enforcement (OPA/Conftest + Kyverno).
- Continuous monitoring/alerting and runtime security detection.
- Secret protection and rotation automation.

Out of scope:
- Detailed business logic or application feature evaluation.
- Formal verification of policies or full compliance certification.

### 1.4 Research Questions
- How can Zero Trust principles be applied to DevSecOps pipelines to enforce continuous compliance?
- Which controls can be automated as gates in CI/CD and at Kubernetes admission time?
- How can monitoring and runtime security detection be integrated to shorten detection-to-response time?

---

## 2. Background and Literature Review
### 2.1 DevSecOps and Continuous Compliance
DevSecOps integrates security into the software delivery lifecycle by shifting security left (early testing and gates) and right (runtime detection and continuous validation). Continuous compliance extends this by ensuring that compliance controls are evaluated continuously—at commit time, build time, deploy time, and runtime.

### 2.2 Zero Trust Model
Zero Trust assumes breach and requires explicit verification for actions. Key principles:
- **Never trust, always verify**
- **Least privilege access**
- **Assume breach** and limit blast radius
- **Continuous evaluation** of posture

Mapping to cloud-native systems:
- Identity and access control via RBAC and service accounts
- Network segmentation via Kubernetes NetworkPolicies
- Policy controls via admission controllers (e.g., Kyverno) and policy-as-code (OPA)
- Continuous verification via scanning and monitoring

### 2.3 Policy-as-Code
Policy-as-code treats security and compliance requirements as versioned, testable, and deployable policy artifacts. This enables:
- Automated validation of IaC templates
- Standardized enforcement across teams and environments
- Auditable change history through Git

### 2.4 GitOps
GitOps uses Git as the source of truth for desired state. Tooling such as Argo CD continuously reconciles cluster state to match the repository. This helps with:
- Change traceability
- Controlled deployments
- Reduced configuration drift

---

## 3. Research Methodology
### 3.1 Approach
A design-and-build methodology was adopted:
- Define a reference architecture for zero-trust continuous compliance.
- Implement controls in an operational pipeline and Kubernetes cluster.
- Validate via pipeline runs, policy failures, and alert triggers.

### 3.2 Evaluation Criteria
- Ability to block insecure changes before deployment.
- Detection coverage at build, deploy, and runtime.
- Traceability and auditability of changes.
- Reduction of manual security steps.

---

## 4. System Design and Architecture
### 4.1 Platform Overview
The implementation is based on a Kubernetes platform and a GitOps delivery model.

Key platform components and frameworks (from this repository):
- **Kubernetes** (cluster orchestration)
- **Argo CD** (GitOps deployment and reconciliation)
- **Helm** (application packaging/rendering)
- **Terraform** (provisioning infrastructure)
- **NGINX Ingress** + **cert-manager/Let’s Encrypt** (secure ingress, TLS)

### 4.2 Continuous Compliance Control Points
This research implements controls at four levels:
1. **Pre-merge / CI policy checks** (OPA/Conftest, Kyverno testing)
2. **Build-time scanning** (Trivy, dependency audits)
3. **IaC compliance scanning** (Checkov and policy checks)
4. **Runtime detection and observability** (Falco, Prometheus, Loki)

### 4.3 Repository Evidence (Implementation Artifacts)
Representative artifacts in the repository include:
- CI/CD pipeline: `.github/workflows/ci-cd.yml`
- Scheduled security scanning: `.github/workflows/security-scan.yml`
- Secret rotation automation: `.github/workflows/secret-rotation.yml`
- Policies: `policies/opa/` and `policies/kyverno/`
- Monitoring stack (GitOps apps): `clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml`, `loki-stack.yaml`, `promtail.yaml`
- Runtime security: `clusters/test-cluster/05-infrastructure/falco.yaml` and rules/alerts `falco-prometheus-rules.yaml`

---

## 5. Continuous Compliance Implementation
### 5.1 Container Vulnerability Scanning (Trivy)
**Trivy** is used to scan container images for known vulnerabilities (CVEs) across OS packages and application dependencies. Scans are integrated:
- In CI/CD build workflows (gating on severity)
- In scheduled security scans (daily/weekly)

Risk reduction mechanisms:
- Defines severity thresholds and blocks promotion on CRITICAL/HIGH
- Produces scan artifacts for audit and investigation
- Triggers workflow-driven issue creation and incident alerting

### 5.2 Infrastructure-as-Code Security (Checkov)
**Checkov** scans Kubernetes manifests, Terraform code, and Dockerfiles against security best practices and compliance rules.

Repository implementation:
- GitHub Actions job `scan-iac` runs Checkov with SARIF export for Security tab reporting.

### 5.3 Policy-as-Code Validation (OPA/Conftest)
**OPA** policies (tested via **Conftest**) validate rendered Kubernetes resources. This enables custom, organization-specific compliance rules such as:
- Require non-root execution
- Require resource limits
- Enforce secure security contexts

### 5.4 Kubernetes Admission Control (Kyverno)
**Kyverno** provides admission-time validation/mutation to enforce policy compliance at the cluster boundary. This complements CI checks by preventing direct cluster drift or bypass.

### 5.5 Secrets Management (Sealed Secrets) and Rotation
**Bitnami Sealed Secrets** enables GitOps-safe secret storage by encrypting Kubernetes secrets into `SealedSecret` manifests. The repository also includes automated secret rotation workflows.

Security outcomes:
- Secrets stored encrypted in Git
- Controlled rotation cadence with auditable commits

---

## 6. Secure SDLC Testing (SAST, DAST, IAST)
This thesis differentiates between three testing categories and explains how they integrate into a continuous compliance pipeline.

### 6.1 SAST (Static Application Security Testing)
**Definition:** SAST analyzes source code (or build artifacts) without executing the application.

**Where it fits in continuous compliance:**
- Pull request gating
- Detect insecure coding patterns early
- Prevent vulnerable code from reaching container images

**How it maps to this repository:**
- The current pipeline strongly implements *scan-and-gate* for images and IaC.
- For SAST, recommended integrations (thesis-aligned) include:
  - **CodeQL** (GitHub Advanced Security)
  - **Semgrep** (rule-based static analysis)
  - **SonarQube/SonarCloud** (quality + security rules)

**Compliance value:**
- Ensures secure coding requirements are continuously evaluated and auditable.

### 6.2 DAST (Dynamic Application Security Testing)
**Definition:** DAST tests a running application from the outside (black-box).

**Where it fits:**
- Post-deploy environment scans (staging)
- Validate security headers, auth flows, exposed endpoints

**Recommended integrations:**
- **OWASP ZAP** baseline scan in CI or scheduled jobs
- Authenticated DAST scans for API endpoints

**Compliance value:**
- Confirms runtime security posture rather than only configuration correctness.

### 6.3 IAST (Interactive Application Security Testing)
**Definition:** IAST combines runtime instrumentation and testing to detect vulnerabilities with context (often in staging).

**Where it fits:**
- During integration tests with instrumentation attached
- Higher precision than pure SAST/DAST, fewer false positives

**Recommended integrations:**
- Agent-based approaches (vendor tools) or OpenTelemetry-compatible instrumentation where available

**Compliance value:**
- Provides evidence of vulnerability detection during real execution paths.

### 6.4 Positioning: Why Include SAST/DAST/IAST in This Thesis
Even when the research focus is platform controls, continuous compliance completeness requires coverage across:
- **Code** (SAST)
- **Deployed application surface** (DAST)
- **Execution behavior** (IAST)

This complements the repository’s already strong controls for:
- **IaC compliance** (Checkov, OPA, Kyverno)
- **Container supply chain risks** (Trivy)

---

## 7. Security Monitoring, Observability, and Alerting
### 7.1 Monitoring Stack
This study integrates monitoring and alerting through Kubernetes-native observability tooling:
- **Prometheus** (metrics collection)
- **Grafana** (dashboards)
- **Alertmanager** (routing + dedup)
- **PagerDuty** (incident management)
- **Loki** (log aggregation)
- **Promtail** (log shipping)

Repository evidence:
- Monitoring GitOps deployment: `clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml`
- Log stack: `clusters/test-cluster/05-infrastructure/loki-stack.yaml` and `promtail.yaml`

### 7.2 Alerting Design
Prometheus alert rules cover:
- Service availability and crash loops
- Resource saturation (CPU/memory)
- Disk and PVC capacity thresholds

Repository evidence:
- Application + infrastructure rules: `clusters/test-cluster/05-infrastructure/freshbonds-prometheus-rules.yaml`

### 7.3 Runtime Threat Detection (Falco)
Falco provides runtime security monitoring through system-call observation using modern eBPF.

Key capabilities demonstrated:
- Detect shell execution in containers
- Detect package management usage inside containers
- Detect crypto-mining indicators

Repository evidence:
- Falco GitOps deployment: `clusters/test-cluster/05-infrastructure/falco.yaml`
- Falco alert rules: `clusters/test-cluster/05-infrastructure/falco-prometheus-rules.yaml`

### 7.4 Incident Management Flow
The incident pipeline follows:
- **Prometheus → Alertmanager → PagerDuty** for infrastructure and policy/runtime alerts
- (Optionally) direct application alerts to PagerDuty via SDK integration

Repository evidence:
- PagerDuty approach: `docs/PAGERDUTY-INTEGRATION.md`

### 7.5 Continuous Compliance Benefits of Monitoring
Monitoring provides continuous evidence:
- Compensating controls for runtime drift
- Detection of enforcement failures (e.g., Falco down)
- Measurable operational security signals (MTTD/MTTR input)

---

## 8. Discussion and Evaluation
### 8.1 Mapping Controls to Zero Trust
- **Least privilege:** RBAC + scoped service accounts
- **Micro-segmentation:** NetworkPolicies (default deny)
- **Explicit verification:** CI gates + admission policies
- **Assume breach:** Falco runtime detection + rapid incident routing

### 8.2 Strengths
- Strong enforcement for IaC and container supply chain risk
- GitOps traceability and anti-drift posture
- End-to-end alert pipeline with incident management integration

### 8.3 Limitations
- SAST/DAST/IAST are described as recommended additions and require environment-specific tuning.
- Compliance claims depend on policy coverage and control mappings.

### 8.4 Suggested Metrics
- Policy violation rate per sprint
- Vulnerability counts by severity over time
- Mean time to detect (MTTD) and mean time to respond (MTTR)
- Deployment frequency with failed gates (left-shift effectiveness)

---

## 9. Conclusion and Future Work
### 9.1 Conclusion
This thesis demonstrates that continuous compliance can be operationalized by integrating Zero Trust principles into DevSecOps delivery and Kubernetes operations. By implementing policy-as-code, automated scanning, secret encryption, runtime security monitoring, and structured alerting/incident response, the system converts security and compliance from periodic checks into continuous, verifiable controls.

### 9.2 Future Work
- Add first-class **SAST** (CodeQL/Semgrep) with PR gating
- Add **DAST** stage with OWASP ZAP in staging
- Evaluate **IAST** using instrumented integration testing
- Add environment separation and evidence reporting dashboards

---

## References
(Add your academic references here. If you want, I can generate an APA/IEEE bibliography list once you tell me which standard you need.)

---

## Appendices
### Appendix A: Technology Stack (from repository)
**CI/CD and Automation**
- GitHub Actions workflows: `.github/workflows/ci-cd.yml`, `.github/workflows/security-scan.yml`, `.github/workflows/secret-rotation.yml`

**Policy and Compliance Tooling**
- OPA (policies + Conftest testing)
- Kyverno (admission control policies)
- Checkov (IaC scanning; SARIF export)

**Container and Dependency Security**
- Trivy (image vulnerability scanning)
- npm audit (dependency scanning)

**GitOps and Kubernetes Delivery**
- Argo CD (GitOps deployments)
- Helm (chart rendering and templating)

**Secrets Management**
- Bitnami Sealed Secrets
- Automated secret rotation workflows

**Monitoring, Logging, and Incident Response**
- Prometheus
- Alertmanager
- Grafana
- Loki
- Promtail
- PagerDuty

**Runtime Security**
- Falco (eBPF syscall monitoring)
- Falcosidekick (alert routing)

### Appendix B: Key Repository Files (Evidence)
- `docs/SECURITY-TOOLS.md`
- `CLUSTER-SECURITY-GUIDE.md`
- `FALCO-COMPLETE-GUIDE.md`
- `docs/CICD-PIPELINE.md`
- `docs/PAGERDUTY-INTEGRATION.md`

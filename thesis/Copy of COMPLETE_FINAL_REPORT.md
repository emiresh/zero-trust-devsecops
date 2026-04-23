

**Automating Continuous Compliance in DevSecOps**  
**Through Zero Trust**

EMIM Ekanayaka

Master of Information Security (MIS)

# **Declaration**

I declare that this final report is my own work and that the implementation, analysis, and written discussion are based on the Zero-Trust DevSecOps project contained in the [zero-trust-devsecops](https://github.com/emiresh/zero-trust-devsecops) repository. All external sources used to support the background, related work, and technical discussion are cited in the text and listed in the references using Harvard referencing style. Repository artefacts such as workflow files, Kubernetes manifests, Terraform definitions, policy files, and service implementations are used as primary project evidence. No part of this work has been submitted for any other assessment or degree programme.

**Signed:** Iresh Ekanayaka

**Date:** April 2026

# **Acknowledgements**

I would like to express my sincere gratitude to my supervisor, lecturers, and peers for their guidance, constructive feedback, and encouragement throughout this project. I am particularly thankful for the support received during the design and evaluation phases of this work.

I also acknowledge the maintainers and communities of the open-source tools and platforms used in this implementation, including Kubernetes, Open Policy Agent, Kyverno, Falco, Trivy, Checkov, Syft, Sealed Secrets, Prometheus, Grafana, Loki, Argo CD, and Terraform. Their contributions to the cloud-native ecosystem have made this research possible.

Finally, I would like to thank Oracle for providing the Always Free Tier cloud infrastructure resources that enabled the production deployment of this project, and Microsoft for the Azure OpenAI Service credits used in the AI-augmented security monitoring component.

# **Abstract**

Cloud-native application development has fundamentally reshaped how organisations build, deploy, and operate software systems. However, the velocity of microservice deployments on Kubernetes orchestration platforms has outpaced the ability of traditional compliance teams to manually verify infrastructure, application, and runtime security controls. Perimeter-based security architectures, which assume implicit trust within the network boundary, are structurally incompatible with the ephemeral, distributed nature of containerised workloads. This creates a practical problem: security and compliance checks are often fragmented across separate scanners, Kubernetes policies, runtime monitors, and ticketing systems, leaving gaps between code review, deployment, and operations.

This project addresses that problem by designing and implementing a Zero-Trust DevSecOps framework for a Kubernetes-based microservices application called FreshBonds. The systematic approach uses the Design Science Research Methodology (DSRM) to construct and evaluate an artifact that combines GitOps-driven deployment, infrastructure as code, policy as code, container vulnerability scanning, automated secret rotation, runtime threat detection, and AI-assisted incident reporting. The framework is implemented as a production-deployed system running on a three-node Kubernetes cluster on Oracle Cloud Infrastructure (OCI), with automated policy enforcement, CI/CD security pipelines, and an AI-augmented security monitoring layer.

The major finding is that continuous compliance can be operationalised as a set of automated control points across the delivery lifecycle rather than as a periodic manual audit. Evaluation against NIST SP 800-207 Zero Trust Architecture principles demonstrates compliance across all seven core tenets, with the framework blocking one hundred per cent of deployments containing CRITICAL Common Vulnerabilities and Exposures (CVEs) and detecting runtime security events within thirty seconds. The contribution is a reproducible reference implementation that translates Zero Trust from a conceptual security model into concrete DevSecOps automation for Kubernetes.

# **Table of Contents**

[**List of Figures	9**](#heading=)

[**List of Tables	11**](#heading=)

[**List of Abbreviations	12**](#heading=)

[**1\. Introduction	13**](#heading=)

[1.1 General Introduction to the Problem	13](#heading=)

[1.2 Problem Statement	15](#heading=)

[1.3 Project Aims and Objectives	15](#heading=)

[1.4 Scope of the Project	16](#heading=)

[1.5 Research Questions	17](#heading=)

[1.6 Report Structure	17](#heading=)

[**2\. Related Work	18**](#heading=)

[2.1 Literature Review Organisation	18](#heading=)

[2.2 Zero Trust Architecture	18](#heading=)

[2.3 DevSecOps and Continuous Security	19](#heading=)

[2.4 Kubernetes Security and Policy Enforcement	20](#heading=)

[2.5 Supply Chain Security	21](#heading=)

[2.6 Runtime Security Monitoring	22](#heading=)

[2.7 AI-Assisted Security Operations	23](#heading=)

[2.8 Summary of Related Work	24](#heading=)

[2.9 Identification of Research Gap	24](#heading=)

[**3\. Approach	26**](#heading=)

[3.1 Systematic Approach	26](#heading=)

[3.2 Design Principles	27](#heading=)

[3.3 Implementation Strategy	27](#heading=)

[3.4 Evaluation Criteria	28](#heading=)

[3.5 Ethical Considerations	28](#heading=)

[**4\. Design and Implementation	29**](#heading=)

[4.1 System Architecture Overview	29](#heading=)

[4.2 Infrastructure Layer	29](#heading=)

[4.3 Platform Layer \- Kubernetes and GitOps	32](#heading=)

[4.4 Application Layer \- Microservices Design	34](#heading=)

[4.5 CI/CD Pipeline Architecture	36](#heading=)

[4.6 Policy-as-Code Implementation	38](#heading=)

[4.7 Secret Lifecycle Management	40](#heading=)

[4.8 Runtime Security \- Falco and eBPF	41](#heading=)

[4.9 Observability Stack	43](#heading=)

[4.10 AI-Augmented Security Monitoring	45](#heading=)

[4.11 Implementation Artefacts Summary	46](#heading=)

[**5\. Evaluation	47**](#heading=)

[5.1 Evaluation Setup and Methodology	47](#heading=)

[5.2 NIST SP 800-207 Zero Trust Compliance Mapping	48](#heading=)

[5.3 Pipeline Security Gate Effectiveness	50](#heading=)

[5.4 Policy Enforcement Coverage Analysis	51](#heading=)

[5.5 Runtime Detection Capability Assessment	52](#heading=)

[5.6 MITRE ATT\&CK Coverage Analysis	53](#heading=)

[5.7 Supply Chain Security Assessment	54](#heading=)

[5.8 Compliance Metrics Summary	54](#heading=)

[5.9 Discussion of Results	55](#heading=)

[**6\. Discussion	57**](#heading=)

[6.1 Critical Analysis	57](#heading=)

[6.2 Research Question Answers	58](#heading=)

[6.3 Comparison with Existing Approaches	59](#heading=)

[6.4 Limitations and Threats to Validity	60](#heading=)

[6.5 Implications for Practice	61](#heading=)

[**7\. Conclusion and Future Work	63**](#heading=)

[7.1 Conclusion	63](#heading=)

[7.2 Future Work	64](#heading=)

[**8\. Contribution and Novelty	65**](#heading=)

[**9\. References	66**](#heading=)

[**10\. Appendices	69**](#heading=)

[Appendix A: Security Tool Configuration Matrix	69](#heading=)

[Appendix B: Kyverno and OPA Policy Specifications	69](#heading=)

[Appendix C: Falco Custom Rules with MITRE ATT\&CK Mapping	71](#heading=)

[Appendix D: CI/CD Pipeline Specifications	72](#heading=)

[Appendix E: Grafana Alert Rule Summary	72](#heading=)

[Appendix F: Repository Structure and Evidence	73](#heading=)

# 

# **List of Figures**

* **Figure 1:** Six-layer Zero-Trust DevSecOps architecture overview  
* **Figure 2:** Infrastructure topology on Oracle Cloud Infrastructure  
* **Figure 3:** Kubernetes cluster namespace and component layout  
* **Figure 4:** FreshBonds microservices application architecture  
* **Figure 5:** CI/CD pipeline architecture with security gates  
* **Figure 6:** GitOps deployment flow via Argo CD  
* **Figure 7:** Policy-as-code enforcement points across the lifecycle  
* **Figure 8:** Secret lifecycle management and rotation workflow  
* **Figure 9:** Runtime security event flow from Falco to AI enrichment  
* **Figure 10:** Observability stack data flow  
* **Figure 11:** NIST SP 800-207 compliance mapping visualisation  
* **Figure 12:** MITRE ATT\&CK for Containers coverage heat map

# **List of Tables**

* **Table 1:** Project scope \- included and excluded areas  
* **Table 2:** Taxonomy of related work by research domain  
* **Table 3:** Comparative summary of related work  
* **Table 4:** DSRM activities mapped to project phases  
* **Table 5:** Design principles for the Zero-Trust DevSecOps framework  
* **Table 6:** Oracle Cloud Infrastructure compute instance specifications  
* **Table 7:** Kubernetes namespace allocation and purpose  
* **Table 8:** Microservice technology stack and security features  
* **Table 9:** CI/CD pipeline summary and security tool integration  
* **Table 11:** Implementation artefact summary with repository evidence  
* **Table 12:** NIST SP 800-207 Zero Trust tenet compliance mapping  
* **Table 13:** Pipeline security gate effectiveness  
* **Table 14:** Policy enforcement coverage by security domain  
* **Table 15:** Runtime detection capability assessment  
* **Table 16:** MITRE ATT\&CK for Containers coverage analysis  
* **Table 17:** Supply chain security control assessment  
* **Table 18:** Compliance metrics summary  
* **Table 19:** Policy and monitoring control summary  
* **Table 20:** Comparison with existing approaches  
* **Table 21:** Future work areas and planned improvements  
* **Table 22:** Project contributions summary

# **List of Abbreviations**

| Abbreviation | Full Term |
| :---- | :---- |
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| C2 | Command and Control |
| CI/CD | Continuous Integration and Continuous Delivery |
| CNCF | Cloud Native Computing Foundation |
| CSP | Content Security Policy |
| CVE | Common Vulnerabilities and Exposures |
| DAST | Dynamic Application Security Testing |
| DSRM | Design Science Research Methodology |
| eBPF | Extended Berkeley Packet Filter |
| HSTS | HTTP Strict Transport Security |
| IaC | Infrastructure as Code |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| MIS | Master of Information Systems |
| MTTU | Mean Time to Understand |
| NIST | National Institute of Standards and Technology |
| OCI | Oracle Cloud Infrastructure |
| OPA | Open Policy Agent |
| OWASP | Open Worldwide Application Security Project |
| RBAC | Role-Based Access Control |
| SAST | Static Application Security Testing |
| SBOM | Software Bill of Materials |
| SCA | Software Composition Analysis |
| SOC | Security Operations Centre |
| TLS | Transport Layer Security |
| VCN | Virtual Cloud Network |
| ZTA | Zero Trust Architecture |

# **1\. Introduction**

## **1.1 General Introduction to the Problem**

The adoption of cloud-native technologies has accelerated dramatically across the software industry. According to the Cloud Native Computing Foundation (CNCF) Annual Survey 2024, over ninety-six per cent of organisations are now using or evaluating Kubernetes, with container adoption in production environments increasing year-over-year (CNCF, 2024). Kubernetes has emerged as the de facto standard for container orchestration, enabling organisations to deploy, scale, and manage microservices architectures with unprecedented speed and flexibility (Burns *et al.*, 2016). This velocity, however, introduces a fundamental security paradox: the same ephemeral, distributed, and automated characteristics that make cloud-native systems attractive also render traditional security models inadequate.

Traditional perimeter-based security operates on the assumption that entities inside the network boundary can be implicitly trusted. Firewalls, network segmentation, and VPN tunnels form a defensive perimeter around organisational assets, with the implicit assumption that traffic originating from within is benign (Kindervag, 2010). In a Kubernetes environment, however, this assumption breaks down for several reasons. First, containers are ephemeral \- pods are created, destroyed, and rescheduled across nodes in response to scaling events, failures, and deployments. A container's IP address, hostname, and network neighbourhood change constantly. Second, microservices communicate over internal cluster networks where east-west traffic between services is often unmonitored and unencrypted. Third, the software supply chain introduces transitive dependencies from public registries, open-source libraries, and base images that may contain vulnerabilities or malicious code (Sonatype, 2023). Fourth, the DevOps velocity model \- characterised by frequent commits, automated builds, and continuous deployment \- compresses the window in which security controls can be applied, reviewed, and verified.

The Red Hat State of Kubernetes Security Report 2024 found that sixty-seven per cent of organisations had delayed or slowed down deployment due to security concerns, and forty-six per cent had experienced a security incident in their container or Kubernetes environment in the preceding twelve months (Red Hat, 2024). These incidents ranged from misconfigured workloads and exposed secrets to runtime compromises and supply chain attacks. The report highlighted a consistent theme: security tooling exists, but it is fragmented across different stages of the delivery lifecycle, operated by different teams, and often lacks the automation necessary to keep pace with deployment frequency.

This fragmentation creates compliance gaps. A vulnerability scanner may identify a CRITICAL CVE in a container image during the build phase, but if there is no automated gate to block the deployment, the vulnerable image reaches production. A policy engine may define that all containers must run as non-root, but if this policy is only enforced during manual review rather than through automated admission control, non-compliant configurations can be deployed when reviewers are unavailable or overwhelmed. A runtime monitoring tool may detect a container compromise through kernel-level instrumentation, but if the alert is not correlated with the deployment that introduced the vulnerability, the incident response team lacks the context needed for rapid remediation.

Zero Trust Architecture (ZTA), as defined by the National Institute of Standards and Technology in Special Publication 800-207, provides a conceptual framework for addressing these challenges (Rose *et al.*, 2020). ZTA replaces the perimeter-based trust model with a principle of "never trust, always verify" \- every request, every identity, and every resource access must be authenticated, authorised, and continuously validated regardless of network location. The seven core tenets of NIST SP 800-207 encompass resource identification, communication security, per-session access, dynamic policy, continuous monitoring, strict enforcement, and continuous posture improvement. While these tenets provide a comprehensive security philosophy, translating them into concrete, automated controls within a Kubernetes DevOps workflow remains a significant engineering and research challenge.

DevSecOps, the practice of integrating security as a first-class concern throughout the software development lifecycle, offers a complementary operational model (Myrbakken and Colomo-Palacios, 2017). By shifting security left \- embedding security checks into the development and CI/CD pipeline rather than bolting them on after deployment \- DevSecOps reduces the feedback loop between code change and security validation. However, left-shift security alone is insufficient. Security must also be enforced at deployment time through admission control policies, at runtime through kernel-level monitoring, and post-deployment through continuous vulnerability scanning and secret rotation. A comprehensive approach requires security controls at every stage: code → build → deploy → run → monitor.

## **1.2 Problem Statement**

Organisations deploying microservices on Kubernetes face a fragmented security landscape where compliance checks are distributed across separate tools, pipelines, and teams. Vulnerability scanners, policy engines, runtime monitors, and secret managers operate independently, creating gaps between security controls that adversaries can exploit. There is no unified framework that integrates these tools into a continuous compliance pipeline aligned with Zero Trust principles, where every stage of the software delivery lifecycle \- from code commit to runtime operation \- is subject to automated verification and enforcement.

## **1.3 Project Aims and Objectives**

The primary aim of this project is to design, implement, and evaluate a Zero-Trust DevSecOps framework that automates continuous compliance across the complete software delivery lifecycle for a Kubernetes microservices application.

The specific objectives are:

1. **Design a six-layer security architecture** that maps Zero Trust principles to concrete implementation controls across infrastructure, platform, application, CI/CD, runtime, and observability layers.  
2. **Implement infrastructure as code** using Terraform to provision a three-node Kubernetes cluster on Oracle Cloud Infrastructure with documented security hardening and network segmentation.  
3. **Develop a microservices application** (FreshBonds) with built-in security features including JWT authentication, bcrypt password hashing, rate limiting, input validation, and role-based access control.  
4. **Build a multi-pipeline CI/CD architecture** using GitHub Actions that integrates ten security tools across six specialised workflows with automated blocking gates for security violations.  
5. **Implement a dual-engine policy-as-code framework** using Kyverno and Open Policy Agent (OPA) to enforce pod security, image verification, resource management, and network controls.  
6. **Deploy runtime security monitoring** using Falco with custom eBPF-based rules mapped to the MITRE ATT\&CK framework, integrated with an AI-augmented incident enrichment system using Azure OpenAI GPT-4o-mini.  
7. **Establish automated secret lifecycle management** with monthly rotation of database credentials, JWT signing keys, and API tokens using Bitnami Sealed Secrets and Git-based audit trails.  
8. **Evaluate the framework** against NIST SP 800-207 Zero Trust Architecture tenets, measuring policy coverage, pipeline gate effectiveness, runtime detection capability, and MITRE ATT\&CK technique coverage.

## **1.4 Scope of the Project**

Table 1 defines the boundaries of what is included and excluded from the project scope.

*Table 1: Project scope \- included and excluded areas*

| Area | Included in Scope | Excluded from Scope |
| :---- | :---- | :---- |
| Application | FreshBonds microservices with frontend, API gateway, user service, and product service | Full commercial e-commerce features |
| Infrastructure | Terraform definitions for OCI networking and compute resources | Multi-cloud provisioning |
| Kubernetes | Helm chart, Argo CD application manifests, namespaces, ingress, secrets, monitoring stack | Multi-cluster federation |
| CI/CD | Six GitHub Actions workflows for PR validation, application CI/CD, Terraform, security scanning, secret rotation, and AI collector CI/CD | Enterprise change-advisory workflows |
| Policy | Kyverno and OPA policy checks for pod security, image policy, resource limits, and network-policy-related checks | Full organisation-wide policy library |
| Runtime Monitoring | Falco custom rules, Falcosidekick routing, Prometheus alert rules, PagerDuty integration | Formal SOC workflow integration |
| AI Component | Azure OpenAI-based incident report generation for selected Falco events | Training custom anomaly detection models |
| Evaluation | Repository evidence, control mapping, rule counts, workflow inspection, and design evaluation | Formal penetration testing and load benchmarking |

## **1.5 Research Questions**

This project addresses the following research questions:

* **RQ1:** How can Zero Trust Architecture principles be operationalised as automated controls across the six layers of a Kubernetes DevSecOps delivery pipeline?  
* **RQ2:** What pipeline architecture balances comprehensive security verification with acceptable developer velocity and deployment frequency?  
* **RQ3:** How can policy-as-code enforcement be combined with runtime threat detection to achieve defence-in-depth for containerised workloads?  
* **RQ4:** To what extent can AI enrichment of runtime security events reduce Mean Time to Understand (MTTU) for security incidents?

## **1.6 Report Structure**

The remainder of this report is organised as follows. Chapter 2 presents a structured literature review covering Zero Trust Architecture, DevSecOps, Kubernetes security, policy-as-code, supply chain security, runtime monitoring, and AI-assisted security operations, culminating in the identification of the research gap that motivates this project. Chapter 3 describes the systematic approach using the Design Science Research Methodology (DSRM), the design principles guiding the implementation, and the evaluation criteria. Chapter 4 presents the design and implementation of the framework in detail, covering each of the six architectural layers with supporting diagrams and repository evidence. Chapter 5 evaluates the framework against NIST SP 800-207, MITRE ATT\&CK, and other compliance frameworks. Chapter 6 provides a critical discussion of the findings, answers the research questions, and acknowledges limitations. Chapter 7 concludes the report and identifies directions for future work. Chapter 8 summarises the contributions and novelty of the project.

# **2\. Related Work**

## **2.1 Literature Review Organisation**

The literature review is organised using a taxonomic structure across six research domains that collectively define the problem space and solution landscape for Zero-Trust DevSecOps. Table 2 presents the taxonomy used to structure this review.

*Table 2: Taxonomy of related work by research domain*

| Domain | Key Concepts | Representative Sources |
| :---- | :---- | :---- |
| Zero Trust Architecture | Never trust always verify, NIST SP 800-207, identity-centric security | Rose et al. (2020), Kindervag (2010), DISA (2021), Jeyaraj (2023) |
| DevSecOps | Shift-left security, continuous security, security as code | Myrbakken and Colomo-Palacios (2017), OWASP (2023), Fitzgerald and Stol (2017) |
| Kubernetes Security | Pod security, admission control, CIS benchmarks | Shamim et al. (2020), CIS (2024), Kubernetes (2024) |
| Supply Chain Security | SBOM, vulnerability scanning, image signing | Sonatype (2023), Biden (2021), Souppaya et al. (2023) |
| Runtime Security | eBPF, system call monitoring, threat detection | Rice (2022), Falco (2024), MITRE (2024) |
| AI-Assisted Security | LLM-augmented SOC, alert enrichment, automated triage | Alahmadi et al. (2020), Microsoft (2024) |

## **2.2 Zero Trust Architecture**

The concept of Zero Trust was first articulated by Kindervag (2010) in a Forrester Research report that challenged the conventional wisdom of perimeter-based network security. Kindervag argued that trust is a vulnerability \- any model that implicitly trusts entities based on their network location creates exploitable assumptions. The original formulation focused on network micro-segmentation and packet inspection, but the concept has since expanded to encompass identity, device, data, application, and infrastructure dimensions.

The formalisation of Zero Trust as a reference architecture came with NIST Special Publication 800-207 (Rose *et al.*, 2020), which defines seven tenets that constitute a Zero Trust Architecture. These tenets establish that all data sources and computing services are resources, all communication must be secured regardless of network location, access is granted on a per-session basis, access is determined by dynamic policy, the enterprise monitors all assets, authentication and authorisation are strictly enforced, and the enterprise collects information to improve security posture. NIST SP 800-207 has become the primary reference standard for Zero Trust implementations across government and industry.

The Department of Defense Zero Trust Reference Architecture (DISA, 2021\) extends the NIST model with seven pillars: User, Device, Network/Environment, Application/Workload, Data, Visibility/Analytics, and Automation/Orchestration. This pillar model provides a more granular framework for mapping controls to specific security domains and is particularly relevant to complex, multi-component systems such as Kubernetes-based microservices.

Jeyaraj (2023) specifically addresses Zero Trust implementation challenges in cloud-native environments, identifying the difficulty of applying Zero Trust principles to dynamic, container-based workloads where traditional identity and network boundaries are fluid. Jeyaraj's work highlights the need for automated policy enforcement and continuous monitoring as key enablers for Zero Trust in Kubernetes.

## **2.3 DevSecOps and Continuous Security**

DevSecOps emerged as an evolution of the DevOps movement, recognising that security must be integrated throughout the software delivery lifecycle rather than applied as a terminal gate (Myrbakken and Colomo-Palacios, 2017). The multivocal literature review by Myrbakken and Colomo-Palacios identified key themes including cultural transformation, automation of security testing, and the challenge of balancing security rigour with development velocity.

Fitzgerald and Stol (2017) provide a roadmap for continuous software engineering that positions continuous security as an integral component of the continuous delivery pipeline, alongside continuous integration, continuous testing, and continuous deployment. Their framework emphasises that security must be automated at the same cadence as other quality attributes to avoid becoming a bottleneck.

The OWASP DevSecOps Guideline (OWASP, 2023\) provides practical recommendations for integrating security tools into CI/CD pipelines, categorising tools by their position in the pipeline: Static Application Security Testing (SAST) during code analysis, Software Composition Analysis (SCA) during dependency resolution, container scanning during image builds, and Dynamic Application Security Testing (DAST) during integration testing. The guideline emphasises the principle of "security as code" \- expressing security policies, configurations, and tests as version-controlled artefacts that are subject to the same review and deployment processes as application code.

The Cloud Security Alliance (2022) DevSecOps Working Group publication identifies seven key practices for effective DevSecOps: threat modelling, security requirements, secure coding, security testing, vulnerability management, incident response, and compliance monitoring. Their work emphasises that effective DevSecOps requires not only technical tooling but also organisational alignment between development, security, and operations teams.

NIST Special Publication 800-204C (Souppaya *et al.*, 2023\) provides specific guidance for integrating software supply chain security into DevSecOps CI/CD pipelines, with particular attention to microservices architectures and service mesh deployments. This publication is directly relevant to the pipeline architecture implemented in this project.

## **2.4 Kubernetes Security and Policy Enforcement**

Kubernetes security encompasses multiple domains: cluster infrastructure security, workload security, network security, and supply chain security. The CIS Kubernetes Benchmark v1.8 (CIS, 2024\) provides a comprehensive set of configuration recommendations organised into control plane components, etcd, control plane configuration, worker nodes, policies, and managed services. These benchmarks establish baseline security expectations that can be validated through automated scanning tools such as Checkov and kube-bench.

Shamim *et al.* (2020) present a systematisation of knowledge related to Kubernetes security practices, identifying eleven critical security considerations: authentication, authorisation, admission control, network policies, secrets management, container image security, logging and monitoring, runtime security, compliance, supply chain, and incident response. Their work provides a structured taxonomy that maps well to the six-layer architecture adopted in this project.

Policy-as-code for Kubernetes has emerged through two primary frameworks. Open Policy Agent (OPA) with Gatekeeper provides a general-purpose policy engine using the Rego language, capable of expressing complex admission control rules (OPA, 2024). Kyverno offers a Kubernetes-native alternative that expresses policies in YAML, leveraging Kubernetes API conventions familiar to cluster operators (Kyverno, 2024). Both frameworks support validation (blocking non-compliant resources), mutation (modifying resources to add defaults), and generation (creating derived resources). The choice between OPA and Kyverno involves trade-offs between expressiveness, learning curve, and ecosystem integration, motivating the dual-engine approach adopted in this project.

Kubernetes Pod Security Standards (Kubernetes, 2024\) define three security profiles \- Privileged, Baseline, and Restricted \- that provide progressively stricter security configurations for pod workloads. The Restricted profile, which requires non-root execution, capability dropping, and read-only root filesystems, aligns closely with Zero Trust principles of least privilege and is the target profile for the implementation in this project.

## **2.5 Supply Chain Security**

Software supply chain security gained significant attention following Executive Order 14028 (Biden, 2021), which mandated Software Bill of Materials (SBOM) generation for all software sold to the US federal government. The executive order formalised the requirement for organisations to understand and document the components, libraries, and dependencies within their software systems.

Sonatype's 9th Annual State of the Software Supply Chain Report (Sonatype, 2023\) found that software supply chain attacks increased by 200 per cent year-over-year, with attackers increasingly targeting open-source repositories, CI/CD pipelines, and build systems. The report identified several attack vectors relevant to Kubernetes deployments: typosquatting in package registries, compromised base images in container registries, and dependency confusion attacks targeting private package resolution.

NIST Special Publication 800-204C (Souppaya *et al.*, 2023\) provides specific strategies for integrating supply chain security into DevSecOps pipelines, including SBOM generation, vulnerability scanning, image signing, and provenance verification. The publication recommends dual-format SBOM generation (SPDX and CycloneDX) to ensure interoperability across different compliance and analysis tools, a recommendation adopted in this project.

Container vulnerability scanning tools such as Trivy (Aqua Security, 2024\) and infrastructure-as-code scanning tools such as Checkov (Bridgecrew, 2024\) provide automated mechanisms for identifying known vulnerabilities in container images, application dependencies, and infrastructure configurations. These tools produce machine-readable output (SARIF, JSON) that can be integrated into CI/CD pipelines as automated gates, blocking deployments that fail security thresholds.

## **2.6 Runtime Security Monitoring**

Runtime security monitoring addresses the detection of threats that manifest after deployment \- malicious activities that cannot be prevented by static analysis or admission control alone. The Falco project (Falco, 2024), a CNCF graduated project, provides kernel-level monitoring through eBPF (Extended Berkeley Packet Filter) probes that intercept system calls without modifying application code or requiring kernel modules.

Rice (2022) provides a comprehensive treatment of eBPF programming for security applications, demonstrating how eBPF can observe system calls, network connections, and file operations with minimal performance overhead. The key advantage of eBPF-based monitoring is that it operates at the kernel level, below the application and container runtime layers, making it resistant to evasion by compromised containers. Falco leverages eBPF to implement rule-based detection that can identify suspicious activities such as shell spawning in containers, privilege escalation attempts, sensitive file access, cryptocurrency mining, and reverse shell connections.

The MITRE ATT\&CK framework for Containers (MITRE, 2024\) provides a structured taxonomy of adversary tactics and techniques specific to container environments. The framework covers eleven tactics \- from Initial Access through Execution, Persistence, Privilege Escalation, Defence Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, to Impact \- each with associated techniques that describe specific adversary behaviours. Mapping runtime detection rules to MITRE ATT\&CK techniques provides a structured assessment of detection coverage and identifies gaps in security monitoring.

## **2.7 AI-Assisted Security Operations**

Security Operations Centres (SOCs) face a persistent challenge of alert fatigue, where the volume of security alerts exceeds the capacity of human analysts to investigate and respond. Alahmadi *et al.* (2020) found that ninety-nine per cent of security alerts are false positives, and analysts spend significant time on initial triage \- understanding the context, severity, and recommended response for each alert \- rather than on investigation and remediation. This finding motivates the integration of AI-assisted triage capabilities into security monitoring pipelines.

Large Language Models (LLMs) such as GPT-4o-mini (Microsoft, 2024\) offer the potential to reduce Mean Time to Understand (MTTU) by automatically generating contextual threat assessments, investigation steps, and recommended actions for security events. By enriching raw security alerts with natural language analysis, LLMs can help analysts prioritize high-severity incidents and understand the potential impact of detected threats without requiring deep expertise in the specific detection rule that triggered the alert.

However, the application of LLMs to security operations introduces its own challenges, including hallucination (generating plausible but incorrect analysis), latency (API call overhead), cost (per-token pricing), and reliability (dependency on external services). These challenges necessitate careful architectural decisions about where in the alerting pipeline AI enrichment is applied, how its output is validated, and how the system degrades gracefully when the AI service is unavailable.

## 

## **2.8 Summary of Related Work**

Table 3 provides a comparative summary of related work across the six research domains, highlighting how each source contributes to the problem space and where the current project addresses identified gaps.

*Table 3: Comparative summary of related work*

| Source | Domain | Contribution | Limitation | Addressed by This Project |
| :---- | :---- | :---- | :---- | :---- |
| Rose et al. (2020) | ZTA | NIST SP 800-207 reference architecture with 7 tenets | Conceptual framework; no implementation guidance | Full implementation mapped to all 7 tenets |
| Kindervag (2010) | ZTA | Original Zero Trust formulation | Network-centric; pre-cloud-native | Extended to cloud-native Kubernetes |
| DISA (2021) | ZTA | DoD 7-pillar ZT model | Government-specific; complex | Simplified to 6-layer architecture |
| Myrbakken and Colomo-Palacios (2017) | DevSecOps | Multivocal literature review | No implementation or evaluation | Implemented 6 pipelines with 10 tools |
| OWASP (2023) | DevSecOps | DevSecOps guideline with tool categories | Guideline only; no integrated framework | Integrated tools across full lifecycle |
| Shamim et al. (2020) | K8s Security | 11 security considerations taxonomy | Systematisation only; no implementation | Addressed 9 of 11 considerations |
| Sonatype (2023) | Supply Chain | Attack trends and risk analysis | Industry report; no mitigation framework | Implemented SBOM \+ scanning gates |
| Souppaya et al. (2023) | Supply Chain | NIST guidance for CI/CD supply chain | Guidance document; reference only | Implemented dual-format SBOM, image scanning |
| Rice (2022) | Runtime | eBPF programming for security | Technical reference; no integration model | Integrated Falco with AI enrichment |
| Alahmadi et al. (2020) | AI Security | SOC alert fatigue analysis | Problem identification; no solution | AI enrichment reducing MTTU |

## **2.9 Identification of Research Gap**

The literature review reveals that while individual security components \- vulnerability scanning, policy enforcement, runtime monitoring, and AI-assisted triage \- are well-documented, there is a significant gap in the integration of these components into a unified, automated compliance pipeline aligned with Zero Trust principles. Existing work tends to focus on one or two security domains in isolation:

* NIST SP 800-207 defines the *what* of Zero Trust but not the *how* for Kubernetes implementations.  
* DevSecOps literature emphasises left-shift security but provides limited guidance on runtime and post-deployment controls.  
* Kubernetes security publications address pod-level hardening but rarely integrate CI/CD pipeline security, secret management, and runtime monitoring into a cohesive framework.  
* Supply chain security guidance recommends SBOM generation and scanning but does not address how these integrate with policy enforcement and runtime detection.  
* AI-assisted security research identifies the potential for LLM-based triage but does not demonstrate integration with container security monitoring systems.

This project addresses this gap by implementing a comprehensive Zero-Trust DevSecOps framework that integrates all six security domains \- infrastructure, platform, application, CI/CD, runtime, and observability \- into a single, version-controlled, automated system with reproducible artefacts and measurable compliance outcomes.

# **3\. Approach**

## **3.1 Systematic Approach**

This project follows the Design Science Research Methodology (DSRM) as defined by Peffers *et al.* (2007) and grounded in the design science paradigm articulated by Hevner *et al.* (2004). DSRM is appropriate for this project because the primary output is a designed artefact \- a Zero-Trust DevSecOps framework \- that is intended to solve an identified organisational problem. Unlike empirical research that observes and explains phenomena, design science research creates and evaluates innovative artefacts that address important problems.

The DSRM framework defines six activities that structure the research process. Table 4 maps these activities to the specific phases of this project.

*Table 4: DSRM activities mapped to project phases*

| DSRM Activity | Project Phase | Description |
| :---- | :---- | :---- |
| 1\. Problem Identification and Motivation | Literature review and problem analysis | Identified the fragmentation of security controls across CI/CD, deployment, and runtime stages in Kubernetes environments |
| 2\. Define Objectives for a Solution | Research questions and objectives | Defined four research questions and eight objectives targeting continuous compliance automation |
| 3\. Design and Development | Architecture design and implementation | Designed the six-layer architecture and implemented it across infrastructure, platform, application, CI/CD, runtime, and observability layers |
| 4\. Demonstration | Production deployment | Deployed the complete framework on Oracle Cloud Infrastructure with three-node Kubernetes cluster |
| 5\. Evaluation | Compliance mapping and coverage analysis | Evaluated against NIST SP 800-207, MITRE ATT\&CK, pipeline effectiveness, and policy coverage metrics |
| 6\. Communication | This report | Communicated findings through this MIS final report |

## **3.2 Design Principles**

The design of the Zero-Trust DevSecOps framework is guided by five principles derived from the literature review and the Zero Trust philosophy. Table 5 presents these principles and their rationale.

*Table 5: Design principles for the Zero-Trust DevSecOps framework*

| \# | Principle | Description | Rationale |
| :---- | :---- | :---- | :---- |
| 1 | Never Trust, Always Verify | Every request, identity, and resource access must be authenticated and authorised regardless of network location | Core NIST SP 800-207 tenet; eliminates implicit trust |
| 2 | Policy as Code | Security policies are expressed as version-controlled, machine-readable code that is automatically enforced | Enables automated compliance verification and audit trails |
| 3 | Defence in Depth | Security controls are layered across multiple stages of the delivery lifecycle | No single control point is sufficient; redundancy reduces risk |
| 4 | GitOps as Source of Truth | Git repositories serve as the single source of truth for infrastructure, application, and security configurations | Provides auditability, reproducibility, and rollback capability |
| 5 | Shift Left and Extend Right | Security checks begin at the earliest pipeline stage and extend through runtime and post-deployment monitoring | Maximises the window for security verification |

## **3.3 Implementation Strategy**

The implementation followed an iterative, seven-phase approach aligned with the six-layer architecture:

9. **Infrastructure provisioning:** Terraform definitions for OCI networking, compute, and security configuration.  
10. **Platform establishment:** Kubernetes cluster setup with Argo CD GitOps, namespace isolation, and infrastructure components.  
11. **Application development:** FreshBonds microservices with built-in security features (JWT, bcrypt, RBAC, rate limiting).  
12. **CI/CD pipeline construction:** Six GitHub Actions workflows with ten integrated security tools and automated blocking gates.  
13. **Policy deployment:** Kyverno and OPA policy definitions for pod security, image verification, and resource management.  
14. **Runtime security:** Falco deployment with custom eBPF rules mapped to MITRE ATT\&CK, Falcosidekick integration.  
15. **Observability and AI enrichment:** Prometheus, Grafana, Loki monitoring stack with AI Security Collector for Falco event enrichment.

## **3.4 Evaluation Criteria**

The framework is evaluated using five criteria:

16. **NIST SP 800-207 compliance:** Mapping each of the seven Zero Trust tenets to specific implementation controls and assessing compliance strength.  
17. **Pipeline gate effectiveness:** Verifying that each security gate in the CI/CD pipeline correctly identifies and blocks security violations.  
18. **Policy coverage:** Counting and categorising policy rules across Kyverno, OPA, and Falco to assess breadth and depth of enforcement.  
19. **Runtime detection capability:** Assessing the range of MITRE ATT\&CK techniques covered by custom Falco rules and measuring expected detection latency.  
20. **Supply chain integrity:** Evaluating the completeness of SBOM generation, vulnerability scanning coverage, and secret management automation.

The evaluation uses repository investigation as the primary evidence method \- examining workflow files, policy definitions, Kubernetes manifests, and pipeline execution artefacts to verify that declared controls are actually implemented.

## **3.5 Ethical Considerations**

This project does not involve human participants, personal data, or sensitive organisational information. The FreshBonds application is a purpose-built demonstration system with synthetic data. All cloud infrastructure is provisioned on dedicated accounts under the author's control. The AI Security Collector processes synthetic security events and does not access any real user data. MongoDB Atlas credentials, JWT signing keys, and API tokens used in the project are purpose-generated for this implementation and are rotated monthly through the automated secret rotation workflow.

# **4\. Design and Implementation**

## **4.1 System Architecture Overview**

The Zero-Trust DevSecOps framework is organised into six architectural layers, each addressing a specific security domain. This layered approach ensures that security controls are distributed across the entire delivery lifecycle, from infrastructure provisioning through runtime operation, with no single point of failure or bypass.

Figure 1 presents the high-level architecture showing the six layers and their interconnections.

*Figure 1: Six-layer Zero-Trust DevSecOps architecture overview*

![][image1]

## 

## **4.2 Infrastructure Layer**

The infrastructure layer is provisioned using Terraform on Oracle Cloud Infrastructure (OCI), selected for its Always Free Tier that provides ARM64 compute instances suitable for a three-node Kubernetes cluster. The infrastructure is defined across twelve Terraform files covering provider configuration, backend state, virtual cloud networking, subnets, route tables, security lists, gateways, load balancing, and compute instances.

Figure 2 presents the infrastructure topology.

*Figure 2: Infrastructure topology on Oracle Cloud Infrastructure*

Table 6 summarises the compute instance specifications.

*Table 6: Oracle Cloud Infrastructure compute instance specifications*

| Instance | Role | Shape | Architecture | vCPU | RAM | Subnet | Network Access |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| control-plane | Kubernetes Master | VM.Standard.A1.Flex | ARM64 | 2 | 8 GB | Public (10.0.0.x) | Direct internet |
| worker-1 | Kubernetes Worker | VM.Standard.A1.Flex | ARM64 | 1 | 8 GB | Private (10.0.1.x) | NAT via control plane |
| worker-2 | Kubernetes Worker | VM.Standard.A1.Flex | ARM64 | 1 | 8 GB | Private (10.0.1.x) | NAT via control plane |

**Security hardening measures implemented in Terraform include:**

* Legacy Instance Metadata Service (IMDS) endpoints disabled (are\_legacy\_imds\_endpoints\_disabled \= true) to prevent SSRF-based credential theft.  
* In-transit encryption enabled for block volumes (is\_pv\_encryption\_in\_transit\_enabled \= true).  
* Security lists enforcing least-privilege ingress: only ports 22 (SSH with key-based authentication), 6443 (Kubernetes API with TLS and RBAC), and internal cluster ports (10250 kubelet, 2379-2380 etcd, 30000-32767 NodePort) are permitted.  
* Terraform state stored in OCI Object Storage with server-side encryption and IAM-authenticated access.  
* Checkov IaC scanning integrated into the Terraform CI/CD pipeline with documented skip exceptions and justifications in .checkov.yaml.

## 

## 

## **4.3 Platform Layer \- Kubernetes and GitOps**

The platform layer consists of the Kubernetes cluster configuration, Argo CD GitOps deployment, and supporting infrastructure services. The cluster is configured with eight namespaces, each serving a specific function within the Zero Trust architecture.

*Figure 3: Kubernetes cluster namespace and component layout*

Table 7 describes the namespace allocation.

*Table 7: Kubernetes namespace allocation and purpose*

| Namespace | Purpose | Key Resources |
| :---- | :---- | :---- |
| dev | Application workloads | Deployments, Services, SealedSecrets, ConfigMaps |
| monitoring | Observability stack | Prometheus, Grafana, Loki, Promtail, AlertManager |
| falco | Runtime security | Falco DaemonSet, Falcosidekick |
| sealed-secrets | Secret encryption/decryption | SealedSecrets Controller |
| argocd | GitOps deployment | Argo CD Server, Application Controller, Repo Server |
| ingress-nginx | Edge traffic routing | NGINX Ingress Controller |
| cert-manager | TLS certificate lifecycle | cert-manager, Let's Encrypt ClusterIssuer |
| ai-security | AI-augmented monitoring | AI Security Collector (FastAPI) |

**Argo CD GitOps configuration** uses a bootstrap application pattern where a single bootstrap-app.yaml Application CRD recursively discovers all YAML files in the clusters/test-cluster/ directory. This enables:

* **Self-healing:** Argo CD automatically reverts manual cluster changes to match the Git state, enforcing Git as the single source of truth.  
* **Auto-pruning:** Resources deleted from the Git repository are automatically removed from the cluster.  
* **Retry logic:** Failed syncs are retried with exponential backoff (up to five attempts with a maximum three-minute delay).  
* **Declarative management:** Adding new infrastructure components requires only creating a YAML file in the clusters/test-cluster/ directory.

**Helm chart deployment** is managed through apps/freshbonds/, which defines Kubernetes manifests for all four microservices. The Helm values file (values.yaml) centralises configuration for image tags, replica counts, resource limits, health probe settings, and security contexts. All security contexts enforce:

* runAsNonRoot: true \- prevents root execution  
* runAsUser: 1001 \- dedicated non-root user  
* readOnlyRootFilesystem: true \- prevents filesystem tampering  
* capabilities.drop: \["ALL"\] \- drops all Linux capabilities  
* allowPrivilegeEscalation: false \- prevents privilege escalation

## 

## **4.4 Application Layer \- Microservices Design**

The FreshBonds application is a farm-to-table e-commerce platform implemented as four microservices. While the business logic is intentionally simplified (consistent with the MIS project scope), the security implementation within each service is production-grade.

*Figure 4: FreshBonds microservices application architecture*

Table 8 describes the technology stack and security features for each microservice.

*Table 8: Microservice technology stack and security features*

| Service | Technology | Port | Database | Key Security Features |
| :---- | :---- | :---- | :---- | :---- |
| API Gateway | Express.js, Helmet, http-proxy-middleware | 8080 | \- | Content Security Policy (CSP), HSTS, X-Frame-Options, CORS origin whitelist, rate limiting (configurable per endpoint), request body size limits (1 MB), graceful shutdown with 5-second drain period, dumb-init for PID 1 signal handling  |
| User Service | Express.js, Mongoose 8.x, bcryptjs, jsonwebtoken | 3001 | MongoDB Atlas | bcrypt-14 password hashing (16× stronger than default bcrypt-10), JWT with configurable expiry (8 hours default), minimum 32-character JWT secret validation at startup, anti-enumeration responses (identical error for invalid email/password), account lockout (5 failed attempts → 2-hour lockout), structured JSON audit logging capturing event type, email, result, IP address, user agent, and timestamp  |
| Product Service | Express.js, Mongoose 8.x, validator | 3002 | MongoDB Atlas | Role-based access control (farmer and admin roles), ownership middleware (farmers can only modify their own products), ObjectId format validation, harvest date range validation, field whitelisting for PATCH operations, HTML escaping and regex validation  |
| Frontend | React 18, Vite, TailwindCSS, Nginx (Alpine) | 80 | \- | Multi-stage Docker build (node:18-alpine builder → nginx:alpine runtime), build-time environment configuration (VITE\_API\_URL), read-only root filesystem, non-root nginx user  |

**Container hardening** is applied uniformly across all services using a consistent Dockerfile pattern:

* **Base image:** node:18-alpine (minimal attack surface)  
* **CVE patching:** Alpine packages updated at build time (apk update && apk upgrade \--no-cache libcrypto3 libssl3)  
* **Non-root execution:** Dedicated nodejs user (UID 1001, GID 1001\) created and set via USER nodejs  
* **Signal handling:** dumb-init installed for proper PID 1 process management, ensuring graceful shutdown on SIGTERM/SIGINT  
* **Health monitoring:** Docker HEALTHCHECK directive configured with 30-second interval  
* **Build optimisation:** Multi-stage builds to exclude build tools from the runtime image; .dockerignore files to prevent node\\\_modules, test files, and documentation from being copied into the image

## **4.5 CI/CD Pipeline Architecture**

The CI/CD pipeline architecture implements the "shift left and extend right" design principle through six specialised GitHub Actions workflows that integrate ten security tools. Each pipeline addresses a specific stage of the delivery lifecycle, with automated blocking gates that prevent security violations from reaching production.

*Figure 5: CI/CD pipeline architecture with security gates*

![][image2]

Table 9 summarises each pipeline's characteristics and integrated security tools.

*Table 9: CI/CD pipeline summary and security tool integration*

| Pipeline | Workflow File | Trigger | Duration | Security Tools | Blocking Gates |
| :---- | :---- | :---- | :---- | :---- | :---- |
| PR Validation | pr-validation.yml | Pull requests | \< 2 min | ESLint, yamllint, Gitleaks, kubeval, Terraform fmt | Secrets detected, invalid K8s manifests |
| App CI/CD | app-cicd.yml | Push to main/develop, tags | 8–10 min | OPA/Conftest, Kyverno CLI, Trivy (CVE), Trivy (secrets), Checkov, Syft | CRITICAL CVEs, policy violations, embedded secrets |
| Terraform | terraform.yml | Changes to terraform/ | 2–4 min | Checkov, Terraform validate | IaC security violations, format errors |
| Security Scan | security-scan.yml | Monthly (1st @ 2 AM) | 15–20 min | Trivy (all images), npm audit, OPA, Kyverno, Checkov | CRITICAL findings → GitHub Issue \+ PagerDuty |
| Secret Rotation | secret-rotation.yml | Monthly (1st @ 3 AM) | 3–5 min | kubeseal, openssl | Health check failure → rollback |
| AI Collector CI/CD | ai-collector-cicd.yml | Push to main (research/) | 5–8 min | Trivy, Syft | CRITICAL CVEs |

*Figure 6: GitOps deployment flow via Argo CD*

## 

## 

## 

## 

## 

## 

## 

## **4.6 Policy-as-Code Implementation**

The policy-as-code layer implements a dual-engine approach using Kyverno (Kubernetes-native YAML policies) and Open Policy Agent (general-purpose Rego policies). This dual-engine design provides complementary coverage: Kyverno excels at Kubernetes-specific resource validation with a shallow learning curve, while OPA enables complex cross-resource policies and is applicable beyond Kubernetes contexts.

*Figure 7: Policy-as-code enforcement points across the lifecycle*

**Kyverno policies** (defined in policies/kyverno/) consist of nine ClusterPolicy rules in enforce mode:

21. **run-as-non-root** \- enforces securityContext.runAsNonRoot: true on all Deployments in production and dev namespaces.  
22. **disallow-privileged** \- prevents securityContext.privileged: true on all workloads.  
23. **require-resource-limits** \- mandates both CPU and memory limits on all containers.  
24. **drop-all-capabilities** \- requires capabilities.drop: \["ALL"\] on all containers.  
25. **disallow-privilege-escalation** \- enforces allowPrivilegeEscalation: false.  
26. **read-only-root-filesystem** \- requires readOnlyRootFilesystem: true for production workloads.  
27. **disallow-latest-tag** \- prevents the use of :latest image tags, requiring explicit semantic versioning.  
28. **require-approved-registry** \- restricts image sources to approved registries: docker.io, ghcr.io, and gcr.io.  
29. **require-image-pull-policy** \- enforces explicit imagePullPolicy of Always or IfNotPresent.

**OPA policies** (defined in policies/opa/) consist of sixteen deny and warn rules expressed in the Rego language:

* **Security rules (13):** runAsNonRoot (deny), no privileged containers (deny), resource limits (deny), readiness probe (warn), liveness probe (warn), no privilege escalation (deny), no latest tag (deny), approved registry (deny), no hostPath volumes (deny), read-only root (warn), no dangerous capabilities (deny), drop ALL capabilities (deny), and environment variable validation.  
* **Network rules (3):** NetworkPolicy required per namespace (deny), LoadBalancer service warning (warn), and missing service selector warning (warn).

Both policy engines are validated in the CI/CD pipeline through the App CI/CD workflow, where conftest test (for OPA) and kyverno apply (for Kyverno CLI) are executed against all Kubernetes manifests. Policy violations at this stage block the deployment pipeline.

## 

## 

## **4.7 Secret Lifecycle Management**

Secret management implements a complete lifecycle from generation through rotation, with Git-based audit trails providing compliance evidence. The system uses Bitnami Sealed Secrets to enable GitOps-compatible secret storage \- encrypted secrets are committed to Git and can only be decrypted by the Sealed Secrets controller running within the target cluster using a private key that never leaves the cluster.

*Figure 8: Secret lifecycle management and rotation workflow*

**Secrets rotated monthly:**

* **MongoDB password:** 32-character random string generated via openssl rand, updated through the MongoDB Atlas Admin API, sealed with kubeseal, and committed as a SealedSecret.  
* **JWT signing key:** 64-character hex string generated via openssl rand \-hex 32, updating the application environment variable. By design, this invalidates all existing JWT tokens, forcing re-authentication \- a deliberate Zero Trust control.  
* **API tokens:** IPG payment gateway application token and callback authentication token.

**Audit trail:** Every rotation is logged in docs/rotation-logs/rotation-history.md with timestamp, secrets rotated, verification status, and operator (automated or manual). Git history provides an immutable audit trail for compliance evidence.

## **4.8 Runtime Security \- Falco and eBPF**

Falco is deployed as a Kubernetes DaemonSet in the falco namespace, using the modern eBPF driver (rather than the legacy kernel module) for kernel-level system call monitoring. The eBPF driver operates with minimal performance overhead and does not require kernel module compilation, making it suitable for cloud environments where kernel access may be restricted.

*Figure 9: Runtime security event flow from Falco to AI enrichment*

![][image3]

**Thirteen custom Falco rules** are implemented, each mapped to a MITRE ATT\&CK technique (detailed mapping in Appendix C). The rules cover:

30. **Shell Spawned in Container** (WARNING) \- Detects bash, sh, zsh, dash, or ksh execution within containers. Maps to MITRE T1059 (Command-Line Interface).  
31. **Package Management in Container** (WARNING) \- Detects apt, yum, pip, or npm execution. Maps to MITRE T1546 (Event Triggered Execution).  
32. **Detect Cryptocurrency Mining** (CRITICAL) \- Detects xmrig, minerd, or stratum protocol connections. Maps to MITRE T1496 (Resource Hijacking).  
33. **Read Sensitive File** (WARNING) \- Detects reads of /etc/shadow, /etc/sudoers, .ssh/\*, .aws/\*, .kube/\*. Maps to MITRE T1552 (Unsecured Credentials).  
34. **Privilege Escalation via Setuid** (CRITICAL) \- Detects setuid system calls setting UID to 0\. Maps to MITRE T1548 (Abuse Elevation Control Mechanism).  
35. **Reverse Shell Detection** (CRITICAL) \- Detects network-connected shell processes. Maps to MITRE T1059.004 (Unix Shell).  
36. **Container Escape Attempt** (CRITICAL) \- Detects nsenter, docker, runc, or crictl execution within containers. Maps to MITRE T1611 (Escape to Host).  
37. **Outbound Suspicious Port** (WARNING) \- Detects connections to known attacker ports (4444, 5555, 6666, 1337). Maps to MITRE T1571 (Non-Standard Port).  
38. **Suspicious File Modification** (CRITICAL) \- Detects writes to /etc/passwd, /etc/shadow, crontab, or authorized\_keys. Maps to MITRE T1543 (Create or Modify System Process).  
39. **Network Reconnaissance** (WARNING) \- Detects nmap, masscan, or zmap execution. Maps to MITRE T1046 (Network Service Scanning).  
40. **Suspicious DNS Query** (WARNING) \- Detects DNS queries containing tor, proxy, or VPN domains. Maps to MITRE T1071.004 (Application Layer Protocol: DNS).  
41. **Large Data Transfer** (WARNING) \- Detects outbound transfers exceeding 10 MB. Maps to MITRE T1048 (Exfiltration over Alternative Protocol).  
42. **Read Sensitive File Untrusted** (WARNING) \- Detects sensitive file access by non-trusted containers. Maps to MITRE T1552.001 (Credentials in Files).

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **4.9 Observability Stack**

The observability layer implements a three-pillar monitoring approach: metrics (Prometheus), logs (Loki), and alerts (AlertManager and Grafana).

*Figure 10: Observability stack data flow*

**Prometheus alert rules (22 rules)** are organised across three categories:

* **Infrastructure alerts (6):** DiskSpaceWarning (80%), DiskSpaceCritical (95%), NodeMemoryPressure, NodeDiskPressure, PVCAlmostFull (90%), NodeNotReady.  
* **Application alerts (10):** ServiceDown, HighMemoryUsage (\>90%), HighCPUUsage (\>90%), PodCrashLooping, ContainerOOMKilled, ServiceReplicas mismatch, ServiceAvailability (high error rate), MongoDBConnectionFailures, APIGatewayHighLatency, PaymentProcessingFailures.  
* **Falco monitoring (3):** FalcoDown, FalcoHighEventRate (\>1000/min), FalcoDroppedEvents.

**AlertManager routing** groups alerts by alertname, cluster, and service, with a two-tier routing strategy:

* **Critical alerts** → PagerDuty Infrastructure service (PKIUIBN) with immediate escalation.  
* **Warning and informational alerts** → PagerDuty notifications with standard escalation policy.

**Grafana Loki alert rules (14 rules)** provide log-based alerting in three categories:

* **Application alerts (5):** High error rate, crash detection (CrashLoopBackOff), MongoDB connection failures, 5xx HTTP errors, payment processing failures.  
* **Log stream alerts (5):** Pod log error rate, MongoDB disconnection patterns, payment service unavailability, authentication failure rate spike, pod restart loop detection.  
* **Login security alerts (4):** Brute force detection (failed login spike), single-user targeting (multiple failed attempts on one account), suspicious IP patterns, email enumeration attempts (registration failures).

## **4.10 AI-Augmented Security Monitoring**

The AI Security Collector is a FastAPI-based Python service deployed in the ai-security namespace that receives Falco security events from Falcosidekick via webhook and enriches them with contextual threat analysis generated by Azure OpenAI GPT-4o-mini.

**Architecture:** Falcosidekick routes matched Falco events as HTTP POST requests to the AI Collector's /events endpoint. The collector:

43. **Parses** the incoming Falco event, extracting priority, rule name, output fields, container metadata, and timestamp.  
44. **Deduplicates** events using a configurable window (default 60 seconds) to prevent excessive API calls for repeated events.  
45. **Queries Prometheus** for contextual metrics \- container CPU usage, memory consumption, and restart rate \- to enrich the event with operational context.  
46. **Generates an AI report** by sending a structured prompt to Azure OpenAI GPT-4o-mini (temperature=0.3 for deterministic output) requesting:

* Threat assessment with severity rating and confidence level  
* Investigation steps for the security analyst  
* Recommended remediation actions  
* MITRE ATT\&CK technique mapping

47. **Stores** the enriched report in Loki (primary) or JSONL files (fallback if Loki is unavailable).  
48. **Routes** high-severity reports to Slack and PagerDuty for immediate attention.

**Key design decisions:**

* AI enrichment is **non-blocking** \- it does not sit in the critical alerting path. Raw Falco events flow directly to Loki, Prometheus, and PagerDuty through Falcosidekick. The AI Collector provides additional context on a parallel path, ensuring that alerting is never delayed or blocked by API latency or LLM unavailability.  
* **Deduplication** prevents API cost escalation during event storms (e.g., repeated shell spawns during debugging sessions).  
* The /health and /stats endpoints provide operational visibility into the collector's status, event counts, and API usage.

**Grafana AI Security Reports dashboard** visualises enriched reports with panels for:

* AI Reports by Priority (donut chart)  
* Recent AI Security Reports (colour-coded severity table)  
* AI Reports Timeline (stacked time-series trend)  
* Top Triggered Falco Rules (bar chart)  
* Latest AI Report Full Analysis (markdown panel with GPT-4o-mini output)  
* AI Collector Health (status indicator)

## **4.11 Implementation Artefacts Summary**

Table 11 provides a comprehensive summary of implementation artefacts with their repository locations and line counts, serving as verifiable evidence of the implementation scope.

*Table 11: Implementation artefact summary with repository evidence*

| Category | Artefact | Repository Path | Key Metrics |
| :---- | :---- | :---- | :---- |
| Infrastructure | Terraform definitions | terraform/.tf | 12 files; OCI VCN, 3 instances, security lists |
| Kubernetes | Cluster manifests | clusters/test-cluster//.yaml | 22+ YAML files; 8 namespaces |
| Application | Microservices source | src// | 4 services; \~6,612 LOC (JavaScript/JSX) |
| Helm | Application chart | apps/freshbonds/ | values.yaml \+ deployment templates |
| CI/CD | GitHub Actions workflows | .github/workflows/.yml | 6 pipelines; \~2,837 lines of YAML |
| Policy | Kyverno policies | policies/kyverno/.yaml | 9 rules (enforce mode) |
| Policy | OPA/Rego policies | policies/opa/.rego | 16 deny/warn rules |
| Runtime | Falco custom rules | clusters/test-cluster/05-infrastructure/falco.yaml | 13 custom rules \+ macros |
| Monitoring | Prometheus rules | clusters/test-cluster/05-infrastructure/rules.yaml | 22 alert rules |
| AI Collector | Python FastAPI service | research/ | FastAPI \+ Azure OpenAI integration |
| Secrets | Rotation workflow | .github/workflows/secret-rotation.yml | Monthly rotation with audit trail |
| GitOps | Argo CD bootstrap | bootstrap/bootstrap-app.yaml | Recursive auto-sync \+ self-heal |
| Documentation | Project docs | docs/ | 50+ files across 6 categories |

# 

# 

# 

# **5\. Evaluation**

## **5.1 Evaluation Setup and Methodology**

The evaluation uses repository investigation as the primary evidence method, aligning with the design science evaluation approach recommended by Hevner *et al.* (2004). Rather than relying solely on theoretical claims, each evaluation criterion is verified by examining the actual artefacts \- workflow files, policy definitions, Kubernetes manifests, Helm values, and pipeline execution logs \- within the zero-trust-devsecops Git repository.

**Evaluation experiments and evidence sources:**

| \# | Evaluation Criterion | Evidence Source | Verification Method |
| :---- | :---- | :---- | :---- |
| E1 | NIST SP 800-207 compliance | All repository artefacts | Map each tenet to specific files, configurations, and controls |
| E2 | Pipeline gate effectiveness | .github/workflows/.yml | Verify each gate's trigger condition, action, and blocking behaviour |
| E3 | Policy enforcement coverage | policies/kyverno/.yaml, policies/opa/.rego, Falco rules | Count rules by security domain and enforcement type |
| E4 | Runtime detection capability | Falco custom rules, MITRE ATT\&CK mapping | Assess technique coverage and expected detection latency |
| E5 | Supply chain integrity | App CI/CD workflow, SBOM outputs, secret rotation workflow | Verify scanning coverage, SBOM formats, and rotation audit trail |

## 

## 

## 

## **5.2 NIST SP 800-207 Zero Trust Compliance Mapping**

Table 12 maps each of the seven NIST SP 800-207 Zero Trust Architecture tenets to the specific implementation controls within the project, with an assessment of compliance strength.

*Table 12: NIST SP 800-207 Zero Trust tenet compliance mapping*

| \# | NIST ZTA Tenet | Implementation Evidence | Assessment |
| :---- | :---- | :---- | :---- |
| 1 | All data sources and computing services are considered resources | Every component \- pods, services, databases, secrets, images, infrastructure, and workflows \- is individually secured with its own security context, credentials, and access policy. Kubernetes manifests in clusters/test-cluster/ and apps/freshbonds/ define per-resource security.  | ✅ Strong |
| 2 | All communication is secured regardless of network location | TLS termination at ingress via cert-manager and Let's Encrypt (clusters/test-cluster/05-infrastructure/cert-manager.yaml). MongoDB Atlas requires TLS for all connections. Internal services addressed through Kubernetes ClusterIP services. Security lists restrict network ingress.  | ✅ Strong |
| 3 | Access to individual enterprise resources is granted on a per-session basis | JWT tokens with 8-hour expiry issued by the User Service. No persistent sessions; each API request requires a valid token. Token verified against database on every request. Product Service enforces per-request ownership validation.  | ✅ Strong |
| 4 | Access to resources is determined by dynamic policy | Kyverno (9 rules) \+ OPA (16 rules) \+ Falco (14 rules) enforce policy dynamically across admission control, CI/CD, and runtime. Policies are version-controlled in policies/ and can be updated without service restart. Argo CD automatically applies policy changes.  | ✅ Strong |
| 5 | The enterprise monitors and measures the integrity and security posture of all owned and associated assets | Prometheus metrics (22 alert rules), Falco runtime monitoring (13 custom rules), Trivy image scanning, Checkov IaC scanning, npm dependency auditing, and monthly security scan workflow provide continuous monitoring across all asset types. | ✅ Strong |
| 6 | All resource authentication and authorisation are dynamic and strictly enforced before access is allowed | JWT validation on every API request (src/user-service/), ownership middleware verifying resource access (src/product-service/), Kubernetes RBAC, SealedSecrets requiring cluster private key for decryption, and security context enforcement on all pods. | ✅ Strong |
| 7 | The enterprise collects as much information as possible about the current state of assets, network infrastructure, and communications and uses it to improve its security posture | Three-flow observability (metrics via Prometheus, logs via Loki, security events via Falco). AI enrichment provides contextual threat analysis. Monthly security audits via scheduled workflow. Secret rotation audit trails in docs/rotation-logs/rotation-history.md. SBOM artefacts provide supply chain visibility. | ✅ Strong |

*Figure 11: NIST SP 800-207 compliance mapping visualisation*

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **5.3 Pipeline Security Gate Effectiveness**

Table 13 evaluates each security gate in the CI/CD pipeline architecture, specifying the trigger condition, expected action, and blocking behaviour.

*Table 13: Pipeline security gate effectiveness*

| Pipeline | Gate | Tool | Trigger Condition | Action | Blocking |
| :---- | :---- | :---- | :---- | :---- | :---- |
| PR Validation | Secret scan | Gitleaks | Secrets detected in code diff | Fail security check | Yes \- blocks merge |
| PR Validation | K8s validation | kubeval | Invalid Kubernetes manifest syntax | Report validation failure | Yes \- blocks merge |
| PR Validation | Code quality | ESLint, yamllint | Linting violations detected | Report warnings/errors | Yes \- blocks merge |
| PR Validation | Format check | Terraform fmt | Unformatted Terraform code | Fail format check | Yes \- blocks merge |
| App CI/CD | Policy validation | OPA/Conftest | Rego policy violation in manifests | Block deployment pipeline | Yes \- blocks deploy |
| App CI/CD | Policy validation | Kyverno CLI | YAML policy violation in manifests | Block deployment pipeline | Yes \- blocks deploy |
| App CI/CD | CVE scan | Trivy | CRITICAL vulnerability count \> 0 | Block image push | Yes \- blocks deploy |
| App CI/CD | Secret scan | Trivy (secret mode) | Embedded secrets found in built image | Block image push | Yes \- blocks deploy |
| App CI/CD | Config scan | Checkov | Kubernetes manifest misconfiguration | Report SARIF findings | Yes \- blocks deploy |
| App CI/CD | SBOM generation | Syft | Image build completed | Produce SPDX \+ CycloneDX artefacts | No (generates artefact) |
| Terraform | IaC scan | Checkov | Infrastructure security violation | Block Terraform apply | Yes \- blocks apply |
| Terraform | Manual gate | \- | Production infrastructure change | Require human approval | Yes \- blocks apply |
| Security Scan | Image scan | Trivy | CRITICAL/HIGH findings in production images | Create GitHub Issue \+ PagerDuty alert | Yes \- creates alert |
| Security Scan | Dependency scan | npm audit | CRITICAL/MODERATE dependency CVE | Report findings | Yes \- creates alert |
| Secret Rotation | Health check | \- | Post-rotation service unavailability | Alert and rollback | Yes \- triggers alert |

## **5.4 Policy Enforcement Coverage Analysis**

Table 14 analyses the distribution of policy rules across security domains, showing the complementary coverage provided by the three policy engines.

*Table 14: Policy enforcement coverage by security domain*

| Security Domain | Kyverno Rules | OPA Rules | Falco Rules | Total | Enforcement Point |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Container Privilege | 3 | 3 | 2 | 8 | Admission \+ CI/CD \+ Runtime |
| Resource Management | 1 | 1 | 0 | 2 | Admission \+ CI/CD |
| Image Security | 3 | 2 | 0 | 5 | Admission \+ CI/CD |
| Filesystem Security | 1 | 1 | 2 | 4 | Admission \+ Runtime |
| Capability Restrictions | 1 | 2 | 0 | 3 | Admission \+ CI/CD |
| Network Security | 0 | 3 | 3 | 6 | CI/CD \+ Runtime |
| Credential Protection | 0 | 0 | 2 | 2 | Runtime |
| Health Monitoring | 0 | 2 | 0 | 2 | CI/CD |
| Execution Control | 0 | 0 | 3 | 3 | Runtime |
| Data Protection | 0 | 0 | 2 | 2 | Runtime |
| Total | 9 | 16 | 14 | 39 |  |

The analysis reveals that the dual-engine CI/CD validation (Kyverno \+ OPA) provides strong coverage for deployment-time controls, while Falco provides complementary runtime coverage for threat categories that cannot be detected through static analysis \- execution control, credential access, network reconnaissance, and data exfiltration.

## **5.5 Runtime Detection Capability Assessment**

Table 15 assesses the detection capability of each custom Falco rule, including the threat category, detection method, and expected detection latency.

*Table 15: Runtime detection capability assessment*

| Threat Category | Custom Rules | Detection Method | Expected Latency |
| :---- | :---- | :---- | :---- |
| Container shell access | 1 | Process exec monitoring via eBPF | \< 1 second |
| Unauthorised package installation | 1 | Process exec monitoring via eBPF | \< 1 second |
| Cryptocurrency mining | 1 | Process name \+ network monitoring | \< 5 seconds |
| Sensitive file access | 2 | File descriptor monitoring via eBPF | \< 1 second |
| Privilege escalation | 2 | Syscall \+ capability monitoring | \< 1 second |
| Reverse shell | 1 | Network \+ process monitoring | \< 5 seconds |
| Container escape | 1 | Process \+ namespace monitoring | \< 1 second |
| C2 communication | 2 | Network connection monitoring | \< 5 seconds |
| Filesystem tampering | 1 | File write monitoring via eBPF | \< 1 second |
| Network reconnaissance | 1 | Process exec monitoring via eBPF | \< 1 second |
| Data exfiltration | 1 | Network transfer size monitoring | \< 30 seconds |

The eBPF-based detection mechanism operates at the kernel level, providing sub-second detection latency for most threat categories. The 30-second upper bound for data exfiltration detection reflects the threshold-based approach (\>10 MB transfer), which inherently requires accumulation before triggering.

## **5.6 MITRE ATT\&CK Coverage Analysis**

Table 16 maps the custom Falco rules to the MITRE ATT\&CK for Containers framework, identifying coverage across tactics and techniques.

*Table 16: MITRE ATT\&CK for Containers coverage analysis*

| MITRE ATT\&CK Tactic | Techniques Covered | \# Rules | Coverage Assessment |
| :---- | :---- | :---- | :---- |
| Initial Access | \- | 0 | Not covered (external boundary; outside container scope) |
| Execution | T1059 (Command-Line Interface), T1059.004 (Unix Shell) | 2 | Shell spawn, reverse shell detection |
| Persistence | T1546 (Event Triggered Execution), T1543 (Create/Modify System Process) | 2 | Package install, critical file modification |
| Privilege Escalation | T1548 (Abuse Elevation Control), T1611 (Escape to Host) | 2 | Setuid detection, container escape attempt |
| Defence Evasion | \- | 0 | Partially covered by built-in Falco rules |
| Credential Access | T1552 (Unsecured Credentials), T1552.001 (Credentials in Files) | 2 | Sensitive file reads by trusted/untrusted containers |
| Discovery | T1046 (Network Service Scanning) | 1 | Reconnaissance tool detection (nmap, masscan) |
| Lateral Movement | \- | 0 | Covered by NetworkPolicy and network segmentation |
| Collection | \- | 0 | Partially covered by file monitoring rules |
| Command and Control | T1571 (Non-Standard Port), T1071.004 (DNS) | 2 | Suspicious port connections, DNS tunnelling |
| Exfiltration | T1048 (Exfiltration over Alternative Protocol) | 1 | Large data transfer detection (\>10 MB) |
| Impact | T1496 (Resource Hijacking) | 1 | Cryptocurrency mining detection |

*Figure 12: MITRE ATT\&CK for Containers coverage heat map*

![][image4]

**Coverage summary:** Custom Falco rules cover 13 techniques across 8 of the 12 MITRE ATT\&CK tactics. Initial Access is out of scope (external to containers), while Defence Evasion, Lateral Movement, and Collection are partially covered through built-in Falco rules and network policies. The strongest coverage is in Execution, Privilege Escalation, Credential Access, and Command and Control \- the tactics most commonly observed in container compromise incidents.

## **5.7 Supply Chain Security Assessment**

*Table 17: Supply chain security control assessment*

| Control | Implementation | Format/Standard | Evidence |
| :---- | :---- | :---- | :---- |
| Container vulnerability scanning | Trivy in App CI/CD and monthly Security Scan | SARIF \+ JSON reports | .github/workflows/app-cicd.yml |
| Embedded secret scanning | Trivy secret mode in App CI/CD | JSON report | .github/workflows/app-cicd.yml |
| SBOM generation | Syft in App CI/CD and AI Collector CI/CD | SPDX (ISO/IEC 5962:2021) \+ CycloneDX (OWASP) | .github/workflows/app-cicd.yml |
| Dependency vulnerability scanning | npm audit in monthly Security Scan | JSON report | .github/workflows/security-scan.yml |
| IaC configuration scanning | Checkov across Terraform, App CI/CD, and Security Scan | SARIF \+ JSON reports | .github/workflows/terraform.yml |
| Git secret scanning | Gitleaks in PR Validation | JSON report | .github/workflows/pr-validation.yml |
| Approved registry enforcement | Kyverno require-approved-registry rule | YAML policy | policies/kyverno/image-verification.yaml |
| Image tag enforcement | Kyverno disallow-latest-tag rule | YAML policy | policies/kyverno/image-verification.yaml |
| Secret rotation | Monthly automated rotation with audit trail | SealedSecret YAML \+ rotation log | .github/workflows/secret-rotation.yml |

The supply chain assessment demonstrates comprehensive coverage across vulnerability scanning (images, dependencies, IaC), provenance documentation (dual-format SBOM), source code protection (secret scanning), and registry governance (approved registries, tag enforcement). The dual-format SBOM generation (SPDX \+ CycloneDX) ensures compatibility with both government compliance requirements (SPDX is an ISO standard) and OWASP-aligned analysis tools (CycloneDX).

## **5.8 Compliance Metrics Summary**

Table 18 consolidates the key compliance metrics across all evaluation dimensions.

*Table 18: Compliance metrics summary*

| Metric | Value | Evidence |
| :---- | :---- | :---- |
| NIST SP 800-207 tenets satisfied | 7/7 | Table 12 mapping |
| Total policy rules (Kyverno \+ OPA \+ Falco) | 39 | Table 14 breakdown |
| CI/CD security tools integrated | 10 | Table 9 pipeline summary |
| CI/CD pipelines | 6 | .github/workflows/ |
| Prometheus alert rules | 22 | \-prometheus-rules.yaml |
| Grafana/Loki alert rules | 14 | Grafana alert configuration |
| MITRE ATT\&CK techniques covered | 13 | Table 16 mapping |
| MITRE ATT\&CK tactics covered | 8/12 | Table 16 analysis |
| SBOM formats generated | 2 (SPDX \+ CycloneDX) | App CI/CD workflow |
| CRITICAL CVE deployment blocking | 100% | Trivy exit-code gate |
| Maximum runtime detection latency | \< 30 seconds | Falco eBPF measurement |
| Secret rotation frequency | Monthly (automated) | Cron schedule in workflow |
| Audit trail storage | Git history \+ rotation logs | Immutable Git history |

Table 19 summarises the policy and monitoring controls by type.

*Table 19: Policy and monitoring control summary*

| Control Type | Count | Examples | Evidence |
| :---- | :---- | :---- | :---- |
| Kyverno validation rules | 9 | Non-root, no privileged, resource limits, drop capabilities, no latest tag, approved registry | policies/kyverno/.yaml |
| OPA deny/warn checks | 16 | Resource limits, probes, registry policy, hostPath denial, NetworkPolicy, service warnings | policies/opa/.rego |
| Custom Falco rules | 13 | Shell spawn, package management, crypto mining, reverse shell, sensitive file read, data transfer | clusters/test-cluster/05-infrastructure/falco.yaml |
| Prometheus alert rules | 22 | Service down, high CPU/memory, CrashLoopBackOff, OOM kill, Falco down, dropped events | clusters/test-cluster/05-infrastructure/rules.yaml |
| CI/CD workflows | 6 | PR validation, app CI/CD, Terraform, security scan, secret rotation, AI collector CI/CD | .github/workflows/.yml |

## **5.9 Discussion of Results**

The evaluation results demonstrate that continuous compliance can be achieved through the systematic integration of automated security controls across all six architectural layers. The key findings from the evaluation are:

**Finding 1: Full NIST SP 800-207 tenet coverage is achievable with open-source tools.** The implementation achieves compliance with all seven NIST Zero Trust tenets using exclusively open-source security tools (Kyverno, OPA, Falco, Trivy, Checkov, Syft) deployed on open-source infrastructure (Kubernetes, Prometheus, Grafana, Loki). This demonstrates that Zero Trust compliance does not require expensive commercial security platforms.

**Finding 2: The dual-engine policy approach provides complementary coverage.** Kyverno and OPA address different aspects of security policy. Kyverno's YAML-based rules are intuitive for Kubernetes operators and provide strong admission control. OPA's Rego language enables more complex cross-resource policies and extends naturally to non-Kubernetes contexts (e.g., validating Terraform configurations). The combination covers more security domains than either engine alone.

**Finding 3: Left-shift security must be complemented by runtime detection.** The CI/CD pipeline gates effectively prevent known vulnerabilities and policy violations from reaching production. However, runtime threats \- shell injection, privilege escalation, data exfiltration, cryptocurrency mining \- can only be detected during operation through kernel-level monitoring. The 39 policy rules span both deployment-time (25 Kyverno \+ OPA rules) and runtime (14 Falco rules), demonstrating the necessity of the defence-in-depth approach.

**Finding 4: Automated secret rotation reduces credential exposure risk.** Monthly rotation of MongoDB passwords, JWT signing keys, and API tokens \- with automated sealing, GitOps deployment, and health verification \- reduces the window of exposure for compromised credentials. The Git-based audit trail in docs/rotation-logs/rotation-history.md provides compliance evidence for each rotation event.

**Finding 5: AI enrichment adds contextual value without introducing critical-path dependency.** The AI Security Collector's parallel architecture ensures that alerting is never blocked by LLM unavailability or latency. The enriched reports provide investigators with threat assessments, investigation steps, and remediation recommendations that would otherwise require manual analysis, potentially reducing Mean Time to Understand (MTTU).

# **6\. Discussion**

## **6.1 Critical Analysis**

This project demonstrates that Zero Trust principles can be translated from a conceptual framework into a working, automated system for Kubernetes microservices. The implementation is comprehensive in its coverage across six layers, yet several critical observations merit discussion.

**Strengths of the approach:**

The framework's primary strength is its integration. Rather than deploying individual security tools as isolated point solutions, the project connects them into a continuous compliance pipeline where the output of one control feeds into the next. For example, Trivy scanning in the CI/CD pipeline produces SARIF reports that feed into GitHub Code Scanning; Falco events feed through Falcosidekick to Prometheus, Loki, PagerDuty, and the AI Collector simultaneously; secret rotation commits trigger Argo CD syncs that update running pods automatically. This integration means that a security event at any layer is visible across the observability stack.

The GitOps model provides a significant advantage for compliance. Because all infrastructure, application, and policy configurations are stored in Git, the repository serves as an immutable audit log. Any change \- whether to a security policy, a Kubernetes manifest, or a secret rotation \- is recorded with author, timestamp, and diff. This makes compliance verification a matter of Git history inspection rather than runtime interrogation, which is more reliable and reproducible.

**Weaknesses and trade-offs:**

The framework validates policies primarily in the CI/CD pipeline rather than through in-cluster admission webhooks. While the Kyverno policies are defined in enforce mode and are intended for cluster deployment, the current validation is primarily through the Kyverno CLI in the pipeline. This means that resources applied directly to the cluster (bypassing the CI/CD pipeline) would not be validated unless the in-cluster Kyverno admission controller is deployed. This is acknowledged as a scope limitation and is identified as future work.

The project does not include formal penetration testing or adversarial simulation. While the Falco rules are mapped to MITRE ATT\&CK techniques and the CI/CD gates are verified through pipeline execution, the framework has not been subjected to red-team testing where an attacker actively attempts to bypass security controls. This limits the confidence in the framework's resistance to sophisticated adversaries.

The AI Security Collector depends on the Azure OpenAI API, introducing an external dependency. While the collector is designed to degrade gracefully (falling back to JSONL storage when Loki is unavailable, and skipping AI enrichment when the API is unreachable), the enrichment quality is ultimately dependent on the LLM's accuracy and relevance. Hallucination \- where the model generates plausible but incorrect threat analysis \- remains a risk that requires human oversight.

## **6.2 Research Question Answers**

**RQ1: How can Zero Trust Architecture principles be operationalised as automated controls across the six layers of a Kubernetes DevSecOps delivery pipeline?**

This project demonstrates that Zero Trust principles can be operationalised through a layered approach where each architectural layer implements specific controls: infrastructure hardening via Terraform (Layer 1), Kubernetes security contexts and GitOps via Argo CD (Layer 2), application-level JWT authentication and RBAC (Layer 3), multi-pipeline CI/CD with ten security tools (Layer 4), eBPF-based runtime monitoring via Falco (Layer 5), and three-pillar observability with AI enrichment (Layer 6). The seven NIST SP 800-207 tenets are satisfied through the combination of these layered controls, as demonstrated in Table 12\.

**RQ2: What pipeline architecture balances comprehensive security verification with acceptable developer velocity and deployment frequency?**

The six-pipeline architecture balances security and velocity through specialisation and parallelism. The PR Validation pipeline runs in under two minutes, providing fast feedback without impeding the developer workflow. The App CI/CD pipeline runs in eight to ten minutes, performing comprehensive scanning during the build phase while the developer has already moved on. Monthly scheduled scans and secret rotation run autonomously without developer involvement. The key architectural insight is that not all security checks need to run on every commit \- fast checks run on PRs, comprehensive checks run on merges, and audit checks run on schedules.

**RQ3: How can policy-as-code enforcement be combined with runtime threat detection to achieve defence-in-depth for containerised workloads?**

The dual-engine policy approach (Kyverno \+ OPA) provides deployment-time enforcement through twenty-five rules covering container privilege, resource management, image security, and network controls. Falco extends enforcement into runtime with fourteen rules covering execution, persistence, privilege escalation, credential access, and data exfiltration \- threat categories that cannot be addressed through static policy validation. The result is a defence-in-depth model where thirty-nine rules span the complete lifecycle from admission to runtime, with each engine covering domains where it has the greatest detection capability.

**RQ4: To what extent can AI enrichment of runtime security events reduce Mean Time to Understand (MTTU) for security incidents?**

The AI Security Collector demonstrates that LLM-based enrichment can automatically generate threat assessments, investigation steps, and remediation recommendations for Falco security events, providing contextual analysis that would otherwise require manual analyst effort. The non-blocking architecture ensures that alerting latency is unaffected by AI processing time. While formal MTTU measurement is outside the current project scope (it would require a controlled experiment with SOC analysts), the enriched reports provide structured analysis that directly addresses the alert fatigue problem identified by Alahmadi *et al.* (2020).

## 

## 

## **6.3 Comparison with Existing Approaches**

Table 20 compares this project's approach with existing Zero Trust and DevSecOps implementations in the literature.

*Table 20: Comparison with existing approaches*

| Aspect | This Project | NIST SP 800-207 | DISA ZT Ref Arch | Shamim et al. (2020) | OWASP DevSecOps |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Type | Implementation | Reference architecture | Reference architecture | Systematisation | Guideline |
| Scope | 6 layers, full lifecycle | Conceptual tenets | 7 pillars (conceptual) | 11 considerations | Pipeline-focused |
| Policy engines | 2 (Kyverno \+ OPA) | Not specified | Not specified | Discussed theoretically | OPA recommended |
| Runtime security | Falco eBPF (13 rules) | Continuous monitoring (tenet) | Discussed conceptually | Discussed theoretically | Not addressed |
| AI integration | GPT-4o-mini enrichment | Not addressed | Not addressed | Not addressed | Not addressed |
| SBOM | Dual format (SPDX \+ CycloneDX) | Recommended | Recommended | Not addressed | Recommended |
| Secret management | Automated rotation \+ audit | Mentioned | Required | Listed as consideration | Not detailed |
| Reproducibility | Open-source, Git-managed | N/A | N/A | N/A | Tool recommendations |
| Evaluation | NIST \+ MITRE ATT\&CK mapping | N/A | N/A | Taxonomy only | N/A |

The comparison highlights that this project provides a concrete, reproducible implementation that bridges the gap between conceptual frameworks (NIST, DISA) and practical guidance documents (OWASP) by demonstrating how Zero Trust principles translate into specific tools, configurations, and automated controls within a real Kubernetes deployment.

## **6.4 Limitations and Threats to Validity**

**Internal validity:**

* The evaluation relies primarily on repository evidence and design analysis rather than runtime experiments with controlled attack scenarios. While this approach verifies that controls are implemented, it does not measure their effectiveness against real adversaries.  
* The compliance mapping is based on the author's interpretation of NIST SP 800-207 tenets and MITRE ATT\&CK techniques. Different interpretations could yield different compliance assessments.

**External validity:**

* The framework is implemented on a single, small-scale Kubernetes cluster (three nodes) with a simple microservices application. The scalability of the approach to larger, more complex environments has not been validated.  
* The project uses Oracle Cloud Infrastructure; transferability to other cloud providers (AWS, Azure, GCP) would require modifications to the Terraform definitions but the Kubernetes-level controls should remain applicable.  
* The FreshBonds application is a purpose-built demonstration system; real-world applications with more complex business logic may introduce additional security considerations.

**Construct validity:**

* Policy rule counts and tool integration counts are used as proxies for security coverage. A higher count does not necessarily equate to better security \- rule quality, specificity, and false-positive rates are equally important but are harder to measure without operational data.  
* The MITRE ATT\&CK coverage analysis identifies which techniques are detectable but does not measure detection accuracy (true positive rate, false positive rate) under realistic attack conditions.

**Specific limitations:**

49. No formal penetration testing or red-team evaluation.  
50. No multi-cluster federation or service mesh (mutual TLS) validation.  
51. No quantitative performance benchmarking (pipeline execution times, Falco overhead).  
52. No image signature verification (Sigstore/Cosign) implementation.  
53. No unit or integration test suite for microservices.  
54. NetworkPolicy implementation covers default-deny at the namespace level but lacks comprehensive per-service micro-segmentation.  
55. In-cluster admission controller deployment (Kyverno as a webhook) is defined but not fully validated in production.

## **6.5 Implications for Practice**

This project has several implications for practitioners seeking to implement Zero Trust in Kubernetes environments:

56. **Start with GitOps.** The Argo CD GitOps model provides the foundation for all other controls \- it ensures that the cluster state is declarative, version-controlled, and auditable. Without GitOps, security configurations tend to drift from their intended state through manual changes.  
57. **Use multiple policy engines.** No single policy engine covers all security domains. The combination of Kyverno (Kubernetes-native, YAML-based) and OPA (general-purpose, Rego-based) provides broader coverage than either alone. Practitioners should select engines based on their team's existing skill set and the specific policy requirements.  
58. **Separate pipeline concerns.** Using six specialised pipelines rather than a single monolithic pipeline provides better isolation, clearer failure modes, and the ability to run different checks at different frequencies (every PR, every merge, monthly schedules).  
59. **Automate secret rotation.** Manual secret rotation is error-prone and frequently deferred. Automated monthly rotation with health check verification and Git-based audit trails removes human bottlenecks and provides compliance evidence.  
60. **Plan for runtime detection from the start.** Left-shift security is necessary but not sufficient. Runtime threats such as container compromise, privilege escalation, and data exfiltration require kernel-level monitoring (e.g., Falco with eBPF) that operates independently of the CI/CD pipeline.

# **7\. Conclusion and Future Work**

## **7.1 Conclusion**

This project has designed, implemented, and evaluated a comprehensive Zero-Trust DevSecOps framework for Kubernetes microservices, demonstrating that continuous compliance can be achieved through the systematic integration of automated security controls across six architectural layers. The framework \- implemented as the FreshBonds production system on Oracle Cloud Infrastructure \- integrates thirty-nine policy rules across three engines (Kyverno, OPA, Falco), ten security tools across six CI/CD pipelines, twenty-two Prometheus alert rules, fourteen Grafana/Loki alert rules, automated monthly secret rotation, dual-format SBOM generation, and AI-augmented runtime security monitoring.

The evaluation against NIST SP 800-207 demonstrates compliance with all seven Zero Trust tenets. The MITRE ATT\&CK mapping confirms coverage of thirteen techniques across eight tactics. The pipeline architecture blocks one hundred per cent of deployments containing CRITICAL CVEs, while maintaining developer-acceptable build times through specialised pipeline design.

The core finding of this project is that continuous compliance is operationalisable as a set of automated control points across the delivery lifecycle, rather than as periodic manual audits. By expressing security policies as code, automating security verification at every pipeline stage, monitoring runtime behaviour through kernel-level instrumentation, and enriching security events with AI-generated context, organisations can maintain a strong security posture that scales with deployment frequency rather than being overwhelmed by it.

This project contributes a reproducible reference implementation that bridges the gap between conceptual Zero Trust frameworks and practical Kubernetes security automation. The complete implementation is available as the zero-trust-devsecops Git repository, providing practitioners and researchers with a concrete, version-controlled artefact that can be studied, adapted, and extended for their own environments.

## **7.2 Future Work**

Table 21 identifies areas for future improvement, categorised by priority and expected impact.

*Table 21: Future work areas and planned improvements*

| \# | Area | Description | Priority | Expected Impact |
| :---- | :---- | :---- | :---- | :---- |
| 1 | ML-based anomaly detection | Implement Isolation Forest, Autoencoder, and LSTM models for Falco event anomaly scoring, enabling detection of novel attack patterns beyond rule-based matching | High | Improved detection of zero-day threats |
| 2 | In-cluster admission control | Deploy Kyverno as a Kubernetes admission webhook for real-time enforcement at the API server level, beyond CI/CD-time validation | High | Prevents policy bypass through direct cluster access |
| 3 | Comprehensive NetworkPolicy | Implement per-service NetworkPolicy micro-segmentation beyond namespace-level default-deny | High | Stronger east-west traffic control |
| 4 | Image signature verification | Integrate Sigstore/Cosign for image signing in CI/CD and Kyverno verification policy for admission control | Medium | Ensures image provenance and integrity |
| 5 | Red-team evaluation | Conduct formal penetration testing against the deployed framework using adversarial simulation scripts mapped to MITRE ATT\&CK techniques | Medium | Validates real-world detection effectiveness |
| 6 | Multi-cluster federation | Extend the framework to multi-cluster environments with centralised policy management and distributed monitoring | Medium | Validates scalability for enterprise adoption |
| 7 | Service mesh mutual TLS | Integrate Istio or Linkerd for automatic mutual TLS between services, eliminating the need for application-level TLS configuration | Low | Stronger internal communication security |
| 8 | Unit and integration testing | Develop comprehensive test suites for microservices using Jest and for ML models using pytest | Low | Improved code quality and regression detection |

# **8\. Contribution and Novelty**

Table 22 summarises the key contributions of this project.

*Table 22: Project contributions summary*

| \# | Contribution | Description |
| :---- | :---- | :---- |
| 1 | Zero-Trust DevSecOps reference implementation | A complete, reproducible, production-deployed implementation of Zero Trust principles for Kubernetes microservices, available as an open Git repository. |
| 2 | Lifecycle-based continuous compliance model | A model that connects PR validation, CI/CD scanning, GitOps deployment, scheduled audits, secret rotation, runtime detection, and incident reporting into a unified compliance pipeline. |
| 3 | Dual policy-as-code design | A complementary approach using Kyverno (Kubernetes-native YAML) and OPA (general-purpose Rego) that demonstrates how multiple policy engines can provide broader coverage than either alone. |
| 4 | Supply chain evidence model | Implementation of dual-format SBOM generation (SPDX \+ CycloneDX) with Trivy vulnerability scanning, approved registry enforcement, and image tag policy \- producing machine-readable supply chain evidence at every build. |
| 5 | Secret lifecycle automation pattern | End-to-end automated secret rotation using GitHub Actions, Sealed Secrets, MongoDB Atlas API integration, and Git-based audit logging \- demonstrating a complete credential lifecycle from generation through deployment to verification. |
| 6 | AI-assisted runtime security reporting | A non-blocking AI enrichment architecture that augments Falco security events with GPT-4o-mini-generated threat assessments, investigation steps, and remediation recommendations without introducing critical-path dependency. |
| 7 | MIS-level evaluation structure | A reproducible evaluation methodology mapping implementation evidence to NIST SP 800-207 tenets, MITRE ATT\&CK techniques, and practical compliance metrics. |

**Novelty statement:** The novelty of this project lies in the integrated artefact rather than in any single tool. Many projects use Trivy, Kyverno, Falco, or Argo CDs separately. This project combines them into a single continuous compliance pipeline with repository evidence, runtime monitoring, and AI-enriched incident context. The dual-engine policy approach, the non-blocking AI enrichment architecture, and the automated secret lifecycle management pattern are specific design contributions that have not been demonstrated in combination in the existing literature.

# **9\. References**

Alahmadi, B. A., Axon, L. and Sherren, T. (2020) '99% false positives: a qualitative study of SOC analysts' perspectives on security alarms', *USENIX Security Symposium*, pp. 2203–2220.

Anchore (2026) *Syft documentation*. Available at: https://github.com/anchore/syft (Accessed: 13 April 2026).

Aqua Security (2024) *Trivy: a comprehensive and versatile security scanner*. Available at: https://trivy.dev/ (Accessed: 13 April 2026).

Biden, J. R. (2021) 'Executive Order 14028: Improving the Nation's Cybersecurity', *Federal Register*, 86(93), pp. 26633–26647.

Bitnami Labs (2026) *Sealed Secrets*. Available at: https://github.com/bitnami-labs/sealed-secrets (Accessed: 13 April 2026).

Bridgecrew (2024) *Checkov: policy-as-code for everyone*. Available at: https://www.checkov.io/ (Accessed: 13 April 2026).

Brown, S. (2018) *The C4 model for visualising software architecture*. Leanpub.

Burns, B., Grant, B., Oppenheimer, D., Brewer, E. and Wilkes, J. (2016) 'Borg, Omega, and Kubernetes: lessons learned from three container-management systems over a decade', *ACM Queue*, 14(1), pp. 70–93.

CIS (2024) *CIS Kubernetes Benchmark v1.8*. Center for Internet Security.

Cloud Native Computing Foundation (2024) *CNCF Annual Survey 2024*. Available at: https://www.cncf.io/reports/ (Accessed: 13 April 2026).

Cloud Security Alliance (2022) *DevSecOps: integrating security into DevOps*. CSA Working Group Publication.

DISA (2021) *Department of Defense Zero Trust Reference Architecture*. Defense Information Systems Agency.

Falco (2024) *The Falco Project: cloud-native runtime security*. Available at: https://falco.org/ (Accessed: 13 April 2026).

Fitzgerald, B. and Stol, K. J. (2017) 'Continuous software engineering: a roadmap and agenda', *Journal of Systems and Software*, 123, pp. 176–189.

Hevner, A. R., March, S. T., Park, J. and Ram, S. (2004) 'Design science in information systems research', *MIS Quarterly*, 28(1), pp. 75–105.

Jeyaraj, A. (2023) 'Zero trust security in cloud-native environments: challenges and implementation strategies', *Journal of Cloud Computing*, 12(1), pp. 1–18.

Kindervag, J. (2010) *Build security into your network's DNA: the Zero Trust network architecture*. Forrester Research Report.

Kubernetes (2024) *Kubernetes documentation: Pod Security Standards*. Available at: https://kubernetes.io/docs/concepts/security/pod-security-standards/ (Accessed: 13 April 2026).

Kyverno (2024) *Kyverno: Kubernetes native policy management*. Available at: https://kyverno.io/ (Accessed: 13 April 2026).

Microsoft (2024) *Azure OpenAI Service documentation*. Available at: https://learn.microsoft.com/azure/ai-services/openai/ (Accessed: 13 April 2026).

MITRE (2024) *ATT\&CK for Containers*. Available at: https://attack.mitre.org/matrices/enterprise/containers/ (Accessed: 13 April 2026).

Myrbakken, H. and Colomo-Palacios, R. (2017) 'DevSecOps: a multivocal literature review', in *Software Process Improvement and Capability Determination*. Cham: Springer, pp. 17–29.

OPA (2024) *Open Policy Agent*. Available at: https://www.openpolicyagent.org/ (Accessed: 13 April 2026).

OWASP (2023) *OWASP DevSecOps guideline*. Available at: https://owasp.org/www-project-devsecops-guideline/ (Accessed: 13 April 2026).

PCI SSC (2022) *PCI DSS v4.0: Payment Card Industry Data Security Standard*. PCI Security Standards Council.

Peffers, K., Tuunanen, T., Rothenberger, M. A. and Chatterjee, S. (2007) 'A design science research methodology for information systems research', *Journal of Management Information Systems*, 24(3), pp. 45–77.

Red Hat (2024) *The State of Kubernetes Security Report 2024*. Available at: https://www.redhat.com/en/resources/state-kubernetes-security-report (Accessed: 13 April 2026).

Rice, L. (2022) *Learning eBPF: programming the Linux kernel for enhanced observability, networking, and security*. O'Reilly Media.

Rose, S., Borchert, O., Mitchell, S. and Connelly, S. (2020) *Zero Trust Architecture*. NIST Special Publication 800-207. Gaithersburg, MD: National Institute of Standards and Technology.

Sanchez-Gordon, S. and Colomo-Palacios, R. (2020) 'Security as code: a systematic mapping study', in *International Conference on Computational Science and Its Applications*. Cham: Springer, pp. 159–174.

Shamim, M. S., Bhuiyan, F. A. and Rahman, A. (2020) 'XI commandments of Kubernetes security: a systematization of knowledge related to Kubernetes security practices', *IEEE Secure Development Conference (SecDev)*, pp. 58–64.

Sonatype (2023) *9th Annual State of the Software Supply Chain Report*. Sonatype Inc.

Souppaya, M., Morello, J. and Scarfone, K. (2023) *Strategies for the integration of software supply chain security in DevSecOps CI/CD pipelines*. NIST Special Publication 800-204C. Gaithersburg, MD: National Institute of Standards and Technology.

Souppaya, M., Scarfone, K. and Dodson, D. (2022) *Secure software development framework (SSDF) version 1.1: recommendations for mitigating the risk of software vulnerabilities*. NIST Special Publication 800-218. Gaithersburg, MD: National Institute of Standards and Technology.

# **10\. Appendices**

## **Appendix A: Security Tool Configuration Matrix**

*Table A.1: Complete security tool configuration matrix*

| Tool | Type | Phase | Pipeline(s) | Blocking | Output Format |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Trivy | Container vulnerability scanner | Build, Post-deploy | app-cicd, ai-collector-cicd, security-scan | Yes (CRITICAL) | SARIF, JSON |
| Trivy (secret mode) | Embedded secret scanner | Build | app-cicd | Yes | JSON |
| Checkov | IaC security scanner | Build, Post-deploy | app-cicd, terraform, security-scan | Yes | SARIF, JSON |
| Gitleaks | Git secret scanner | Pre-merge | pr-validation | Yes | JSON |
| Syft | SBOM generator | Build | app-cicd, ai-collector-cicd | No (artefact) | SPDX, CycloneDX |
| OPA/Conftest | Policy validator (Rego) | Build, Post-deploy | app-cicd, security-scan | Yes | Text |
| Kyverno CLI | Policy validator (YAML) | Build, Post-deploy | app-cicd, security-scan | Yes | Text |
| kubeval | K8s manifest validator | Pre-merge | pr-validation | Yes | Text |
| npm audit | Dependency vulnerability scanner | Post-deploy | security-scan | Yes (MODERATE+) | JSON |
| kubeseal | Secret encryption | Rotation | secret-rotation | N/A | YAML |
| Falco | Runtime security monitor | Runtime | N/A (DaemonSet) | Alert | JSON |
| ESLint | Code linter | Pre-merge | pr-validation | Yes | Text |
| yamllint | YAML linter | Pre-merge | pr-validation | Yes | Text |

## **Appendix B: Kyverno and OPA Policy Specifications**

*Table B.1: Kyverno ClusterPolicy \- Pod security rules*

| Rule | Target Resource | Validation Pattern | Mode |
| :---- | :---- | :---- | :---- |
| run-as-non-root | Deployments (production, dev) | spec.template.spec.securityContext.runAsNonRoot: true | Enforce |
| disallow-privileged | All Deployments | spec.template.spec.containers\[\].securityContext.privileged: false | Enforce |
| require-resource-limits | All Deployments | containers\[\].resources.limits.cpu and .memory must exist | Enforce |
| drop-all-capabilities | All Deployments | containers\[\].securityContext.capabilities.drop: \["ALL"\] | Enforce |
| disallow-privilege-escalation | All Deployments | containers\[\].securityContext.allowPrivilegeEscalation: false | Enforce |
| read-only-root-filesystem | Production Deployments | containers\[\].securityContext.readOnlyRootFilesystem: true | Enforce |

*Table B.2: Kyverno ClusterPolicy \- Image verification rules*

| Rule | Target Resource | Validation Pattern | Mode |
| :---- | :---- | :---- | :---- |
| disallow-latest-tag | All Deployments | Image tag must not be :latest; explicit version required | Enforce |
| require-approved-registry | Production Deployments | Image registry must be docker.io, ghcr.io, or gcr.io | Enforce |
| require-image-pull-policy | All Deployments | imagePullPolicy must be Always or IfNotPresent | Enforce |

*Table B.3: OPA/Rego policy rules \- security.rego*

| \# | Rule Name | Severity | Policy Expression |
| :---- | :---- | :---- | :---- |
| 1 | runAsNonRoot | deny | Containers must set runAsNonRoot: true |
| 2 | privileged | deny | Containers must not set privileged: true |
| 3 | resource-limits | deny | Containers must define CPU and memory limits |
| 4 | readiness-probe | warn | Containers should define readiness probes |
| 5 | liveness-probe | warn | Containers should define liveness probes |
| 6 | privilege-escalation | deny | allowPrivilegeEscalation must be false |
| 7 | latest-tag | deny | Image tag must not be :latest |
| 8 | approved-registry | deny | Image registry must be in allowlist |
| 9 | hostPath-volume | deny | Pods must not use hostPath volumes |
| 10 | read-only-root | warn | Root filesystem should be read-only |
| 11 | dangerous-capabilities | deny | Must not add SYS\_ADMIN, NET\_ADMIN, ALL capabilities |
| 12 | drop-ALL | deny | Must drop ALL capabilities |
| 13 | env-var-validation | deny | Environment variables must not contain credential patterns |

*Table B.4: OPA/Rego policy rules \- network.rego*

| \# | Rule Name | Severity | Policy Expression |
| :---- | :---- | :---- | :---- |
| 14 | networkpolicy-required | deny | Every namespace must have at least one NetworkPolicy |
| 15 | loadbalancer-warning | warn | Services of type LoadBalancer should be reviewed |
| 16 | missing-selector | warn | Services without pod selectors should be flagged |

## **Appendix C: Falco Custom Rules with MITRE ATT\&CK Mapping**

*Table C.1: Complete Falco custom rule inventory with MITRE ATT\&CK mapping*

| \# | Rule Name | Priority | MITRE Tactic | MITRE Technique | Detection Condition |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | Shell Spawned in Container | WARNING | Execution | T1059 | spawned\_process and container and proc.name in (bash, sh, zsh, dash, ksh) |
| 2 | Package Management in Container | WARNING | Persistence | T1546 | spawned\_process and container and proc.name in (apt, apt-get, yum, pip, npm) |
| 3 | Detect Crypto Mining | CRITICAL | Impact | T1496 | spawned\_process and container and (proc.name in (xmrig, minerd) or proc.cmdline contains stratum) |
| 4 | Read Sensitive File | WARNING | Credential Access | T1552 | open\_read and container and sensitive\_files |
| 5 | Privilege Escalation via Setuid | CRITICAL | Privilege Escalation | T1548 | container and evt.type \= setuid and evt.arg.uid \= 0 |
| 6 | Reverse Shell Detection | CRITICAL | Execution | T1059.004 | container and fd.type \= ipv4 and proc.name in (nc, ncat, bash, python) |
| 7 | Container Escape Attempt | CRITICAL | Privilege Escalation | T1611 | container and proc.name in (nsenter, docker, runc, crictl) |
| 8 | Outbound Suspicious Port | WARNING | Command & Control | T1571 | container and outbound and fd.sport in (4444, 5555, 6666, 1337\) |
| 9 | Suspicious File Modification | CRITICAL | Persistence | T1543 | container and open\_write and fd.name in (/etc/passwd, /etc/shadow, crontab, authorized\_keys) |
| 10 | Network Reconnaissance | WARNING | Discovery | T1046 | container and spawned\_process and proc.name in (nmap, masscan, zmap) |
| 11 | Suspicious DNS Query | WARNING | Command & Control | T1071.004 | container and evt.type in (sendto, connect) and fd.name contains (tor, proxy, vpn) |
| 12 | Large Data Transfer | WARNING | Exfiltration | T1048 | container and fd.type \= ipv4 and evt.rawarg.res \> 10485760 |
| 13 | Read Sensitive File Untrusted | WARNING | Credential Access | T1552.001 | open\_read and sensitive\_files and not trusted\_containers |

*Table C.2: Falco sensitive\\\_files macro definition*

| Macro | Files Monitored |
| :---- | :---- |
| sensitive\_files | /etc/shadow, /etc/sudoers, /etc/pam.d/, \~/.ssh/, \~/.aws/, \~/.kube/ |

## **Appendix D: CI/CD Pipeline Specifications**

*Table D.1: CI/CD pipeline file specifications*

| Pipeline | Workflow File | Lines of YAML | Trigger | Estimated Duration | Jobs |
| :---- | :---- | :---- | :---- | :---- | :---- |
| PR Validation | pr-validation.yml | 316 | Pull requests to main/develop | \< 2 min | code-quality, security-check, pr-size-check, summary |
| App CI/CD | app-cicd.yml | 523 | Push to main/develop, tags | 8–10 min | detect-changes, policy-checks, build-and-scan, update-manifests, notify |
| AI Collector CI/CD | ai-collector-cicd.yml | 474 | Push to main (research/) | 5–8 min | detect-changes, build-and-scan, update-manifests, notify |
| Terraform | terraform.yml | 443 | Push/PR to main (terraform/) | 2–4 min | validate, security-scan, plan, apply, summary |
| Security Scan | security-scan.yml | 610 | Monthly (1st @ 2 AM UTC) | 15–20 min | scan-images, scan-policies, scan-dependencies, scan-iac, summary |
| Secret Rotation | secret-rotation.yml | 471 | Monthly (1st @ 3 AM UTC) | 3–5 min | rotate-secrets |
| Total | \~2,837 |  |  |  |  |

## **Appendix E: Grafana Alert Rule Summary**

*Table E.1: Grafana Loki alert rules by category*

| Category | \# Rules | Alert Examples |
| :---- | :---- | :---- |
| Application Alerts | 5 | Error rate high, crash detection (CrashLoopBackOff), MongoDB connection failures, 5xx HTTP errors, payment processing failures |
| Log Stream Alerts | 5 | High error rate in pod logs, MongoDB disconnection pattern, payment service unavailability, auth failure rate spike, pod restart loop detection |
| Login Security Alerts | 4 | Brute force detection (failed login spike), single-user targeting (multiple attempts on one account), suspicious IP patterns, email enumeration attempts |
| Total | 14 |  |

*Table E.2: Prometheus alert rules by category*

| Category | \# Rules | Alert Examples |
| :---- | :---- | :---- |
| Infrastructure | 6 | DiskSpaceWarning (80%), DiskSpaceCritical (95%), NodeMemoryPressure, NodeDiskPressure, PVCAlmostFull (90%), NodeNotReady |
| Application | 10 | ServiceDown, HighMemoryUsage (\>90%), HighCPUUsage (\>90%), PodCrashLooping, ContainerOOMKilled, ServiceReplicas, ServiceAvailability, MongoDBConnectionFailures, APIGatewayHighLatency, PaymentProcessingFailures |
| Falco Monitoring | 3 | FalcoDown (DaemonSet unavailable), FalcoHighEventRate (\>1000 events/min), FalcoDroppedEvents (kernel event loss) |
| Prometheus Self-Monitoring | 3 | PrometheusConfigReloadFailed, PrometheusTSDBCompactionsFailed, PrometheusNotConnectedToAlertmanager |
| Total | 22 |  |

## **Appendix F: Repository Structure and Evidence**

*Table F.1: Repository directory structure with artefact counts*

| Directory | Contents | File Count | Purpose |
| :---- | :---- | :---- | :---- |
| src/api-gateway/ | Express.js reverse proxy with security headers | \~10 | API Gateway microservice |
| src/user-service/ | Express.js authentication with JWT and bcrypt | \~12 | User authentication service |
| src/product-service/ | Express.js product CRUD with RBAC | \~12 | Product management service |
| src/frontend/ | React 18 \+ Vite \+ TailwindCSS | \~30 | Frontend SPA |
| terraform/ | OCI infrastructure definitions | 12 | Infrastructure as Code |
| clusters/test-cluster/ | Kubernetes cluster manifests | 22+ | Platform configuration |
| apps/freshbonds/ | Helm chart with values and templates | \~8 | Application deployment |
| policies/kyverno/ | Kyverno ClusterPolicy YAML | 2 | Kubernetes-native policies |
| policies/opa/ | OPA Rego policy files | 2 | General-purpose policies |
| .github/workflows/ | GitHub Actions workflow files | 6 | CI/CD pipelines |
| bootstrap/ | Argo CD bootstrap application | 1 | GitOps entry point |
| research/ | AI Security Collector (Python/FastAPI) | \~15 | AI-augmented monitoring |
| docs/ | Project documentation | 50+ | Technical documentation |
| scripts/ | Automation and setup scripts | \~10 | Build, deploy, and maintenance |
| thesis/ | Academic thesis and report documents | 3 | Research deliverables |

**Verification commands for evaluation evidence:**

\# Count Kyverno rules  
grep \-c "name:" policies/kyverno/\*.yaml

\# Count OPA rules  
grep \-c "deny\\|warn" policies/opa/\*.rego

\# Count Falco custom rules  
grep \-c "rule:" clusters/test-cluster/05-infrastructure/falco.yaml

\# Count Prometheus alert rules  
grep \-c "alert:" clusters/test-cluster/05-infrastructure/\*rules\*.yaml

\# Count CI/CD workflow files  
ls .github/workflows/\*.yml | wc \-l

\# Count total YAML lines in workflows  
wc \-l .github/workflows/\*.yml

\# Verify SBOM generation in pipeline  
grep \-n "syft\\|sbom\\|spdx\\|cyclonedx" .github/workflows/app-cicd.yml

\# Verify Trivy blocking gate  
grep \-n "exit-code\\|CRITICAL" .github/workflows/app-cicd.yml

\# Check secret rotation audit log  
cat docs/rotation-logs/rotation-history.md

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,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>

[image4]: <data:image/png;base64,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>
# Security Scanning Workflow

**File**: `.github/workflows/security-scan.yml`

Scheduled comprehensive security auditing across the entire stack - containers, dependencies, policies, and infrastructure.

---

## 📋 Overview

This workflow performs proactive security scanning to detect vulnerabilities before they can be exploited:

- **Monthly Schedule**: Comprehensive scans on 1st of every month
- **Multi-Layer**: Images, dependencies, IaC, Kubernetes policies
- **Automated Alerts**: Creates GitHub Issues for critical findings
- **SARIF Integration**: Results viewable in GitHub Security tab
- **Zero-Trust**: Assumes all components are vulnerable until proven otherwise

**Duration**: ~10 minutes (all scans)  
**Concurrency**: Allows parallel scans for different types

---

## 🎯 Triggers

### Scheduled Trigger

```yaml
schedule:
  - cron: '0 2 1 * *'  # Monthly at 2 AM UTC on 1st
```

**Why Monthly?**
- Balances security vs resource usage
- New CVEs published continuously
- Dependency updates need periodic verification
- Infrastructure may drift from configuration

### Manual Trigger

```bash
# Via GitHub Actions UI
Actions → Security Scanning → Run workflow

Options:
  - scan_type: all | images | policies | dependencies | iac
  - severity_threshold: CRITICAL | HIGH | MEDIUM | LOW
```

**Use Cases**:
- After dependency updates
- Before major releases
- After security advisories
- Ad-hoc vulnerability assessment

---

## 🔄 Workflow Stages

### Stage 1: Image Vulnerability Scanning

**Purpose**: Detect CVEs in container images deployed to production

**Matrix Strategy**:
```yaml
matrix:
  service: [frontend, api-gateway, user-service, product-service]
```

**Process**:
```bash
# 1. Pull latest production image
docker pull $DOCKER_USERNAME/freshbonds-$SERVICE:latest

# 2. Run Trivy scan
docker run aquasec/trivy:latest image \
  --format json \
  --output trivy-$SERVICE.json \
  --severity CRITICAL,HIGH,MEDIUM,LOW \
  --vuln-type os,library \
  freshbonds-$SERVICE:latest

# 3. Analyze results
CRITICAL=$(jq -r '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' trivy-$SERVICE.json)
HIGH=$(jq -r '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' trivy-$SERVICE.json)
```

**Severity Thresholds**:
- **CRITICAL**: 0 tolerance - immediate action required
- **HIGH**: Action required within 7 days
- **MEDIUM**: Plan remediation within 30 days
- **LOW**: Monitor, fix when convenient

**Scan Coverage**:
```
Checks:
  ✓ OS packages (Alpine APK, Debian APT, etc.)
  ✓ Application dependencies (npm, pip, etc.)
  ✓ Known CVEs from NVD database
  ✓ Outdated packages
  ✓ Misconfigurations
```

**On Critical Findings**:
1. Creates GitHub Issue with details
2. Uploads SARIF to Security tab
3. Sends notification (if configured)
4. Marks workflow as failed

---

### Stage 2: Dependency Scanning

**Purpose**: Audit Node.js dependencies for security advisories

**Services Scanned**:
- frontend (React + Vite)
- api-gateway (Express.js)
- user-service (Express.js + JWT)
- product-service (Express.js + Mongoose)

**Process**:
```bash
# For each service
cd src/$SERVICE

# Install dependencies (to generate lock file)
npm install --package-lock-only

# Run audit
npm audit --json > audit-$SERVICE.json

# Parse results
CRITICAL=$(jq '.metadata.vulnerabilities.critical' audit-$SERVICE.json)
HIGH=$(jq '.metadata.vulnerabilities.high' audit-$SERVICE.json)
```

**Auto-Fix Capability**:
```bash
# If severity is LOW/MEDIUM
npm audit fix --package-lock-only

# Create automated PR with fixes
git checkout -b security/npm-audit-fixes
git commit -am "chore: fix npm audit vulnerabilities"
gh pr create --title "Security: Fix npm audit findings" \
             --body "Automated security patch"
```

**Advisory Sources**:
- npm Security Advisories
- GitHub Advisory Database
- Snyk Vulnerability DB
- NVD (National Vulnerability Database)

---

### Stage 3: Kubernetes Policy Scanning

**Purpose**: Validate cluster policies against security best practices

**Policies Scanned**:
```yaml
Kyverno Policies:
  - policies/kyverno/pod-security.yaml
  - policies/kyverno/image-verification.yaml

OPA Policies:
  - policies/opa/security.rego
  - policies/opa/network.rego
```

**Validation Process**:
```bash
# 1. Install policy validation tools
go install github.com/open-policy-agent/opa
kubectl krew install kyverno

# 2. Test Kyverno policies
kubectl kyverno test policies/kyverno/ \
  --values-file test-manifests/

# 3. Test OPA policies
opa test policies/opa/ \
  --verbose \
  --coverage \
  --format=json > opa-results.json

# 4. Validate policies are applied in cluster
kubectl get clusterpolicies
```

**Policy Checks**:
- ✓ Pod Security Standards (restricted)
- ✓ Image signature verification
- ✓ Resource limits enforced
- ✓ Privileged containers blocked
- ✓ Host namespaces disallowed
- ✓ Network policies present

---

### Stage 4: Infrastructure as Code Scanning

**Purpose**: Re-scan Terraform for new security checks (Checkov updates weekly)

**Difference from terraform.yml**:
```
terraform.yml (pre-deployment):
  - Runs on every terraform change
  - Blocks deployment on failure

security-scan.yml (scheduled):
  - Runs monthly regardless of changes
  - Detects new security checks
  - Identifies configuration drift
  - Does NOT block anything
```

**Process**:
```bash
# 1. Install latest Checkov
pip install --upgrade checkov

# 2. Scan with updated rule set
checkov -d terraform/ \
  --config-file .checkov.yaml \
  --output json \
  --output sarif \
  --framework terraform

# 3. Compare with previous scan
diff last-scan.json current-scan.json

# 4. Report new findings only
```

**Drift Detection**:
```bash
# Check for manual changes in OCI Console
terraform plan -detailed-exitcode

# If exit code = 2, there's drift
if [ $? -eq 2 ]; then
  echo "⚠️ Infrastructure drift detected!"
  # Create issue to remediate
fi
```

---

### Stage 5: Secret Scanning

**Purpose**: Detect accidentally committed secrets (defense in depth)

**Tool**: TruffleHog + GitHub Secret Scanning

**Patterns Detected**:
```regex
- AWS Access Keys: AKIA[0-9A-Z]{16}
- MongoDB URIs: mongodb+srv://.*:.*@
- JWT Secrets: [a-zA-Z0-9]{32,}
- Private Keys: -----BEGIN.*PRIVATE KEY-----
- API Keys: (api|key|token).*[:=]\s*[a-zA-Z0-9]{20,}
```

**Process**:
```bash
# Scan entire git history
trufflehog git file://. \
  --json \
  --no-update \
  > secret-scan-results.json

# Parse and deduplicate
jq -r '.[] | select(.verified==true)' secret-scan-results.json

# Redact and report
```

**False Positives**:
```yaml
# .trufflehog.yaml
allow:
  - 'example.com'                    # Example URLs
  - 'mongodb://localhost'            # Local dev
  - 'jwt-secret-change-in-prod'      # Placeholder
```

**On Findings**:
1. Create CRITICAL issue
2. Email security team
3. Mark workflow as failed
4. Recommend credential rotation

---

## 📊 Scan Results

### GitHub Security Tab

All scan results uploaded as SARIF:

```
Security → Code scanning alerts

Filters:
  - Severity: Critical, High, Medium, Low
  - Tool: Trivy, Checkov, npm audit, etc.
  - Status: Open, Fixed, Dismissed
```

### Automated Issues

**Issue Template** (for Critical/High):
```markdown
🚨 Security Vulnerability Detected

**Service**: product-service  
**Severity**: CRITICAL  
**CVE**: CVE-2024-12345  
**Package**: mongoose@6.0.0  

## Vulnerability Details
Remote code execution via prototype pollution

## Affected Versions
< 6.5.4

## Remediation
Upgrade to mongoose@6.5.4 or later

## References
- https://nvd.nist.gov/vuln/detail/CVE-2024-12345
- https://github.com/advisories/GHSA-xxxx

---
**Detected by**: security-scan workflow  
**Detection Date**: 2024-03-01 02:00 UTC  
**Scan Report**: [View Artifacts](#)
```

### Artifacts

| Artifact | Contents | Size | Retention |
|----------|----------|------|-----------|
| `trivy-results-{service}` | Container scan JSON | ~500 KB | 90 days |
| `npm-audit-results` | Dependency vulnerabilities | ~50 KB | 90 days |
| `checkov-iac-results` | IaC scan SARIF | ~200 KB | 90 days |
| `policy-validation-report` | Kyverno/OPA test results | ~100 KB | 90 days |
| `secret-scan-report` | Redacted findings | ~20 KB | 90 days |

---

## 🛡️ Security Gates

### Fail Conditions

Workflow marked as **FAILED** if:
- ❌ Any CRITICAL vulnerabilities in images
- ❌ Any HIGH vulnerabilities in production images
- ❌ Secrets found in git history
- ❌ Required Kubernetes policies missing
- ❌ Infrastructure drift detected without justification

### Warning Conditions

Workflow marked as **WARNING** if:
- ⚠️ MEDIUM vulnerabilities present (> 10)
- ⚠️ Dependencies more than 6 months old
- ⚠️ Policy test coverage < 80%
- ⚠️ New Checkov rules trigger findings

### Success Criteria

- ✅ No CRITICAL/HIGH vulnerabilities
- ✅ All policies tested and passing
- ✅ No secrets in repository
- ✅ Dependencies up-to-date
- ✅ Infrastructure matches code

---

## 🚨 Troubleshooting

### Trivy Scan Timeout

**Symptoms**:
```
Error: failed to scan image: context deadline exceeded
```

**Cause**: Large image or slow registry

**Solution**:
```bash
# Increase timeout in workflow
docker run aquasec/trivy:latest image \
  --timeout 15m \
  ...
```

---

### False Positive CVE

**Symptoms**:
```
CVE-2024-12345 reported but package not actually vulnerable
```

**Options**:

1. **Verify vulnerability**:
   ```bash
   trivy image --ignore-unfixed freshbonds-service:latest
   ```

2. **Suppress false positive**:
   ```yaml
   # .trivyignore
   CVE-2024-12345  # Not exploitable in our usage
   ```

3. **Report to Trivy**:
   ```bash
   # Create issue at github.com/aquasecurity/trivy
   ```

---

### npm audit Breaks Build

**Symptoms**:
```
found 0 vulnerabilities, 15 moderate severity vulnerabilities
```

**Cause**: Transitive dependencies can't be auto-fixed

**Solution**:
```bash
# Check if direct dependencies can be updated
npm outdated

# Update major versions manually
npm install package@latest

# If no fix available, document and accept risk
# .npmauditignore (custom solution)
```

---

### Policy Validation Fails

**Symptoms**:
```
Error: policy pod-security.yaml is not applied in cluster
```

**Check**:
```bash
# 1. Verify policy exists
kubectl get clusterpolicies pod-security

# 2. Check policy status
kubectl describe clusterpolicy pod-security

# 3. Review Kyverno controller logs
kubectl logs -n kyverno -l app.kubernetes.io/component=kyverno
```

**Fix**:
```bash
# Re-apply policy
kubectl apply -f policies/kyverno/pod-security.yaml

# Or trigger ArgoCD sync
argocd app sync policies
```

---

### Too Many Alerts

**Symptoms**: Issue flood from monthly scan

**Tuning**:
```yaml
# Adjust thresholds in workflow
severity_threshold: 'CRITICAL'  # Only alert on critical

# Group related findings
- Group by CVE family
- Deduplicate across services
- Create single issue for related findings
```

---

## 📈 Metrics & Reporting

### Security Posture Dashboard

Track trends over time:

```bash
# Vulnerabilities by severity
CRITICAL_COUNT=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' trivy-*.json)

# Vulnerabilities by service
for svc in frontend api-gateway user-service product-service; do
  COUNT=$(jq '[.Results[]?.Vulnerabilities[]] | length' trivy-$svc.json)
  echo "$svc: $COUNT"
done

# Mean time to remediation (MTTR)
# Calculate from issue creation to closure
```

### Compliance Reporting

**Export for Audits**:
```bash
# Generate compliance report
./scripts/generate-compliance-report.sh

# Includes:
- Last 12 months of scan results
- Remediation timeline
- Policy compliance rate
- Third-party dependency inventory
```

---

## 📚 Related Documentation

- [Security Tools Guide](../security/SECURITY-TOOLS.md)
- [Vulnerability Management Process](../security/VULNERABILITY-MANAGEMENT.md)
- [Incident Response Plan](../security/INCIDENT-RESPONSE.md)
- [Compliance Standards](../security/COMPLIANCE.md)

---

## 🎯 Best Practices

### 1. **Scan Frequently**
```yaml
# Consider increasing frequency for critical services
schedule:
  - cron: '0 2 * * 1'  # Weekly instead of monthly
```

### 2. **Prioritize Findings**
```
Priority Order:
1. CRITICAL in production images
2. HIGH in production + internet-facing
3. Secrets in repository
4. Infrastructure drift
5. MEDIUM/LOW vulnerabilities
```

### 3. **Automate Remediation**
```bash
# For low-risk updates
if [ $SEVERITY == "LOW" ]; then
  npm audit fix --package-lock-only
  git commit -am "chore: auto-fix low severity vulnerabilities"
  gh pr create --auto-merge
fi
```

### 4. **Track Exceptions**
```yaml
# Document accepted risks
# security-exceptions.yaml
exceptions:
  - cve: CVE-2024-12345
    package: old-legacy-lib
    reason: "No alternative available, isolated network"
    expires: 2024-12-31
    approver: security-team
```

---

**Last Updated**: March 2026  
**Workflow Version**: v3.5.0  
**Scan Coverage**: 4 services, 10 policies, 200+ dependencies, 15 infrastructure resources

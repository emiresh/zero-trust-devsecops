# Security Overview - Complete Guide

**Zero-Trust DevSecOps Security Architecture**

Comprehensive documentation of all security measures, tools, policies, and practices across the FreshBonds platform.

---

## 📑 Table of Contents

1. [Security Philosophy](#security-philosophy)
2. [Security Layers](#security-layers)
3. [Left-Shift Security](#left-shift-security)
4. [Runtime Security](#runtime-security)
5. [Secret Management](#secret-management)
6. [Network Security](#network-security)
7. [Access Control](#access-control)
8. [Compliance & Auditing](#compliance--auditing)
9. [Incident Response](#incident-response)
10. [Security Tools Reference](#security-tools-reference)

---

## 🎯 Security Philosophy

### Zero-Trust Principles

**Never Trust, Always Verify**:
```
Traditional Security:          Zero-Trust Security:
─────────────────────         ──────────────────────
Trust inside perimeter  →     Verify every request
Default allow           →     Default deny
Perimeter defense      →     Defense in depth
Static credentials     →     Dynamic, rotated secrets
```

### Core Tenets

1. **Assume Breach**: Design with the assumption that attackers are already inside
2. **Least Privilege**: Grant minimum permissions necessary
3. **Defense in Depth**: Multiple layers of security controls
4. **Security as Code**: All security policies version-controlled
5. **Continuous Verification**: Ongoing monitoring and validation

---

## 🛡️ Security Layers

### Layer 1: Infrastructure Security

**Cloud Infrastructure (OCI)**:

```yaml
Security Controls:
  ✓ IMDSv2 only (token-based metadata service)
  ✓ Security lists (stateful firewall)
  ✓ Private subnets for workers
  ✓ SSH key authentication only
  ✓ Minimal ingress rules
  ✓ Encrypted storage (boot volumes)
```

**Terraform Security Validation**:
```bash
# Automated via Checkov in CI/CD
checkov -d terraform/ --framework terraform

# Example checks:
CKV_OCI_5:  Legacy IMDS endpoints disabled ✓
CKV_OCI_19: SSH restricted to specific IPs ✓ (with skip annotation)
CKV_OCI_20: No overly permissive security rules ✓
CKV_OCI_21: Encryption at rest enabled ✓
```

**Compliance Exceptions**:
```hcl
# terraform/security_list.tf
#checkov:skip=CKV_OCI_19:SSH access from internet required for control plane
resource "oci_core_security_list" "main" {
  # SSH allows internet access for administration
  # Justification: Control plane requires external SSH access
  # Mitigation: Key-based auth only, fail2ban monitoring
}
```

---

### Layer 2: Network Security

**Network Segmentation**:
```
Internet
   │
   ├─ Public Subnet (10.0.0.0/24)
   │  └─ Control Plane only
   │     • SSH: 22 (admin access)
   │     • HTTPS: 443 (application traffic)
   │     • Kubernetes API: 6443
   │
   └─ Private Subnet (10.0.1.0/24)
      └─ Worker Nodes
         • No direct internet access
         • NAT via control plane
         • Internal cluster communication only
```

**Kubernetes Network Policies** (Calico):
```yaml
# Future/06-network-policies/default-deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  # Deny all by default, explicit allows required
```

**Service-Specific Policies**:
```yaml
# Example: Product Service
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: product-service-policy
spec:
  podSelector:
    matchLabels:
      app: product-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
    # Only allow from api-gateway
    - from:
      - podSelector:
          matchLabels:
            app: api-gateway
      ports:
      - protocol: TCP
        port: 8081
  egress:
    # MongoDB Atlas only
    - to:
      - namespaceSelector: {}
      ports:
      - protocol: TCP
        port: 27017
    # DNS resolution
    - to:
      - namespaceSelector: {}
      ports:
      - protocol: UDP
        port: 53
```

---

### Layer 3: Container Security

**Image Security**:

1. **Base Images**:
   ```dockerfile
   # Use minimal, official base images
   FROM node:18-alpine  # Prefer alpine (smaller attack surface)
   # NOT: FROM node:18   (larger, more vulnerabilities)
   ```

2. **Multi-Stage Builds**:
   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Production stage
   FROM node:18-alpine
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY server.js .
   USER node  # Non-root user
   CMD ["node", "server.js"]
   ```

3. **Image Scanning (Trivy)**:
   ```bash
   # Automated in app-cicd.yml
   trivy image \
     --severity CRITICAL,HIGH \
     --exit-code 1 \
     --format sarif \
     --output trivy-results.sarif \
     docker.io/username/freshbonds-service:latest
   ```

**Vulnerability Thresholds**:
| Severity | Action | SLA |
|----------|--------|-----|
| CRITICAL | Block deployment | Fix immediately |
| HIGH | Block deployment | Fix within 7 days |
| MEDIUM | Warning | Fix within 30 days |
| LOW | Info | Fix when convenient |

---

### Layer 4: Kubernetes Security

**Pod Security Standards** (Restricted):
```yaml
# policies/kyverno/pod-security.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restricted-pod-security
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: require-non-root
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Containers must not run as root"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
    
    - name: drop-capabilities
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "All capabilities must be dropped"
        pattern:
          spec:
            containers:
            - securityContext:
                capabilities:
                  drop: ["ALL"]
    
    - name: readonly-root-filesystem
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Root filesystem must be read-only"
        pattern:
          spec:
            containers:
            - securityContext:
                readOnlyRootFilesystem: true
```

**Resource Limits** (Prevent DoS):
```yaml
# Future/03-resource-management/quotas-and-limits.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

**RBAC (Role-Based Access Control)**:
```yaml
# Future/02-rbac/roles.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: dev
rules:
  - apiGroups: ["", "apps"]
    resources: ["pods", "deployments", "services"]
    verbs: ["get", "list", "watch"]  # Read-only
  # NO create, update, delete for developers
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers
  namespace: dev
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

---

### Layer 5: Application Security

**Authentication & Authorization**:

```javascript
// JWT-based authentication
const jwt = require('jsonwebtoken');

// Middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Protected route
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  // Only allow users to access their own data
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ... fetch user data
});
```

**Input Validation**:
```javascript
// Prevent injection attacks
const { body, validationResult } = require('express-validator');

app.post('/api/products', [
  body('name').isString().trim().escape(),
  body('price').isFloat({ min: 0 }),
  body('description').isString().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ... create product
});
```

**Security Headers** (Helmet.js):
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Rate Limiting**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,                  // 100 requests per IP
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

---

## 🔒 Secret Management

### Sealed Secrets Architecture

**Encryption Flow**:
```
1. Plain Secret Created
   ↓
2. Encrypted with Public Key (kubeseal)
   ↓
3. SealedSecret Committed to Git (safe)
   ↓
4. Applied to Cluster (ArgoCD)
   ↓
5. Controller Decrypts with Private Key
   ↓
6. Kubernetes Secret Created (in-cluster only)
```

**Key Management**:

**Public Key** (safe to share):
```bash
# Fetch from cluster
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=sealed-secrets \
  > sealed-secrets-cert.pem

# Or from GitHub Secret (backup)
echo "$SEALED_SECRETS_PUBLIC_KEY" | base64 -d > sealed-secrets-cert.pem
```

**Private Key** (NEVER commit):
```bash
# Stored ONLY in:
1. Kubernetes cluster (primary)
   kubectl get secret -n sealed-secrets sealed-secrets-key2pffg

2. GitHub Secret (backup)
   SEALED_SECRETS_PRIVATE_KEY (base64 encoded)

# Backed up via automation:
./scripts/backup-sealed-secrets-keys.sh
```

---

### Secret Rotation

**Automated Monthly Rotation** (via GitHub Actions):

```yaml
# .github/workflows/secret-rotation.yml
name: Secret Rotation
on:
  schedule:
    - cron: '0 0 1 * *'  # 1st of every month
  workflow_dispatch:

jobs:
  rotate-mongodb:
    steps:
      # 1. Generate new password
      - run: |
          NEW_PASSWORD=$(openssl rand -base64 32)
          echo "::add-mask::$NEW_PASSWORD"
      
      # 2. Update MongoDB Atlas via API
      - run: |
          curl -X PATCH \
            "https://cloud.mongodb.com/api/atlas/v1.0/groups/$PROJECT_ID/databaseUsers/admin/$USERNAME" \
            -u "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
            -d "{ \"password\": \"$NEW_PASSWORD\" }"
      
      # 3. Encrypt with kubeseal
      - run: |
          kubectl create secret generic freshbonds-secret \
            --from-literal=MONGODB_URI="mongodb+srv://user:$NEW_PASSWORD@cluster.mongodb.net/freshbonds" \
            --dry-run=client -o yaml | \
          kubeseal --cert=sealed-secrets-cert.pem \
            --format=yaml > apps/freshbonds/templates/sealed-secret.yaml
      
      # 4. Commit to Git
      - run: |
          git add apps/freshbonds/templates/sealed-secret.yaml
          git commit -m "chore: rotate MongoDB credentials"
          git push
      
      # 5. ArgoCD auto-syncs and restarts pods
```

**Rotation Schedule**:
| Secret Type | Frequency | Automation |
|-------------|-----------|------------|
| MongoDB password | Monthly | GitHub Actions |
| JWT secrets | 90 days | GitHub Actions |
| TLS certificates | Auto (Let's Encrypt) | cert-manager |
| Sealed Secrets key | 90 days | GitHub Actions |
| API keys | Annually | Manual + notification |

---

### Secret Best Practices

**DO**:
- ✅ Use Sealed Secrets for GitOps
- ✅ Rotate credentials regularly
- ✅ Use different secrets per environment
- ✅ Backup private keys securely
- ✅ Monitor secret access (audit logs)

**DON'T**:
- ❌ Commit plain secrets to Git
- ❌ Share secrets via Slack/email
- ❌ Reuse credentials across services
- ❌ Store secrets in ConfigMaps
- ❌ Log secret values

**Example - Correct Usage**:
```javascript
// ✅ Good: Environment variable
const dbUri = process.env.MONGODB_URI;

// ❌ Bad: Hardcoded
const dbUri = "mongodb+srv://user:password123@cluster.mongodb.net";
```

---

## 🔍 Left-Shift Security

### Pre-Commit Checks

**Local Git Hooks** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
# Prevent committing secrets

# Check for common secret patterns
if git diff --cached | grep -E "(password|secret|api_key|private_key)\s*[:=]"; then
  echo "❌ Potential secret detected in commit"
  echo "   Remove sensitive data before committing"
  exit 1
fi

# Run secret scanner
gitleaks protect --staged

exit $?
```

---

### CI/CD Security Gates

**GitHub Actions** (All Workflows):

```yaml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      # 1. Secret Scanning
      - name: Scan for Secrets
        run: |
          docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest \
            detect --source=/path --no-git
      
      # 2. Dependency Scanning
      - name: npm Audit
        run: |
          npm audit --audit-level=high
          # Fails on HIGH+ vulnerabilities
      
      # 3. Container Scanning
      - name: Trivy Scan
        run: |
          trivy image \
            --severity CRITICAL,HIGH \
            --exit-code 1 \
            $IMAGE
      
      # 4. IaC Scanning
      - name: Checkov Scan
        run: |
          checkov -d . \
            --framework terraform,kubernetes \
            --soft-fail=false
      
      # 5. Policy Validation
      - name: Kyverno Test
        run: |
          kubectl kyverno test policies/kyverno/
```

**Deployment Blocked If**:
- ❌ Secrets found in code
- ❌ CRITICAL/HIGH vulnerabilities in images
- ❌ IaC security violations
- ❌ Policy test failures
- ❌ Dependencies with known exploits

---

## 🚨 Runtime Security

### Falco Rules

**Falco** - Kubernetes runtime security monitoring

**Installation**:
```bash
# Helm chart deployed via ArgoCD
# clusters/test-cluster/05-infrastructure/falco/
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco \
  --set falco.grpc.enabled=true \
  --set falco.grpcOutput.enabled=true
```

**Detection Rules**:
```yaml
# Privileged Container Spawned
- rule: Spawn Privileged Container
  desc: Detect privileged container
  condition: >
    container and
    container.privileged=true
  output: >
    Privileged container started
    (user=%user.name container=%container.name image=%container.image.repository)
  priority: WARNING
  
# Shell Spawned in Container
- rule: Shell in Container
  desc: Unexpected shell spawned in container
  condition: >
    spawned_process and
    container and
    proc.name in (bash, sh, zsh)
  output: >
    Shell spawned in container
    (user=%user.name container=%container.name command=%proc.cmdline)
  priority: WARNING
  
# Sensitive File Access
- rule: Read Sensitive File
  desc: Access to sensitive files
  condition: >
    open_read and
    fd.name in (/etc/shadow, /etc/passwd, /root/.ssh/*)
  output: >
    Sensitive file accessed
    (user=%user.name file=%fd.name container=%container.name)
  priority: CRITICAL
```

**Alert Targets**:
```yaml
# falco-sidekick configuration
outputs:
  grafana:
    enabled: true
  pagerduty:
    enabled: true
    minimumpriority: WARNING
  slack:
    enabled: true
    webhookurl: $SLACK_WEBHOOK
```

---

### Image Signature Verification

**Future Enhancement** (Kyverno + Cosign):
```yaml
# policies/kyverno/image-verification.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-signature
      match:
        resources:
          kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "docker.io/username/freshbonds-*:*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

**Signing Images** (GitHub Actions):
```bash
# Install cosign
cosign install

# Sign image
cosign sign --key cosign.key docker.io/username/freshbonds-frontend:v1.2.3

# Verify later
cosign verify --key cosign.pub docker.io/username/freshbonds-frontend:v1.2.3
```

---

## 📊 Compliance & Auditing

### Audit Logging

**Kubernetes Audit Logs**:
```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log Secret access
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  
  # Log RBAC changes
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
  
  # Log pod exec/attach
  - level: Metadata
    verbs: ["exec", "attach"]
```

**What's Logged**:
- ✓ Secret access (who accessed when)
- ✓ RBAC changes (permissions modified)
- ✓ Resource creation/deletion
- ✓ Failed authentication attempts
- ✓ Policy violations

---

### Security Metrics

**Prometheus Queries**:
```promql
# Failed authentication attempts (last 1h)
sum(rate(nginx_ingress_controller_requests{status=~"401|403"}[1h]))

# Pods without resource limits
count(kube_pod_container_resource_limits{resource="memory"} == 0)

# Critical vulnerabilities in running images
sum(trivy_image_vulnerabilities{severity="CRITICAL"})

# Falco security events
sum(increase(falco_events{priority="Critical"}[24h]))
```

**Grafana Dashboard**:
```
Security Overview Dashboard:
├─ Authentication Failures (24h)
├─ Active Security Policies
├─ Pod Security Standard Compliance
├─ Image Vulnerabilities by Severity
├─ Falco Alerts (timeline)
├─ Secret Rotations (last 90 days)
└─ Failed Policy Validations
```

---

### Compliance Standards

**PCI DSS**:
- ✓ Encryption in transit (TLS)
- ✓ Encryption at rest (MongoDB, storage)
- ✓ Regular security scanning
- ✓ Access logging and monitoring
- ✓ Credential rotation

**SOC 2**:
- ✓ Access controls (RBAC)
- ✓ Change management (GitOps, PR reviews)
- ✓ Monitoring and alerting
- ✓ Incident response plan
- ✓ Regular security assessments

**GDPR** (if applicable):
- ✓ Data encryption
- ✓ Access controls
- ✓ Audit logging
- ✓ Data retention policies
- ✓ Right to be forgotten (soft delete)

---

## 🚨 Incident Response

### Detection

**Automated Alerts**:
```
Critical Priority (Immediate):
  • Falco critical event (privilege escalation)
  • Multiple failed auth attempts (brute force)
  • Pod consuming > 90% resources (DoS)
  • Unscheduled secret access
  
High Priority (< 1 hour):
  • CRITICAL vulnerability in running container
  • Policy violation (unapproved image)
  • Unexpected network connection
  • Certificate expiring < 7 days
```

---

### Response Playbook

**1. Contain**:
```bash
# Isolate compromised pod
kubectl label pod suspicious-pod-xyz quarantine=true

# Apply network policy (deny all)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
spec:
  podSelector:
    matchLabels:
      quarantine: "true"
  policyTypes:
  - Ingress
  - Egress
  # No ingress/egress rules = deny all
EOF

# Stop pod from scheduling
kubectl cordon node-1
```

**2. Investigate**:
```bash
# Collect logs
kubectl logs suspicious-pod-xyz --previous > incident-logs.txt

# Inspect pod spec
kubectl get pod suspicious-pod-xyz -o yaml > pod-spec.yaml

# Check Falco events
kubectl logs -n falco -l app=falco | grep suspicious-pod-xyz

# Audit logs
cat /var/log/kubernetes/audit.log | grep suspicious-pod-xyz
```

**3. Eradicate**:
```bash
# Delete compromised resources
kubectl delete pod suspicious-pod-xyz

# Rotate compromised secrets
kubectl delete secret compromised-secret
# Re-run secret rotation workflow

# Scan for persistence mechanisms
kubectl get all --all-namespaces | grep -i suspicious
```

**4. Recover**:
```bash
# Deploy clean version
kubectl rollout restart deployment/product-service

# Verify integrity
kubectl rollout status deployment/product-service

# Re-enable node
kubectl uncordon node-1
```

**5. Lessons Learned**:
- Document incident timeline
- Update detection rules
- Patch vulnerability
- Review and improve policies
- Conduct post-mortem

---

## 🛠️ Security Tools Reference

### Trivy

**Purpose**: Container, IaC, filesystem vulnerability scanner  
**Usage**:
```bash
# Scan Docker image
trivy image nginx:latest

# Scan filesystem
trivy fs /path/to/code

# Scan Kubernetes manifests
trivy config apps/

# Output formats
trivy image --format json nginx:latest
trivy image --format sarif nginx:latest
```

---

### Checkov

**Purpose**: IaC security scanner (Terraform, Kubernetes, etc.)  
**Usage**:
```bash
# Scan Terraform
checkov -d terraform/

# Scan Kubernetes
checkov -d clusters/

# Specific framework
checkov --framework terraform -d .

# Output to file
checkov -d . --output json > results.json
```

---

### Kyverno

**Purpose**: Kubernetes policy enforcement  
**Usage**:
```bash
# Test policies
kubectl kyverno test policies/kyverno/

# Apply policy
kubectl apply -f policies/kyverno/pod-security.yaml

# Check policy status
kubectl get clusterpolicies

# View policy violations
kubectl get policyreports -A
```

---

### Falco

**Purpose**: Runtime security monitoring  
**Usage**:
```bash
# View alerts
kubectl logs -n falco -l app=falco

# Test rule
falco -r custom-rules.yaml -o json_output=true

# Follow events live
kubectl logs -n falco -l app=falco -f
```

---

### Sealed Secrets

**Purpose**: Encrypt secrets for Git storage  
**Usage**:
```bash
# Encrypt secret
kubectl create secret generic mysecret \
  --from-literal=key=value \
  --dry-run=client -o yaml | \
kubeseal --cert=sealed-secrets-cert.pem \
  --format=yaml > sealed-secret.yaml

# Decrypt (cluster only)
kubectl get sealedsecret mysecret -o yaml | \
kubeseal --recovery-unseal --recovery-private-key privatekey.pem
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Falco Rules Repository](https://github.com/falcosecurity/rules)
- [Kyverno Policies Library](https://kyverno.io/policies/)

---

## ✅ Security Checklist

### Pre-Deployment
- [ ] All images scanned (Trivy)
- [ ] No CRITICAL/HIGH vulnerabilities
- [ ] IaC validated (Checkov)
- [ ] Secrets encrypted (Sealed Secrets)
- [ ] Network policies defined
- [ ] Resource limits set
- [ ] RBAC configured
- [ ] Pod Security Standards enforced

### Post-Deployment
- [ ] Falco monitoring active
- [ ] Alerts configured (PagerDuty)
- [ ] Audit logging enabled
- [ ] Backup strategy tested
- [ ] Incident response plan reviewed
- [ ] Security metrics dashboard created

### Monthly
- [ ] Secret rotation (automated)
- [ ] Security scan (scheduled)
- [ ] Policy review and updates
- [ ] Vulnerability remediation
- [ ] Access review (RBAC)

---

**Last Updated**: March 2026  
**Security Review**: Quarterly  
**Compliance**: PCI DSS, SOC 2, GDPR-ready

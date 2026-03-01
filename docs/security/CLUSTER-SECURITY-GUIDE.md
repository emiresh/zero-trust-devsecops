# Kubernetes Cluster Security Guide
## Complete A-Z Security Hardening for Oracle Cloud ARM64 Cluster

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Security Stack](#current-security-stack)
3. [Network Security](#network-security)
4. [Pod Security](#pod-security)
5. [Access Control (RBAC)](#access-control-rbac)
6. [Resource Management](#resource-management)
7. [Security Context](#security-context)
8. [Image Security](#image-security)
9. [Secrets Management](#secrets-management)
10. [Runtime Security](#runtime-security)
11. [Audit & Compliance](#audit-compliance)
12. [Monitoring & Alerting](#monitoring-alerting)
13. [Backup & Disaster Recovery](#backup-disaster-recovery)
14. [Implementation Plan](#implementation-plan)

---

## 🔒 Overview

This guide covers comprehensive security hardening for your Kubernetes cluster running on Oracle Cloud Infrastructure (ARM64). The security model follows **defense-in-depth** principles with multiple layers of protection.

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    External Layer                            │
│  - TLS/SSL (cert-manager)                                   │
│  - NGINX Ingress                                            │
│  - Let's Encrypt                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Network Layer                              │
│  - Network Policies (default deny)                          │
│  - Application-specific policies                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Access Control Layer                        │
│  - RBAC (least privilege)                                   │
│  - Service Accounts                                         │
│  - Pod Security Standards                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Runtime Layer                               │
│  - Falco (syscall monitoring)                               │
│  - Pod Security Context                                     │
│  - Resource Quotas & Limits                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  - SealedSecrets (encrypted secrets)                        │
│  - Encrypted volumes                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Current Security Stack

### Already Implemented ✅

1. **SealedSecrets**
   - Location: `clusters/test-cluster/05-infrastructure/sealed-secrets/`
   - Purpose: Encrypt secrets for GitOps
   - Status: ✅ Working

2. **Falco Runtime Security**
   - Location: `clusters/test-cluster/05-infrastructure/falco.yaml`
   - Version: 0.42.0
   - Purpose: Runtime threat detection
   - Status: ✅ Working with PagerDuty alerts

3. **TLS/SSL Certificates**
   - Provider: Let's Encrypt via cert-manager
   - Status: ✅ Working

4. **NGINX Ingress Controller**
   - Purpose: Secure HTTP(S) routing
   - Status: ✅ Working

### Newly Created 🆕

1. **Network Policies**
   - Files: `clusters/test-cluster/06-network-policies/`
   - Status: 🆕 Created, not yet applied

2. **Pod Security Standards**
   - File: `clusters/test-cluster/00-namespaces/pod-security-standards.yaml`
   - Status: 🆕 Created, not yet applied

3. **RBAC Roles**
   - File: `clusters/test-cluster/02-rbac/roles.yaml`
   - Status: 🆕 Created, not yet applied

4. **Resource Quotas**
   - File: `clusters/test-cluster/03-resource-management/quotas-and-limits.yaml`
   - Status: 🆕 Created, not yet applied

---

## 🌐 Network Security

### Understanding Network Policies

Network policies are like **firewall rules for Kubernetes pods**. By default, Kubernetes allows all pods to communicate with each other. Network policies enable you to control traffic flow.

### Default Deny Strategy

**File**: `clusters/test-cluster/06-network-policies/default-deny-all.yaml`

This implements **zero-trust networking** - deny everything by default, then explicitly allow what's needed.

```yaml
# Blocks ALL ingress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: dev
spec:
  podSelector: {}        # Applies to all pods
  policyTypes:
    - Ingress
  # No ingress rules = deny all
```

**Why this matters**: If an attacker compromises one pod, they can't automatically access other pods.

### Application-Specific Policies

**File**: `clusters/test-cluster/06-network-policies/freshbonds-network-policies.yaml`

#### FreshBonds Application Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: freshbonds-network-policy
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app: freshbonds
  policyTypes:
    - Ingress
    - Egress
  
  ingress:
    # Allow NGINX Ingress to reach app on port 3000
    - from:
      - namespaceSelector:
          matchLabels:
            name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  
  egress:
    # Allow DNS (required for all apps)
    - to:
      - namespaceSelector:
          matchLabels:
            name: kube-system
      ports:
        - protocol: UDP
          port: 53
    
    # Allow MongoDB connection
    - to:
      - podSelector:
          matchLabels:
            app: mongodb
      ports:
        - protocol: TCP
          port: 27017
```

**Explanation**:
- **Ingress**: Only NGINX can send traffic to FreshBonds on port 3000
- **Egress**: FreshBonds can only talk to DNS (for name resolution) and MongoDB (port 27017)
- **Result**: If FreshBonds is compromised, attacker can't scan internal network or connect to other services

#### Monitoring Exception

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: dev
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    # Allow Prometheus scraping
    - from:
      - namespaceSelector:
          matchLabels:
            name: monitoring
    
    # Allow Falco monitoring
    - from:
      - namespaceSelector:
          matchLabels:
            name: falco
```

### Testing Network Policies

```bash
# 1. Apply default deny
kubectl apply -f clusters/test-cluster/06-network-policies/default-deny-all.yaml

# 2. Test - this should FAIL (timeout)
kubectl run test-pod --rm -i --tty --image=busybox -- wget -O- http://freshbonds:3000

# 3. Apply application policies
kubectl apply -f clusters/test-cluster/06-network-policies/freshbonds-network-policies.yaml

# 4. Test again - still FAILS (only NGINX ingress allowed)
kubectl run test-pod --rm -i --tty --image=busybox -- wget -O- http://freshbonds:3000

# 5. Test from ingress namespace - should WORK
kubectl run test-pod -n ingress-nginx --rm -i --tty --image=busybox -- wget -O- http://freshbonds.dev:3000
```

### Common Network Policy Patterns

#### 1. Database Policy (PostgreSQL/MongoDB)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app: mongodb
  policyTypes:
    - Ingress
  ingress:
    # Only allow specific app pods
    - from:
      - podSelector:
          matchLabels:
            app: freshbonds  # or api-gateway
      ports:
        - protocol: TCP
          port: 27017
```

#### 2. External API Access

```yaml
# Allow egress to specific external IPs
egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0         # All IPs
        except:
          - 10.0.0.0/8          # Except internal
          - 172.16.0.0/12
          - 192.168.0.0/16
    ports:
      - protocol: TCP
        port: 443               # HTTPS only
```

---

## 🔐 Pod Security

### Pod Security Standards (PSS)

Kubernetes has three security profiles:

1. **Privileged**: Unrestricted (development only)
2. **Baseline**: Minimal restrictions (prevents known privilege escalations)
3. **Restricted**: Heavily restricted (production recommended)

**File**: `clusters/test-cluster/00-namespaces/pod-security-standards.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
spec: {}
---
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted  # Warn about restricted violations
    pod-security.kubernetes.io/warn: restricted
spec: {}
```

### What Each Mode Does

- **enforce**: Rejects pods that violate the policy
- **audit**: Logs violations in audit logs
- **warn**: Shows warnings when creating pods

### Restricted Profile Requirements

Pods must have:

1. ✅ `runAsNonRoot: true` - Can't run as root
2. ✅ No privileged containers
3. ✅ No host namespace sharing (hostNetwork, hostPID, hostIPC)
4. ✅ Drop all capabilities
5. ✅ Seccomp profile (RuntimeDefault or Localhost)
6. ✅ Limited volume types (no hostPath)

### Testing Pod Security Standards

```bash
# Apply PSS
kubectl apply -f clusters/test-cluster/00-namespaces/pod-security-standards.yaml

# This will FAIL in production namespace (runs as root)
kubectl run nginx --image=nginx -n production
# Error: pods "nginx" is forbidden: violates PodSecurity "restricted:latest"

# This will SUCCEED (runs as non-root with security context)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: nginx-secure
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: nginx
    image: nginxinc/nginx-unprivileged:latest  # Non-root nginx
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
      readOnlyRootFilesystem: true
    volumeMounts:
      - name: cache
        mountPath: /var/cache/nginx
      - name: run
        mountPath: /var/run
  volumes:
    - name: cache
      emptyDir: {}
    - name: run
      emptyDir: {}
EOF
```

---

## 👥 Access Control (RBAC)

### Understanding RBAC

**RBAC** (Role-Based Access Control) controls **who** can do **what** in your cluster.

**Components**:
- **Role**: Defines permissions (verbs + resources)
- **RoleBinding**: Assigns Role to users/groups/service accounts
- **ServiceAccount**: Identity for pods

**File**: `clusters/test-cluster/02-rbac/roles.yaml`

### Role Examples

#### 1. Developer Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: dev
rules:
  # View and debug pods
  - apiGroups: [""]
    resources: ["pods", "pods/log", "pods/status"]
    verbs: ["get", "list", "watch"]
  
  # Execute into pods (for debugging)
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
  
  # Manage deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  
  # View services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list"]
  
  # View config (but not secrets!)
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
```

**What developers CAN do**:
- View and debug pods (including logs and exec)
- Create/update deployments
- View services and configmaps

**What developers CANNOT do**:
- View or modify secrets
- Delete resources
- Access production namespace
- Modify RBAC roles

#### 2. Viewer Role (Read-Only)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: viewer
  namespace: dev
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

**Use case**: QA, support team, auditors

#### 3. CI/CD Deployer

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-deployer
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-deployer
  namespace: dev
rules:
  # Deploy apps
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  
  # Manage services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  
  # Manage ConfigMaps (not secrets - use SealedSecrets!)
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
```

### Applying RBAC

```bash
# Apply roles
kubectl apply -f clusters/test-cluster/02-rbac/roles.yaml

# Create a test user (requires cert creation)
# Or use service account token

# Get service account token (for CI/CD)
kubectl create token cicd-deployer -n dev --duration=8760h  # 1 year

# Test permissions
kubectl auth can-i create deployments --as=system:serviceaccount:dev:cicd-deployer -n dev
# yes

kubectl auth can-i delete deployments --as=system:serviceaccount:dev:cicd-deployer -n dev
# no

kubectl auth can-i get secrets --as=system:serviceaccount:dev:cicd-deployer -n dev
# no
```

### RBAC Best Practices

1. ✅ **Least Privilege**: Give minimum permissions needed
2. ✅ **Namespace Isolation**: Use Roles (not ClusterRoles) when possible
3. ✅ **Service Accounts**: Use for pod-to-API communication, not for humans
4. ✅ **No Wildcards**: Avoid `resources: ["*"]` in production
5. ✅ **Regular Audits**: Review who has what access quarterly

---

## ⚖️ Resource Management

### Why Resource Limits Matter

**Without limits**:
- One pod can consume all CPU/memory
- Denial of Service (DoS) attacks succeed
- "Noisy neighbor" problems

**File**: `clusters/test-cluster/03-resource-management/quotas-and-limits.yaml`

### Resource Quotas (Namespace Level)

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev
spec:
  hard:
    # Compute
    requests.cpu: "10"              # Total CPU requests
    requests.memory: 20Gi           # Total memory requests
    limits.cpu: "20"                # Total CPU limits
    limits.memory: 40Gi             # Total memory limits
    
    # Objects
    pods: "50"                      # Max 50 pods
    services: "20"
    persistentvolumeclaims: "10"
    
    # Storage
    requests.storage: 100Gi
```

**What this prevents**:
- Dev team accidentally creating 100 pods
- Runaway pod consuming all cluster resources
- Storage exhaustion

### LimitRange (Pod/Container Level)

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev
spec:
  limits:
    # Container defaults
    - type: Container
      default:                      # Default limits
        cpu: 500m
        memory: 512Mi
      defaultRequest:               # Default requests
        cpu: 100m
        memory: 128Mi
      max:                          # Max allowed
        cpu: 2
        memory: 4Gi
      min:                          # Min required
        cpu: 50m
        memory: 64Mi
    
    # Pod limits
    - type: Pod
      max:
        cpu: 4
        memory: 8Gi
```

### Understanding CPU/Memory Units

**CPU**:
- `1` = 1 CPU core
- `1000m` = 1 CPU core (millicores)
- `500m` = 0.5 CPU core
- `100m` = 0.1 CPU core (10% of one core)

**Memory**:
- `1Gi` = 1 Gibibyte (1024 MiB)
- `1G` = 1 Gigabyte (1000 MB)
- `512Mi` = 512 Mebibytes

### Setting Resource Limits in Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: freshbonds
  namespace: dev
spec:
  template:
    spec:
      containers:
      - name: app
        image: freshbonds:latest
        resources:
          requests:              # Guaranteed resources
            cpu: 200m            # 0.2 CPU guaranteed
            memory: 256Mi        # 256Mi guaranteed
          limits:                # Maximum allowed
            cpu: 1               # Can burst to 1 CPU
            memory: 1Gi          # Hard limit 1Gi (OOMKilled if exceeded)
```

**QoS Classes**:
1. **Guaranteed**: requests = limits (highest priority)
2. **Burstable**: requests < limits (medium priority)
3. **BestEffort**: no requests/limits (lowest priority, killed first)

### Testing Resource Limits

```bash
# Apply quotas
kubectl apply -f clusters/test-cluster/03-resource-management/quotas-and-limits.yaml

# Check quota usage
kubectl describe resourcequota dev-quota -n dev

# Try to exceed quota (should fail)
kubectl run big-pod --image=nginx --requests=cpu=100 --limits=cpu=100 -n dev
# Error: exceeded quota

# Check if pod has resources defined
kubectl get pod freshbonds-xxx -n dev -o jsonpath='{.spec.containers[*].resources}'
```

---

## 🛡️ Security Context

### What is Security Context?

Security context defines **privilege and access control settings** for pods and containers. Think of it as "how secure the pod's runtime environment is".

### Example: Insecure Pod (DON'T DO THIS)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: insecure-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    # No security context = runs as root, read-write filesystem
```

**Problems**:
- ❌ Runs as root (UID 0)
- ❌ Read-write root filesystem
- ❌ Can escalate privileges
- ❌ Has ALL Linux capabilities

### Example: Secure Pod (DO THIS)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  # Pod-level security context
  securityContext:
    runAsNonRoot: true              # Enforce non-root
    runAsUser: 1000                 # Run as UID 1000
    runAsGroup: 3000                # Primary GID 3000
    fsGroup: 2000                   # File system group
    seccompProfile:
      type: RuntimeDefault          # Apply default seccomp profile
  
  containers:
  - name: app
    image: myapp:latest
    
    # Container-level security context (overrides pod-level)
    securityContext:
      allowPrivilegeEscalation: false   # Can't gain more privileges
      runAsNonRoot: true                 # Enforce non-root
      runAsUser: 1000
      readOnlyRootFilesystem: true      # Root filesystem is read-only
      capabilities:
        drop:
          - ALL                          # Drop ALL capabilities
        # add:                           # Only add if absolutely needed
        #   - NET_BIND_SERVICE           # To bind to port <1024
    
    # Since root filesystem is read-only, mount writable volumes where needed
    volumeMounts:
      - name: tmp
        mountPath: /tmp
      - name: cache
        mountPath: /app/cache
  
  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir: {}
```

### Security Context Fields Explained

#### runAsNonRoot

```yaml
runAsNonRoot: true  # Kubelet will refuse to start container if image runs as root
```

**Why**: Running as root (UID 0) inside container is dangerous. If attacker escapes container, they're root on host.

#### runAsUser / runAsGroup

```yaml
runAsUser: 1000     # Run as UID 1000 (non-root)
runAsGroup: 3000    # Primary group ID
```

**Why**: Ensures process runs with specific user ID, not root.

#### fsGroup

```yaml
fsGroup: 2000       # Mounted volumes will be owned by GID 2000
```

**Why**: Allows non-root process to read/write volumes.

#### readOnlyRootFilesystem

```yaml
readOnlyRootFilesystem: true  # / is mounted read-only
```

**Why**: 
- Prevents malware from writing to container filesystem
- Blocks common attack techniques (writing shells, backdoors)
- Forces explicit volume mounts for writable areas

**Caveat**: Need to mount emptyDir volumes for `/tmp`, `/var/cache`, etc.

#### allowPrivilegeEscalation

```yaml
allowPrivilegeEscalation: false  # Process can't gain more privileges than parent
```

**Why**: Prevents sudo-like privilege escalation.

#### capabilities

Linux capabilities split root privileges into smaller units.

```yaml
capabilities:
  drop:
    - ALL           # Drop all capabilities
  add:
    - NET_BIND_SERVICE  # Only if need to bind to port <1024
```

**Common capabilities**:
- `NET_BIND_SERVICE`: Bind to ports <1024
- `SYS_ADMIN`: Mount filesystems (dangerous!)
- `NET_ADMIN`: Network configuration
- `SYS_TIME`: Change system time

**Best practice**: Drop ALL, add only what's needed.

#### seccompProfile

Seccomp (Secure Computing Mode) restricts syscalls a process can make.

```yaml
seccompProfile:
  type: RuntimeDefault    # Use container runtime's default profile
  # or
  type: Localhost
  localhostProfile: profiles/audit.json
```

**Why**: Blocks dangerous syscalls attackers might use.

### Updating FreshBonds Deployment

See example file: `examples/secure-deployment-example.yaml`

To update your deployment:

```bash
# Edit deployment template
# Add securityContext sections as shown in example

# Update via ArgoCD
git add apps/freshbonds/templates/deployment.yaml
git commit -m "Add security context to freshbonds deployment"
git push

# Or apply directly
kubectl apply -f apps/freshbonds/templates/deployment.yaml
```

### Common Issues with Security Context

#### 1. Image Runs as Root

```
Error: container has runAsNonRoot and image will run as root
```

**Solution**: Modify Dockerfile

```dockerfile
# Before (runs as root)
FROM node:18
COPY . /app
CMD ["node", "server.js"]

# After (runs as non-root)
FROM node:18
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY --chown=appuser:appuser . /app
USER appuser
CMD ["node", "server.js"]
```

#### 2. Read-Only Filesystem Errors

```
Error: EROFS: read-only file system, open '/tmp/session-xyz'
```

**Solution**: Mount emptyDir for writable areas

```yaml
volumeMounts:
  - name: tmp
    mountPath: /tmp
volumes:
  - name: tmp
    emptyDir: {}
```

#### 3. Port Binding Errors

```
Error: bind EACCES 0.0.0.0:443
```

**Solution**: Either run on port >1024 or add capability

```yaml
# Option 1: Change port to 8443 (preferred)
ports:
  - containerPort: 8443

# Option 2: Add capability (less secure)
securityContext:
  capabilities:
    add:
      - NET_BIND_SERVICE
```

---

## 🖼️ Image Security

### Container Image Vulnerabilities

Container images often have:
- Outdated packages with known CVEs
- Unnecessary tools (shells, package managers)
- Root user by default

### Best Practices

#### 1. Use Minimal Base Images

```dockerfile
# ❌ BAD: 1GB+ image with unnecessary tools
FROM ubuntu:latest
RUN apt-get update && apt-get install -y nodejs npm curl wget git

# ✅ GOOD: <100MB image, minimal attack surface
FROM node:18-alpine
# Alpine has minimal packages, reducing vulnerabilities
```

#### 2. Use Non-Root Users

```dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Set ownership
WORKDIR /app
COPY --chown=appuser:appuser package*.json ./
RUN npm ci --only=production
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

#### 3. Multi-Stage Builds

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
RUN addgroup -S appuser && adduser -S appuser -G appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
USER appuser
CMD ["node", "dist/server.js"]
```

**Benefits**:
- Build tools (gcc, npm, etc.) not in final image
- Smaller image size
- Fewer vulnerabilities

### Image Scanning

#### Using Trivy (Open Source)

```bash
# Install Trivy
brew install aquasecurity/trivy/trivy  # macOS
# or
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy

# Scan image
trivy image freshbonds:latest

# Example output:
# freshbonds:latest (debian 11.5)
# Total: 42 (CRITICAL: 5, HIGH: 12, MEDIUM: 15, LOW: 10)
# 
# ┌─────────────────┬────────────────┬──────────┬───────────────────┬───────────────┐
# │     Library     │ Vulnerability  │ Severity │ Installed Version │ Fixed Version │
# ├─────────────────┼────────────────┼──────────┼───────────────────┼───────────────┤
# │ openssl         │ CVE-2023-12345 │ CRITICAL │ 1.1.1n            │ 1.1.1w        │
# │ libcurl         │ CVE-2023-67890 │ HIGH     │ 7.74.0            │ 7.88.1        │
# └─────────────────┴────────────────┴──────────┴───────────────────┴───────────────┘

# Scan for specific severity
trivy image --severity CRITICAL,HIGH freshbonds:latest

# Exit with error if vulnerabilities found (for CI/CD)
trivy image --exit-code 1 --severity CRITICAL freshbonds:latest
```

#### Integrate into CI/CD

```yaml
# GitHub Actions example
name: Build and Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: docker build -t freshbonds:${{ github.sha }} .
      
      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: freshbonds:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail build if vulnerabilities found
```

### Admission Controllers

Admission controllers intercept requests to Kubernetes API before objects are persisted.

#### OPA Gatekeeper (Policy as Code)

```yaml
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Create constraint template: Deny images from untrusted registries
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: allowedregistries
spec:
  crd:
    spec:
      names:
        kind: AllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package allowedregistries
        
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not startswith(container.image, input.parameters.registries[_])
          msg := sprintf("Image '%v' comes from untrusted registry", [container.image])
        }
---
# Apply constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: prod-allowed-registries
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production"]
  parameters:
    registries:
      - "docker.io/yourorg/"
      - "ghcr.io/yourorg/"
```

**Result**: Pods in production can only use images from approved registries.

---

## 🔑 Secrets Management

### SealedSecrets (Already Implemented ✅)

**Location**: `clusters/test-cluster/05-infrastructure/sealed-secrets/`

**How it works**:
1. Encrypt secret with public key
2. Commit encrypted secret to Git
3. SealedSecrets controller decrypts and creates Secret

```bash
# Encrypt a secret
kubectl create secret generic mysecret \
  --from-literal=username=admin \
  --from-literal=password=super-secret \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-mysecret.yaml

# Commit to Git
git add sealed-mysecret.yaml
git commit -m "Add sealed secret"
git push

# SealedSecrets controller automatically creates Secret in cluster
```

### Additional Secret Security

#### 1. Encryption at Rest

Oracle Cloud encrypts etcd by default, but you can verify:

```bash
# Check if secrets are encrypted
ETCDCTL_API=3 etcdctl \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  get /registry/secrets/dev/mysecret | hexdump -C
```

If encrypted, you'll see `k8s:enc:aescbc:v1:key1:` prefix.

#### 2. External Secrets Operator (Optional)

Use external secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)

```yaml
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system

# Example: Pull secret from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: dev
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-creds
            key: access-key-id
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: dev
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: db-credentials
  data:
  - secretKey: username
    remoteRef:
      key: prod/db/credentials
      property: username
```

#### 3. Secret Rotation

Implement automatic secret rotation:

```bash
# Example: Rotate database password script
#!/bin/bash

# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update database
mysql -e "ALTER USER 'app'@'%' IDENTIFIED BY '${NEW_PASSWORD}';"

# 3. Update Kubernetes secret
kubectl create secret generic db-credentials \
  --from-literal=password="${NEW_PASSWORD}" \
  --dry-run=client -o yaml | \
  kubectl apply -f -

# 4. Restart pods to pick up new secret
kubectl rollout restart deployment/freshbonds -n dev
```

Run this monthly via CronJob.

---

## 🚨 Runtime Security (Falco - Already Implemented ✅)

Your Falco setup is already configured! See `FALCO-COMPLETE-GUIDE.md` for details.

**Quick Reference**:
- **Version**: 0.42.0
- **Driver**: modern_ebpf
- **Alerts**: → AlertManager → PagerDuty
- **UI**: https://falco.k8.publicvm.com

### Additional Falco Rules

Add these to `falco.yaml`:

```yaml
customRules:
  custom-rules.yaml: |-
    # Detect kubectl/helm usage (possible unauthorized access)
    - rule: Unauthorized K8s Client Tool Usage
      desc: Detect kubectl or helm usage inside container
      condition: >
        spawned_process and
        container and
        proc.name in (kubectl, helm) and
        not container.image.repository in (allowed_images)
      output: >
        Kubernetes client tool executed in container
        (user=%user.name command=%proc.cmdline container=%container.name image=%container.image.repository)
      priority: WARNING
      tags: [kubernetes, security]
    
    # Detect outbound connections to suspicious IPs
    - rule: Outbound Connection to Known Bad IP
      desc: Detect connection to malicious IP addresses
      condition: >
        outbound and
        fd.sip in (known_malicious_ips)
      output: >
        Outbound connection to suspicious IP
        (connection=%fd.name ip=%fd.sip container=%container.name image=%container.image.repository)
      priority: CRITICAL
      tags: [network, security]
    
    # Detect sensitive file access
    - rule: Sensitive File Access
      desc: Detect access to sensitive files like /etc/shadow
      condition: >
        open_read and
        container and
        fd.name in (/etc/shadow, /etc/passwd, /root/.ssh/id_rsa)
      output: >
        Sensitive file accessed
        (file=%fd.name user=%user.name container=%container.name)
      priority: WARNING
      tags: [filesystem, security]
```

---

## 📊 Audit & Compliance

### Kubernetes Audit Logs

Audit logs record who did what in your cluster.

#### Enable Audit Logging

1. Create audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log requests to /healthz, /readyz
  - level: None
    nonResourceURLs:
      - /healthz*
      - /readyz*
  
  # Log metadata for secrets (not secret data itself)
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  
  # Log request body for create/update/patch
  - level: Request
    verbs: ["create", "update", "patch"]
    resources:
      - group: ""
        resources: ["pods", "services", "configmaps"]
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets"]
  
  # Log everything else at metadata level
  - level: Metadata
```

2. Update kube-apiserver:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
      - kube-apiserver
      - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
      - --audit-log-path=/var/log/kubernetes/audit.log
      - --audit-log-maxage=30
      - --audit-log-maxbackup=10
      - --audit-log-maxsize=100
    volumeMounts:
      - name: audit-policy
        mountPath: /etc/kubernetes/audit-policy.yaml
        readOnly: true
      - name: audit-log
        mountPath: /var/log/kubernetes
  volumes:
    - name: audit-policy
      hostPath:
        path: /etc/kubernetes/audit-policy.yaml
        type: File
    - name: audit-log
      hostPath:
        path: /var/log/kubernetes
        type: DirectoryOrCreate
```

#### Querying Audit Logs

```bash
# View audit logs
sudo tail -f /var/log/kubernetes/audit.log | jq .

# Find who deleted a pod
cat /var/log/kubernetes/audit.log | jq 'select(.verb=="delete" and .objectRef.resource=="pods")'

# Find all actions by a user
cat /var/log/kubernetes/audit.log | jq 'select(.user.username=="john@example.com")'

# Find all secret access
cat /var/log/kubernetes/audit.log | jq 'select(.objectRef.resource=="secrets")'
```

### CIS Kubernetes Benchmark

The CIS Benchmark provides security best practices.

#### Run kube-bench

```bash
# Install kube-bench
docker run --rm -v /etc:/etc:ro -v /var:/var:ro aquasec/kube-bench:latest

# Example output:
# [INFO] 1 Control Plane Security Configuration
# [PASS] 1.1.1 Ensure API server pod specification file permissions are set to 644 or more restrictive
# [FAIL] 1.2.6 Ensure --kubelet-certificate-authority argument is set
# [WARN] 1.2.15 Ensure admission control plugin NamespaceLifecycle is set
#
# == Summary ==
# 45 checks PASS
# 12 checks FAIL
# 8 checks WARN
```

#### Key CIS Recommendations

1. ✅ Use RBAC (you have this)
2. ✅ Enable audit logging (see above)
3. ✅ Use network policies (you created these)
4. ✅ Restrict anonymous authentication
5. ✅ Use Pod Security Standards (you created this)
6. ✅ Rotate certificates regularly
7. ✅ Enable encryption at rest for secrets

---

## 📈 Monitoring & Alerting (Already Implemented ✅)

Your monitoring stack:
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards
- **AlertManager**: Alert routing
- **PagerDuty**: Incident management

### Security-Specific Alerts

Add these to AlertManager:

```yaml
# prometheus-rules.yaml
groups:
  - name: security-alerts
    interval: 30s
    rules:
      # Alert on failed authentication attempts
      - alert: HighAuthenticationFailureRate
        expr: rate(apiserver_audit_event_total{verb="create",objectRef_resource="tokenreviews",responseStatus_code="401"}[5m]) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High authentication failure rate
          description: "{{ $value }} failed auth attempts per second"
      
      # Alert on privilege escalation attempts
      - alert: PrivilegeEscalationAttempt
        expr: rate(falco_events_total{rule="Privilege Escalation"}[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Privilege escalation attempt detected
          description: "Falco detected privilege escalation in {{ $labels.container }}"
      
      # Alert on suspicious network connections
      - alert: SuspiciousNetworkActivity
        expr: rate(falco_events_total{rule="Outbound Connection to Known Bad IP"}[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Suspicious network activity detected
          description: "Connection to malicious IP from {{ $labels.container }}"
      
      # Alert on secret access
      - alert: SecretAccessed
        expr: rate(apiserver_audit_event_total{objectRef_resource="secrets",verb=~"get|list"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High rate of secret access
          description: "{{ $value }} secret access requests per second by {{ $labels.user }}"
```

---

## 💾 Backup & Disaster Recovery

### Backup Strategy

#### 1. etcd Backup (Critical!)

etcd stores ALL Kubernetes state. Backup regularly.

```bash
#!/bin/bash
# etcd-backup.sh

BACKUP_DIR="/var/backups/etcd"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save "${BACKUP_DIR}/etcd-snapshot-${DATE}.db" \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status "${BACKUP_DIR}/etcd-snapshot-${DATE}.db"

# Upload to object storage
aws s3 cp "${BACKUP_DIR}/etcd-snapshot-${DATE}.db" s3://my-bucket/etcd-backups/

# Delete local backups older than 7 days
find "${BACKUP_DIR}" -name "etcd-snapshot-*.db" -mtime +7 -delete

echo "Backup completed: etcd-snapshot-${DATE}.db"
```

Run daily via cron:

```bash
0 2 * * * /usr/local/bin/etcd-backup.sh
```

#### 2. Velero (Kubernetes Backup)

Velero backs up Kubernetes resources and persistent volumes.

```bash
# Install Velero
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.backupStorageLocation[0].name=default \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket=my-velero-backups \
  --set configuration.backupStorageLocation[0].config.region=us-west-2

# Create daily backup schedule
velero schedule create daily-backup --schedule="0 2 * * *"

# Backup specific namespace
velero backup create dev-backup --include-namespaces dev

# Restore from backup
velero restore create --from-backup dev-backup
```

#### 3. Database Backups

```bash
# MongoDB backup
kubectl exec -n dev mongodb-0 -- mongodump --out=/backup

# PostgreSQL backup
kubectl exec -n dev postgres-0 -- pg_dump -U postgres mydb > backup.sql
```

### Disaster Recovery Plan

1. **Cluster Failure**: Restore from etcd backup
2. **Namespace Deletion**: Restore from Velero backup
3. **Data Corruption**: Restore from database backup
4. **Complete Disaster**: Rebuild cluster from GitOps repo + backups

---

## 🚀 Implementation Plan

### Phase 1: Low-Risk Security (Start Here)

**Goal**: Implement security without breaking existing apps

#### Week 1: Resource Management

```bash
# 1. Apply resource quotas to dev (non-production)
kubectl apply -f clusters/test-cluster/03-resource-management/quotas-and-limits.yaml

# 2. Verify existing pods still work
kubectl get pods -n dev

# 3. Update deployments to include resource limits
# Edit apps/freshbonds/templates/deployment.yaml
# Add resources.requests and resources.limits

# 4. Test application
curl https://freshbonds.k8.publicvm.com
```

#### Week 2: RBAC

```bash
# 1. Apply RBAC roles
kubectl apply -f clusters/test-cluster/02-rbac/roles.yaml

# 2. Create service account tokens for CI/CD
kubectl create token cicd-deployer -n dev --duration=8760h > cicd-token.txt

# 3. Update CI/CD pipeline to use service account token

# 4. Test deployments still work
```

### Phase 2: Security Context (Requires Image Changes)

**Warning**: Requires updating Docker images

#### Week 3-4: Update Images

```bash
# 1. Update Dockerfile to run as non-root
# See examples/secure-deployment-example.yaml

# 2. Build and test locally
docker build -t freshbonds:secure .
docker run -u 1000 freshbonds:secure  # Test as non-root

# 3. Update deployment.yaml with security context

# 4. Deploy to dev namespace first
kubectl apply -f apps/freshbonds/templates/deployment.yaml -n dev

# 5. Test thoroughly

# 6. Deploy to production
```

### Phase 3: Pod Security Standards

**Warning**: Will prevent insecure pods from running

#### Week 5: Dev Namespace

```bash
# 1. Apply baseline PSS to dev namespace
kubectl label namespace dev \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted

# 2. Check for violations
kubectl get pods -n dev

# 3. Fix any violations

# 4. Once all pods pass, upgrade to restricted
kubectl label namespace dev \
  pod-security.kubernetes.io/enforce=restricted --overwrite
```

#### Week 6: Production Namespace

```bash
# Same process for production
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

### Phase 4: Network Policies (HIGHEST RISK)

**Warning**: Will block traffic unless explicitly allowed

#### Week 7: Test in Dev

```bash
# 1. Apply to dev namespace ONLY
kubectl apply -f clusters/test-cluster/06-network-policies/default-deny-all.yaml

# 2. Test application - should FAIL
curl https://freshbonds-dev.k8.publicvm.com

# 3. Apply application-specific policies
kubectl apply -f clusters/test-cluster/06-network-policies/freshbonds-network-policies.yaml

# 4. Test again - should WORK
curl https://freshbonds-dev.k8.publicvm.com

# 5. Test all functionality (database access, API calls, etc.)
```

#### Week 8: Production Rollout

```bash
# 1. Create production-specific network policies
cp clusters/test-cluster/06-network-policies/freshbonds-network-policies.yaml \
   clusters/test-cluster/06-network-policies/freshbonds-production-network-policies.yaml

# Edit to change namespace: dev → production

# 2. Apply during low-traffic period
kubectl apply -f clusters/test-cluster/06-network-policies/default-deny-all.yaml
kubectl apply -f clusters/test-cluster/06-network-policies/freshbonds-production-network-policies.yaml

# 3. Monitor closely
watch kubectl get pods -n production

# 4. Check Falco for network-related alerts
```

### Phase 5: Additional Security

#### Week 9-10

- Enable audit logging
- Set up image scanning in CI/CD
- Implement backup strategy (etcd + Velero)
- Run CIS Benchmark and remediate failures

#### Week 11-12

- Consider admission controllers (OPA Gatekeeper/Kyverno)
- Implement secret rotation
- Set up security dashboards in Grafana
- Document incident response procedures

---

## ✅ Security Checklist

### Authentication & Authorization
- [ ] RBAC configured with least privilege
- [ ] Service accounts for CI/CD
- [ ] No default service account tokens mounted (unless needed)
- [ ] Certificate rotation configured

### Network Security
- [ ] Network policies applied (default deny)
- [ ] Application-specific network policies tested
- [ ] TLS/SSL for all ingress endpoints
- [ ] Internal traffic encrypted (consider service mesh)

### Pod Security
- [ ] Pod Security Standards enforced (restricted in production)
- [ ] Security context on all deployments
- [ ] No privileged containers
- [ ] Read-only root filesystems where possible

### Resource Management
- [ ] Resource quotas per namespace
- [ ] Limit ranges configured
- [ ] Resource requests/limits on all pods

### Secrets
- [ ] SealedSecrets for GitOps
- [ ] No plaintext secrets in Git
- [ ] Secret rotation strategy
- [ ] Encryption at rest enabled

### Images
- [ ] Images scanned for vulnerabilities
- [ ] Only approved registries allowed
- [ ] Images run as non-root
- [ ] Minimal base images used

### Monitoring
- [ ] Falco runtime monitoring
- [ ] Audit logs enabled
- [ ] Security alerts configured
- [ ] Log aggregation (ELK/Loki)

### Backups
- [ ] etcd backups automated
- [ ] Velero for Kubernetes resources
- [ ] Database backups
- [ ] Disaster recovery plan documented

### Compliance
- [ ] CIS Benchmark passed
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Security documentation up to date

---

## 🆘 Troubleshooting

### Network Policy Issues

**Symptom**: App can't connect to database after applying network policies

**Debug**:
```bash
# 1. Check if network policy exists
kubectl get networkpolicy -n dev

# 2. Describe network policy
kubectl describe networkpolicy freshbonds-network-policy -n dev

# 3. Test connectivity
kubectl run test-pod --rm -i --tty --image=busybox -n dev -- wget -O- http://mongodb:27017
# Should timeout if policy is working

# 4. Check pod labels
kubectl get pod -n dev --show-labels | grep mongodb

# 5. Verify policy selector matches
kubectl get networkpolicy freshbonds-network-policy -n dev -o yaml | grep -A5 podSelector
```

**Solution**: Update network policy to allow connection

```yaml
egress:
  - to:
    - podSelector:
        matchLabels:
          app: mongodb  # Must match actual pod labels
    ports:
      - protocol: TCP
        port: 27017
```

### Pod Security Standard Violations

**Symptom**: Pod rejected with "violates PodSecurity"

**Debug**:
```bash
# Check what violated
kubectl describe pod mypod -n production

# Example error:
# Error: pods "mypod" is forbidden: violates PodSecurity "restricted:latest":
# - allowPrivilegeEscalation != false
# - unrestricted capabilities
# - runAsNonRoot != true
```

**Solution**: Add security context (see Security Context section)

### RBAC Permission Denied

**Symptom**: `Error from server (Forbidden): pods is forbidden`

**Debug**:
```bash
# Check what permissions you have
kubectl auth can-i --list --as=system:serviceaccount:dev:cicd-deployer -n dev

# Check specific permission
kubectl auth can-i create deployments --as=system:serviceaccount:dev:cicd-deployer -n dev
```

**Solution**: Update Role with needed permissions

---

## 📚 Additional Resources

### Official Documentation
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-best-practices/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

### Tools
- [Falco](https://falco.org/) - Runtime security
- [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/) - Policy enforcement
- [Trivy](https://trivy.dev/) - Image scanning
- [kube-bench](https://github.com/aquasecurity/kube-bench) - CIS Benchmark
- [Velero](https://velero.io/) - Backup/restore

### Learning
- [KSSP (Kubernetes Security Specialist)](https://training.linuxfoundation.org/certification/kubernetes-security-specialist/)
- [CKS Certification](https://www.cncf.io/certification/cks/)
- [OWASP Kubernetes Top 10](https://owasp.org/www-project-kubernetes-top-ten/)

---

## 🎯 Summary

You now have:

1. ✅ **Runtime Security**: Falco monitoring syscalls and sending alerts
2. 🆕 **Network Security**: Network policies for zero-trust networking
3. 🆕 **Pod Security**: PSS preventing insecure pod configurations
4. 🆕 **Access Control**: RBAC roles limiting what users can do
5. 🆕 **Resource Management**: Quotas preventing resource exhaustion
6. 📚 **Documentation**: Complete guides for implementation

**Next Steps**:
1. Review the implementation plan (Phase 1-5)
2. Start with low-risk changes (quotas, RBAC)
3. Test thoroughly in dev before production
4. Roll out network policies last (highest risk)

**Remember**: Security is a journey, not a destination. Regularly review and update your security posture.

---

*For Falco-specific documentation, see `FALCO-COMPLETE-GUIDE.md`*
*For questions or issues, refer to the Troubleshooting section*

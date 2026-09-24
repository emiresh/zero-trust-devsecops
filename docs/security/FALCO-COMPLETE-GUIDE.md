# Falco Complete Setup Guide - A to Z

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Components](#components)
5. [Writing Custom Rules](#writing-custom-rules)
6. [Testing & Validation](#testing--validation)
7. [AlertManager Integration](#alertmanager-integration)
8. [PagerDuty Integration](#pagerduty-integration)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)
11. [Best Practices](#best-practices)

---

## Overview

### What is Falco?

**Falco** is a cloud-native runtime security tool that detects unexpected behavior, intrusions, and data theft in real-time by monitoring:
- System calls (via eBPF)
- Kubernetes audit logs
- Application behavior

### Your Current Setup

```
Kubernetes Cluster (Oracle Cloud ARM - kernel 6.8.0)
├── Falco v0.42.0 (DaemonSet - 3 nodes)
├── Falcosidekick (Alert Router)
├── Falcosidekick UI (Web Dashboard)
├── AlertManager (Alert Aggregation)
└── PagerDuty (Incident Management)
```

**Key Features:**
- Modern eBPF driver (no kernel module needed)
- Custom security rules
- Automatic alert resolution
- Web UI at https://falco.k8.publicvm.com
- PagerDuty integration
- ARM64 compatible

---

## Architecture

### Complete Alert Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Your Kubernetes Cluster                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Application Pods (dev namespace)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │  FreshBonds  │  │ API Gateway  │  │User Service  │      │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │ │
│  └─────────┼──────────────────┼──────────────────┼─────────────┘ │
│            │                  │                  │                 │
│        System Calls (open, exec, connect, read, write)            │
│            │                  │                  │                 │
│            └──────────────────┴──────────────────┘                 │
│                              ↓                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Linux Kernel (eBPF Hook Points)                │  │
│  │  - sys_enter_execve    - sys_enter_open                     │  │
│  │  - sys_enter_connect   - sys_enter_read                     │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Falco DaemonSet (runs on every node)                │  │
│  │                                                              │  │
│  │  Node: worker-1       Node: worker-2       Node: worker-3  │  │
│  │  ┌──────────────┐     ┌──────────────┐     ┌──────────┐   │  │
│  │  │ Falco Pod    │     │ Falco Pod    │     │ Falco Pod│   │  │
│  │  │ - modern_ebpf│     │ - modern_ebpf│     │ - modern │   │  │
│  │  │ - rules      │     │ - rules      │     │   _ebpf  │   │  │
│  │  │ - gRPC out   │     │ - gRPC out   │     │ - rules  │   │  │
│  │  └──────┬───────┘     └──────┬───────┘     └────┬─────┘   │  │
│  │         │                     │                   │         │  │
│  │         └─────────────────────┴───────────────────┘         │  │
│  └───────────────────────────────┬──────────────────────────────┘  │
│                                  ↓                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Falcosidekick (Alert Router)                │  │
│  │  - Receives: gRPC/HTTP from Falco                           │  │
│  │  - Enriches: Kubernetes metadata                            │  │
│  │  - Routes to:                                               │  │
│  │    • AlertManager (POST /api/v2/alerts)                    │  │
│  │    • Web UI (Store in Redis)                               │  │
│  │    • (Future: Slack, Teams, Elasticsearch, etc.)           │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│                         │                                           │
│            ┌────────────┴────────────┐                             │
│            ↓                         ↓                             │
│  ┌──────────────────┐     ┌──────────────────────┐                │
│  │  Falcosidekick   │     │    AlertManager      │                │
│  │       UI         │     │   (monitoring ns)    │                │
│  │  + Redis         │     │                      │                │
│  │  Port: 2802      │     │  - Groups alerts     │                │
│  │                  │     │  - Deduplicates      │                │
│  │  Credentials:    │     │  - Routes by         │                │
│  │  admin/admin     │     │    severity          │                │
│  └──────────────────┘     └─────────┬────────────┘                │
│                                     ↓                               │
│                          ┌──────────────────────┐                  │
│                          │     PagerDuty        │                  │
│                          │   Events API v2      │                  │
│                          │                      │                  │
│                          │  - Critical alerts   │                  │
│                          │  - Warning alerts    │                  │
│                          │  - Auto-resolve      │                  │
│                          │    after 5 minutes   │                  │
│                          └──────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
Event → Falco Rule Match → Alert Generated → Falcosidekick
                                                    │
                        ┌───────────────────────────┴───────────────┐
                        ↓                                           ↓
                 Web UI (Real-time)                        AlertManager
                   - Display                                    │
                   - Filter                                     ↓
                   - Search                              Route by severity
                                                                │
                                                    ┌───────────┴───────────┐
                                                    ↓                       ↓
                                            pagerduty-critical    pagerduty-notifications
                                                    │                       │
                                                    └───────────┬───────────┘
                                                                ↓
                                                           PagerDuty
                                                         (Your Phone 📱)
```

---

## Installation

### Prerequisites

- Kubernetes cluster (1.28+)
- ARM64 or x86_64 architecture
- Kernel 5.8+ (6.8+ recommended for modern_ebpf)
- ArgoCD installed
- kube-prometheus-stack installed
- PagerDuty account with Events API v2 key

### Step 1: Add Falco Helm Repository

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
```

### Step 2: Create Falco Application Manifest

Create `clusters/test-cluster/05-infrastructure/falco.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: falco
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: monitoring
spec:
  project: default
  source:
    repoURL: https://falcosecurity.github.io/charts
    targetRevision: 7.0.0  # Falco 0.42.0 - ARM64 compatible
    chart: falco
    helm:
      values: |
        # Driver configuration
        driver:
          enabled: true
          kind: modern_ebpf  # Best for kernel 6.8+
        
        # gRPC for Falcosidekick
        grpc:
          enabled: true
          bind_address: "0.0.0.0:5060"
        
        # HTTP output
        http_output:
          enabled: true
          url: "http://falcosidekick:2801"
        
        # Resources
        resources:
          requests:
            cpu: 100m
            memory: 512Mi
          limits:
            cpu: 200m
            memory: 1024Mi
        
        # Rules configuration
        falco:
          rules_files:
            - /etc/falco/falco_rules.yaml
            - /etc/falco/falco_rules.local.yaml
            - /etc/falco/k8s_audit_rules.yaml
            - /etc/falco/rules.d
          
          priority: notice
          json_output: true
          json_include_output_property: true
        
        # Custom rules (see Writing Custom Rules section)
        customRules:
          custom-rules.yaml: |-
            # Your custom rules here
        
        # Falcosidekick configuration
        falcosidekick:
          enabled: true
          replicaCount: 1
          
          config:
            # AlertManager integration (v2 API)
            alertmanager:
              hostport: "http://kube-prometheus-stack-alertmanager.monitoring:9093"
              endpoint: "/api/v2/alerts"
              minimumpriority: "warning"
              checkcert: false
            
            customfields: "environment:production,cluster:test-cluster"
          
          # Web UI
          webui:
            enabled: true
          
          service:
            type: ClusterIP
            port: 2801

  destination:
    server: https://kubernetes.default.svc
    namespace: falco
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Step 3: Apply via ArgoCD

```bash
kubectl apply -f clusters/test-cluster/05-infrastructure/falco.yaml
```

### Step 4: Verify Installation

```bash
# Check pods
kubectl get pods -n falco

# Expected output:
# NAME                                      READY   STATUS    RESTARTS   AGE
# falco-xxxxx                               2/2     Running   0          2m
# falco-yyyyy                               2/2     Running   0          2m
# falco-zzzzz                               2/2     Running   0          2m
# falco-falcosidekick-xxxxxxxxxx-xxxxx      1/1     Running   0          2m
# falco-falcosidekick-ui-xxxxxxxx-xxxxx     1/1     Running   0          2m
# falco-falcosidekick-ui-redis-0            1/1     Running   0          2m

# Check Falco is capturing events
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=20
```

### Step 5: Create Ingress for Web UI

Create `clusters/test-cluster/15-ingress/falco-ui-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: falco-ui-ingress
  namespace: falco
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"  # Allow ACME challenge
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - falco.k8.publicvm.com
      secretName: falco-ui-tls
  rules:
    - host: falco.k8.publicvm.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: falco-falcosidekick-ui
                port:
                  number: 2802
```

Apply:
```bash
kubectl apply -f clusters/test-cluster/15-ingress/falco-ui-ingress.yaml
```

Access Web UI:
- URL: https://falco.k8.publicvm.com
- Username: `admin`
- Password: `admin`

---

## Components

### 1. Falco (DaemonSet)

**Purpose:** Runtime security monitoring on each node

**Key Features:**
- Runs on every worker node
- Captures system calls via eBPF
- Evaluates events against rules
- Sends alerts to Falcosidekick

**Configuration Location:**
```
/etc/falco/falco.yaml          # Main config
/etc/falco/falco_rules.yaml    # Default rules (100+)
/etc/falco/rules.d/            # Custom rules
```

**Check Status:**
```bash
kubectl get pods -n falco -l app.kubernetes.io/name=falco
kubectl logs -n falco falco-xxxxx -c falco --tail=50
```

### 2. Falcosidekick (Deployment)

**Purpose:** Alert routing middleware

**Key Features:**
- Receives alerts from Falco (gRPC/HTTP)
- Enriches with Kubernetes metadata
- Routes to multiple destinations
- Supports 50+ output types

**Supported Outputs:**
- AlertManager (configured)
- Web UI (configured)
- Slack
- Microsoft Teams
- Discord
- Elasticsearch
- Loki
- Kafka
- AWS SNS/SQS
- Google Chat
- And 40+ more...

**Configuration:**
```bash
kubectl get deployment -n falco falco-falcosidekick -o yaml
```

### 3. Falcosidekick UI (Deployment + Redis)

**Purpose:** Web dashboard for security events

**Key Features:**
- Real-time event display
- Filtering by severity, rule, container
- Event search
- Statistics and charts
- Redis for event storage

**Access:**
```bash
# Port-forward for local access
kubectl port-forward -n falco svc/falco-falcosidekick-ui 2802:2802

# Access at: http://localhost:2802
# Or via ingress: https://falco.k8.publicvm.com
```

**Change Default Password:**

Edit the Falco application and add:
```yaml
falcosidekick:
  webui:
    user: "newuser:newpassword"  # Format: username:password
```

### 4. AlertManager Integration

**Purpose:** Alert aggregation and routing to PagerDuty

**Key Features:**
- Groups similar alerts
- Deduplicates
- Routes by severity
- Auto-resolves after timeout

**Configuration:**
```yaml
# In AlertManager config
route:
  receiver: pagerduty-notifications
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
    - match:
        severity: warning
      receiver: pagerduty-notifications
```

---

## Writing Custom Rules

### Rule Structure

```yaml
- rule: Rule Name
  desc: Human-readable description
  condition: Boolean expression using Falco fields
  output: Message template with placeholders
  priority: EMERGENCY|ALERT|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG
  tags: [tag1, tag2]
  enabled: true
  warn_evttypes: false
  skip-if-unknown-filter: false
```

### Available Fields

#### Process Fields
```
proc.name           # Process name (e.g., "bash", "apt-get")
proc.cmdline        # Full command line
proc.exepath        # Executable path
proc.pname          # Parent process name
proc.ppid           # Parent process ID
proc.tty            # Terminal (0 = no terminal)
```

#### Container Fields
```
container           # Boolean: is this in a container?
container.id        # Container ID
container.name      # Container name
container.image.repository  # Image name (e.g., "ubuntu")
container.image.tag         # Image tag (e.g., "latest")
```

#### Kubernetes Fields
```
k8s.ns.name         # Namespace (e.g., "dev", "production")
k8s.pod.name        # Pod name
k8s.deployment.name # Deployment name
k8s.service.name    # Service name
```

#### User Fields
```
user.name           # Username
user.uid            # User ID
user.loginuid       # Login UID
```

#### File Fields
```
fd.name             # File descriptor name
fd.directory        # File directory
fd.type             # File type (file, ipv4, ipv6, unix)
fd.typechar         # Type character (f, 4, 6, u)
```

#### Network Fields
```
fd.l4proto          # Protocol (tcp, udp)
fd.lport            # Local port
fd.rport            # Remote port
fd.ip               # IP address
```

### Macros (Reusable Conditions)

Falco includes built-in macros:

```yaml
# Process spawned
spawned_process

# Is in a container
container

# Common shells
shell_procs         # bash, sh, zsh, etc.

# Package managers
package_mgmt_procs  # apt, yum, pip, npm (if defined)

# Sensitive files
sensitive_files     # /etc/shadow, /etc/passwd, etc.

# Interactive terminal
interactive         # proc.tty != 0
```

### Your Current Custom Rules

#### 1. Shell Spawned in Container

```yaml
- rule: Shell Spawned in Container
  desc: A shell was spawned in a container
  condition: >
    spawned_process and
    container and
    shell_procs and
    proc.tty != 0
  output: >
    Shell spawned in container (user=%user.name container=%container.name
    shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline terminal=%proc.tty
    image=%container.image.repository)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

**When it triggers:**
- `kubectl exec -it pod -- /bin/bash`
- `docker exec -it container bash`
- Any interactive shell in a container

**Why it matters:**
- Attackers use shells to explore compromised systems
- Production containers shouldn't need interactive access
- Helps detect lateral movement

**How to tune:**

Exclude specific containers:
```yaml
condition: >
  spawned_process and
  container and
  shell_procs and
  proc.tty != 0 and
  not container.image.repository in (debug-tools, busybox)
```

Exclude specific namespaces:
```yaml
condition: >
  spawned_process and
  container and
  shell_procs and
  proc.tty != 0 and
  not k8s.ns.name in (dev, testing)
```

#### 2. Package Management in Container

```yaml
- rule: Package Management in Container
  desc: Package management tools executed in container
  condition: >
    spawned_process and
    container and
    proc.name in (apt, apt-get, yum, dnf, rpm, dpkg, apk, pip, pip3, npm, yarn)
  output: >
    Package management process in container (user=%user.name
    command=%proc.cmdline container=%container.name
    image=%container.image.repository:%container.image.tag)
  priority: WARNING
  tags: [container, process, mitre_persistence]
```

**When it triggers:**
- `apt-get install curl`
- `pip install requests`
- `npm install express`

**Why it matters:**
- Container images should be immutable
- Installing packages at runtime indicates incomplete image
- Attackers install tools after compromise

**How to tune:**

Allow during CI/CD builds:
```yaml
condition: >
  spawned_process and
  container and
  proc.name in (apt, apt-get, yum, pip, npm) and
  not k8s.ns.name = "ci-cd" and
  not container.image.repository startswith "builder-"
```

#### 3. Crypto Mining Detection

```yaml
- rule: Detect Crypto Mining
  desc: Detect cryptocurrency miners
  condition: >
    spawned_process and
    (proc.name in (xmrig, cpuminer, ethminer, ccminer) or
     proc.cmdline contains "stratum+tcp" or
     proc.cmdline contains "xmr-stak" or
     proc.cmdline contains "xmrig" or
     proc.cmdline contains "minerd")
  output: >
    Crypto mining activity detected (user=%user.name
    command=%proc.cmdline container=%container.name)
  priority: CRITICAL
  tags: [process, mitre_impact]
```

**When it triggers:**
- Known crypto mining binaries
- Stratum mining protocol connections
- Common mining pool connections

**Why it matters:**
- Cryptojacking is extremely common
- Uses your compute resources
- Indicates system compromise

**How to add more miners:**
```yaml
condition: >
  spawned_process and
  (proc.name in (xmrig, cpuminer, ethminer, ccminer, t-rex, lolminer, gminer) or
   proc.cmdline contains "stratum+tcp" or
   proc.cmdline contains "stratum+ssl" or
   proc.cmdline contains "pool.supportxmr.com" or
   proc.cmdline contains "pool.minexmr.com")
```

### More Custom Rule Examples

#### Detect Sensitive File Access

```yaml
- rule: Read Sensitive File
  desc: Detect reads of sensitive files
  condition: >
    open_read and
    sensitive_files and
    not proc.name in (systemd, sshd, containerd)
  output: >
    Sensitive file accessed (file=%fd.name user=%user.name
    process=%proc.name cmdline=%proc.cmdline container=%container.name)
  priority: WARNING
  tags: [filesystem, mitre_credential_access]

# sensitive_files macro includes:
# - /etc/shadow
# - /etc/sudoers
# - /etc/pam.conf
# - ~/.ssh/id_rsa
# - ~/.aws/credentials
```

#### Detect Outbound Connections

```yaml
- rule: Unexpected Outbound Connection
  desc: Container making unexpected network connections
  condition: >
    outbound and
    container and
    fd.l4proto = tcp and
    not fd.sport in (80, 443, 53) and
    not fd.sip in (10.96.0.1)  # Kubernetes API
  output: >
    Unexpected outbound connection (connection=%fd.name container=%container.name
    process=%proc.name cmdline=%proc.cmdline)
  priority: WARNING
  tags: [network, mitre_exfiltration]
```

#### Detect Privilege Escalation

```yaml
- rule: Privilege Escalation via Setuid
  desc: Detect privilege escalation attempts
  condition: >
    spawned_process and
    proc.name in (sudo, su) and
    not user.name = root
  output: >
    Privilege escalation attempt (user=%user.name target=%proc.name
    cmdline=%proc.cmdline container=%container.name)
  priority: CRITICAL
  tags: [process, mitre_privilege_escalation]
```

#### Detect Container Escape Attempts

```yaml
- rule: Container Escape Attempt
  desc: Detect container escape via namespace changes
  condition: >
    spawned_process and
    container and
    proc.name in (nsenter, unshare, docker, crictl)
  output: >
    Container escape attempt detected (user=%user.name process=%proc.name
    cmdline=%proc.cmdline container=%container.name)
  priority: CRITICAL
  tags: [container, mitre_escape]
```

#### Detect Reverse Shell

```yaml
- rule: Reverse Shell Detected
  desc: Detect reverse shell via stdin/stdout redirection
  condition: >
    spawned_process and
    (proc.cmdline contains "/dev/tcp" or
     proc.cmdline contains "bash -i" or
     proc.cmdline contains "nc -e" or
     proc.cmdline contains "ncat -e")
  output: >
    Reverse shell detected (user=%user.name cmdline=%proc.cmdline
    container=%container.name)
  priority: CRITICAL
  tags: [network, mitre_command_control]
```

### Testing Rules

#### Method 1: Local Testing

```bash
# Create test file
cat > test-rules.yaml <<EOF
- rule: Test Rule
  desc: Test rule description
  condition: spawned_process and proc.name = "test-trigger"
  output: Test alert triggered (process=%proc.name)
  priority: WARNING
  tags: [test]
EOF

# Validate syntax
falco -r test-rules.yaml --validate
```

#### Method 2: Apply to Cluster

```bash
# Edit your falco.yaml
# Add the rule under customRules section
kubectl apply -f clusters/test-cluster/05-infrastructure/falco.yaml

# Wait for pods to reload (or restart manually)
kubectl rollout restart daemonset/falco -n falco

# Trigger the rule
kubectl run test-rule --image=busybox -n dev --rm --restart=Never -- sh -c "test-trigger"

# Check if alert fired
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=20 | grep "Test alert"
```

---

## Testing & Validation

### Test Suite

Create a test script `scripts/test-falco-rules.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Testing Falco Rules"

NAMESPACE="dev"

# Test 1: Shell Detection
echo "Test 1: Shell Spawned in Container"
kubectl run test-shell --image=ubuntu -n $NAMESPACE --rm -it --restart=Never -- bash -c "echo 'Test passed'; sleep 2"

sleep 5
echo "✅ Check Falco logs for 'Shell spawned in container'"

# Test 2: Package Management
echo "Test 2: Package Management Detection"
kubectl run test-package --image=ubuntu -n $NAMESPACE --rm --restart=Never -- bash -c "apt-get update && sleep 2"

sleep 5
echo "✅ Check Falco logs for 'Package management process'"

# Test 3: Crypto Mining
echo "Test 3: Crypto Mining Detection"
kubectl run test-mining --image=ubuntu -n $NAMESPACE --rm --restart=Never -- bash -c "curl -o /tmp/test stratum+tcp://fake-pool.com:3333; sleep 2"

sleep 5
echo "✅ Check Falco logs for 'Crypto mining activity'"

# Check logs
echo ""
echo "📊 Recent Falco Alerts:"
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --since=2m --tail=50 | grep -E "Warning|Critical"

echo ""
echo "🎉 Test suite complete!"
```

Make executable:
```bash
chmod +x scripts/test-falco-rules.sh
./scripts/test-falco-rules.sh
```

### Validation Checklist

- [ ] Falco pods are running (2/2 containers each)
- [ ] Falco is capturing events (check logs)
- [ ] Falcosidekick is running
- [ ] Falcosidekick UI is accessible
- [ ] AlertManager receives alerts (POST OK 200)
- [ ] PagerDuty receives incidents
- [ ] Alerts auto-resolve after 5 minutes
- [ ] Web UI shows events in real-time

### View Alerts

#### 1. Falco Logs (Raw Events)

```bash
# Recent alerts
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=50

# Filter by priority
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=100 | grep "Warning"
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=100 | grep "Critical"

# Filter by rule
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=100 | grep "Shell"
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=100 | grep "Package"

# Live stream
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco -f
```

#### 2. Falcosidekick Logs (Routing)

```bash
# Check successful delivery
kubectl logs -n falco deployment/falco-falcosidekick --tail=50 | grep "POST OK"

# Check errors
kubectl logs -n falco deployment/falco-falcosidekick --tail=50 | grep "ERROR"

# Check AlertManager delivery
kubectl logs -n falco deployment/falco-falcosidekick --tail=50 | grep "AlertManager"
```

#### 3. Web UI

```bash
# Port-forward
kubectl port-forward -n falco svc/falco-falcosidekick-ui 2802:2802

# Open browser
open http://localhost:2802

# Or use ingress
open https://falco.k8.publicvm.com
```

Credentials: `admin` / `admin`

#### 4. AlertManager

```bash
# Port-forward
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093

# Open browser
open http://localhost:9093

# Or use ingress
open https://alertmanager.k8.publicvm.com
```

#### 5. PagerDuty

Log into your PagerDuty account and check:
- Services → Your Service → Incidents
- Look for alerts with titles like:
  - "Package management process in container"
  - "Shell spawned in container"
  - "Crypto mining activity detected"

---

## AlertManager Integration

### Configuration in Your Setup

#### Falcosidekick → AlertManager

```yaml
# In falco.yaml
falcosidekick:
  config:
    alertmanager:
      hostport: "http://kube-prometheus-stack-alertmanager.monitoring:9093"
      endpoint: "/api/v2/alerts"         # Important: Use v2 API
      minimumpriority: "warning"         # Send WARNING and higher
      checkcert: false
```

**Key Points:**
- Use `/api/v2/alerts` endpoint (v1 is deprecated)
- `minimumpriority: "warning"` means NOTICE and INFO are ignored
- `hostport` is the full base URL
- `endpoint` is appended to hostport

#### AlertManager Routing

```yaml
# Current AlertManager config
route:
  receiver: pagerduty-notifications
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
    
    - match:
        severity: warning
      receiver: pagerduty-notifications

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-key/integration-key
        description: "{{ .GroupLabels.alertname }}"
        severity: critical
  
  - name: pagerduty-notifications
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-key/integration-key
        description: "{{ .GroupLabels.alertname }}"
        severity: warning
```

### Alert Grouping & Deduplication

AlertManager groups alerts by:
- `alertname`
- `cluster`
- `service`

**Example:**
- 20 "Package Management" alerts from same pod
- Grouped into 1 PagerDuty incident
- When resolved, closes single incident

**Configuration:**
```yaml
route:
  group_by: [alertname, cluster, service]
  group_wait: 10s          # Wait 10s before sending first alert in group
  group_interval: 10s      # Wait 10s between sending batches
  repeat_interval: 12h     # Resend after 12h if still firing
```

### Auto-Resolution

**How it works:**
1. Alert fires → sent to PagerDuty (status: FIRING)
2. Alert stops → AlertManager waits `resolve_timeout`
3. After timeout → sent to PagerDuty (status: RESOLVED)

**Current Configuration:**
```yaml
global:
  resolve_timeout: 5m  # Auto-resolve after 5 minutes of silence
```

**Adjust timeout:**

Edit `kube-prometheus-stack.yaml`:
```yaml
alertmanager:
  config:
    global:
      resolve_timeout: 10m  # Change to 10 minutes
```

---

## PagerDuty Integration

### Setup Steps

#### 1. Get PagerDuty Integration Key

1. Log into PagerDuty
2. Go to **Services** → Your Service
3. Click **Integrations** tab
4. Add **Events API V2** integration
5. Copy the **Integration Key**

#### 2. Create Secret

```bash
# Create secret in monitoring namespace
kubectl create secret generic alertmanager-pagerduty-key \
  -n monitoring \
  --from-literal=integration-key='YOUR_INTEGRATION_KEY_HERE'
```

#### 3. Configure AlertManager

Edit `clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml`:

```yaml
alertmanager:
  config:
    global:
      pagerduty_url: https://events.pagerduty.com/v2/enqueue
      resolve_timeout: 5m
    
    route:
      receiver: pagerduty-notifications
      routes:
        - match:
            severity: critical
          receiver: pagerduty-critical
        - match:
            severity: warning
          receiver: pagerduty-notifications
    
    receivers:
      - name: pagerduty-critical
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-key/integration-key
            description: "🚨 {{ .GroupLabels.alertname }}"
            details:
              cluster: "{{ .GroupLabels.cluster }}"
              namespace: "{{ .GroupLabels.namespace }}"
              pod: "{{ .GroupLabels.pod }}"
              summary: "{{ .Annotations.summary }}"
              description: "{{ .Annotations.description }}"
      
      - name: pagerduty-notifications
        pagerduty_configs:
          - routing_key_file: /etc/alertmanager/secrets/alertmanager-pagerduty-key/integration-key
            description: "⚠️ {{ .GroupLabels.alertname }}"
```

#### 4. Mount Secret in AlertManager

```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - alertmanager-pagerduty-key
```

#### 5. Apply Changes

```bash
kubectl apply -f clusters/test-cluster/05-infrastructure/kube-prometheus-stack.yaml
```

### Verify Integration

```bash
# Test with curl
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test Alert from Falco",
      "severity": "warning",
      "source": "falco-test"
    }
  }'

# Should return: {"status":"success","message":"Event processed"}
```

### PagerDuty Alert Format

Alerts in PagerDuty will show:

**Title:**
- Shell Spawned in Container (CRITICAL)
- Package Management in Container (WARNING)

**Details:**
- Cluster: test-cluster
- Namespace: dev
- Pod: test-pod
- Container: ubuntu
- User: root
- Command: apt-get update
- Image: ubuntu:latest

**Timeline:**
- Triggered: 2025-11-16 06:07:57 UTC
- Resolved: 2025-11-16 06:13:00 UTC
- Duration: 5 minutes

---

## Troubleshooting

### Common Issues

#### 1. Falco Pods Not Starting

**Symptom:**
```bash
kubectl get pods -n falco
# NAME          READY   STATUS             RESTARTS   AGE
# falco-xxxxx   0/2     Init:Error         3          2m
```

**Check driver errors:**
```bash
kubectl logs -n falco falco-xxxxx -c falco-driver-loader
```

**Common causes:**

**A. Kernel headers missing**
```
Error: Kernel headers not found
```
Solution:
```bash
# On nodes, install headers
sudo apt-get install linux-headers-$(uname -r)
```

**B. eBPF not supported**
```
Error: BPF not supported
```
Solution: Switch to kernel module driver
```yaml
driver:
  kind: module
```

**C. ARM64 compatibility**
```
Error: failed to build driver
```
Solution: Use Falco 0.42.0+ with modern_ebpf
```yaml
source:
  targetRevision: 7.0.0  # Falco 0.42.0
driver:
  kind: modern_ebpf
```

#### 2. Alerts Not Reaching AlertManager

**Symptom:**
```bash
kubectl logs -n falco deployment/falco-falcosidekick | grep ERROR
# AlertManager - unexpected Response (410)
# AlertManager - 410 Gone
```

**Cause:** Using deprecated v1 API

**Solution:**
```yaml
alertmanager:
  hostport: "http://kube-prometheus-stack-alertmanager.monitoring:9093"
  endpoint: "/api/v2/alerts"  # Add this line
```

**Symptom:**
```
AlertManager - resource not found (404)
```

**Cause:** Wrong endpoint URL

**Solution:** Check endpoint is correct:
```bash
# Should be:
# hostport: http://service:9093
# endpoint: /api/v2/alerts
# NOT: hostport: http://service:9093/api/v2/alerts
```

#### 3. Alerts Not Reaching PagerDuty

**Check AlertManager logs:**
```bash
kubectl logs -n monitoring alertmanager-xxx -c alertmanager | grep pagerduty
```

**Common errors:**

**A. Invalid integration key**
```
error sending to PagerDuty: HTTP 400: Invalid routing_key
```
Solution: Check secret
```bash
kubectl get secret alertmanager-pagerduty-key -n monitoring -o jsonpath='{.data.integration-key}' | base64 -d
```

**B. Secret not mounted**
```
error: open /etc/alertmanager/secrets/alertmanager-pagerduty-key/integration-key: no such file
```
Solution: Add to alertmanagerSpec
```yaml
alertmanager:
  alertmanagerSpec:
    secrets:
      - alertmanager-pagerduty-key
```

#### 4. No Alerts Being Generated

**Check Falco is running:**
```bash
kubectl logs -n falco falco-xxxxx -c falco --tail=20
```

Should see:
```
Opening 'syscall' source with modern BPF probe.
Enabled event sources: syscall
```

**Trigger test alert:**
```bash
kubectl run test --image=ubuntu -n dev --rm --restart=Never -- bash -c "apt-get update"
```

**Check alert was captured:**
```bash
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --since=1m | grep "Package"
```

**Check priority threshold:**
```yaml
# In falco.yaml
falcosidekick:
  config:
    alertmanager:
      minimumpriority: "warning"  # Must be <= rule priority
```

#### 5. Web UI Not Accessible

**Check pods:**
```bash
kubectl get pods -n falco -l app.kubernetes.io/name=falcosidekick-ui
```

**Check ingress:**
```bash
kubectl get ingress -n falco falco-ui-ingress
```

**Check certificate:**
```bash
kubectl get cert -n falco falco-ui-tls
# Should be READY: True
```

**Port-forward to bypass ingress:**
```bash
kubectl port-forward -n falco svc/falco-falcosidekick-ui 2802:2802
open http://localhost:2802
```

### Debug Commands

```bash
# Complete health check script
cat > debug-falco.sh <<'EOF'
#!/bin/bash

echo "=== Falco Pods ==="
kubectl get pods -n falco

echo -e "\n=== Falco Logs (last 10 lines) ==="
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=10

echo -e "\n=== Falcosidekick Status ==="
kubectl get deployment -n falco falco-falcosidekick

echo -e "\n=== Falcosidekick Logs (AlertManager) ==="
kubectl logs -n falco deployment/falco-falcosidekick --tail=20 | grep AlertManager

echo -e "\n=== AlertManager Config ==="
kubectl get secret -n monitoring alertmanager-kube-prometheus-stack-alertmanager \
  -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d | grep -A 5 "pagerduty"

echo -e "\n=== PagerDuty Secret ==="
kubectl get secret -n monitoring alertmanager-pagerduty-key -o jsonpath='{.data.integration-key}' \
  | base64 -d | head -c 20 && echo "..."

echo -e "\n=== Recent Alerts ==="
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --since=5m | grep -E "Warning|Critical" | tail -5

echo -e "\n✅ Debug complete"
EOF

chmod +x debug-falco.sh
./debug-falco.sh
```

---

## Advanced Configuration

### Performance Tuning

#### CPU Buffer Configuration

```yaml
# For high-event environments
driver:
  modern_ebpf:
    cpus_for_each_buffer: 1  # More buffers = better performance
    buf_size_preset: 8       # Larger buffers (4, 8, 16 available)
```

#### Drop Alerts Threshold

```yaml
# Prevent Falco from being overwhelmed
falco:
  syscall_event_drops:
    threshold: 0.1  # Alert if dropping >10% of events
    actions:
      - log
      - alert
```

### Rule Optimization

#### Reduce False Positives

```yaml
# Add exceptions list
- list: allowed_shell_users
  items: [root, admin, operator]

- rule: Shell Spawned in Container
  condition: >
    spawned_process and
    container and
    shell_procs and
    proc.tty != 0 and
    not user.name in (allowed_shell_users)
```

#### Namespace Filtering

```yaml
# Only monitor production
- macro: production_namespace
  condition: k8s.ns.name in (production, prod)

- rule: Shell Spawned in Container
  condition: >
    spawned_process and
    container and
    production_namespace and
    shell_procs
```

### Multi-Cluster Setup

For multiple clusters sending to same PagerDuty:

```yaml
# Add cluster label
falcosidekick:
  config:
    customfields: "cluster:prod-us-east,environment:production"
```

In AlertManager:
```yaml
route:
  group_by: [alertname, cluster, namespace]
  routes:
    - match:
        cluster: prod-us-east
        severity: critical
      receiver: pagerduty-prod-critical
```

### Custom Output Formats

#### Slack Integration

```yaml
falcosidekick:
  config:
    slack:
      webhookurl: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
      minimumpriority: "warning"
      messageformat: |
        🚨 *{{ .Rule }}*
        
        Container: `{{ .OutputFields.container_name }}`
        Image: `{{ .OutputFields.container_image_repository }}`
        User: `{{ .OutputFields.user_name }}`
        Command: `{{ .OutputFields.proc_cmdline }}`
```

#### Elasticsearch Integration

```yaml
falcosidekick:
  config:
    elasticsearch:
      hostport: "http://elasticsearch.logging:9200"
      index: "falco"
      type: "event"
      minimumpriority: "notice"
```

### High Availability

#### Falco (Already HA via DaemonSet)
- Runs on every node automatically
- No additional config needed

#### Falcosidekick HA

```yaml
falcosidekick:
  replicaCount: 3  # Multiple replicas
  
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  
  # Anti-affinity to spread across nodes
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/name: falcosidekick
            topologyKey: kubernetes.io/hostname
```

---

## Best Practices

### Security

1. **Change default Web UI password**
   ```yaml
   falcosidekick:
     webui:
       user: "secure-user:strong-password"
   ```

2. **Enable HTTPS for Web UI**
   - Already configured with Let's Encrypt cert-manager
   - SSL redirect enabled in ingress

3. **Rotate PagerDuty integration keys regularly**
   ```bash
   kubectl create secret generic alertmanager-pagerduty-key \
     -n monitoring \
     --from-literal=integration-key='NEW_KEY' \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

4. **Use RBAC for Falco namespace**
   ```yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: Role
   metadata:
     name: falco-viewer
     namespace: falco
   rules:
     - apiGroups: [""]
       resources: ["pods", "pods/log"]
       verbs: ["get", "list"]
   ```

### Monitoring

1. **Monitor Falco itself**
   - Already configured: `falco-security-alerts` PrometheusRule
   - Alerts: FalcoDown, FalcoHighEventRate, FalcoDroppedEvents

2. **Set up dashboards**
   - Grafana dashboard for Falco metrics
   - PagerDuty analytics for incident trends

3. **Regular rule reviews**
   - Weekly: Review false positives
   - Monthly: Update rules for new threats
   - Quarterly: Audit all custom rules

### Operational

1. **Test alerts regularly**
   ```bash
   # Weekly test script
   ./scripts/test-falco-rules.sh
   ```

2. **Document custom rules**
   - Why was rule created?
   - What threats does it detect?
   - Known false positives?
   - Last review date?

3. **Version control everything**
   - All Falco config in Git
   - Custom rules in Git
   - Test scripts in Git
   - Documentation in Git

4. **Backup critical configs**
   ```bash
   # Backup script
   kubectl get secret alertmanager-pagerduty-key -n monitoring -o yaml > backup-pagerduty-secret.yaml
   kubectl get configmap -n falco -o yaml > backup-falco-config.yaml
   ```

### Rule Development Workflow

1. **Start with NOTICE priority**
   - Observe patterns for 1 week
   - Identify false positives

2. **Add exceptions**
   - Create exception lists
   - Test thoroughly

3. **Increase to WARNING**
   - Monitor for 1 week
   - Refine as needed

4. **Promote to CRITICAL only if**
   - High confidence detection
   - Low false positive rate
   - Requires immediate action

### Alert Fatigue Prevention

1. **Group related alerts**
   ```yaml
   route:
     group_by: [alertname, pod, namespace]
     group_interval: 5m
   ```

2. **Set appropriate thresholds**
   - Don't alert on single package install
   - Alert on repeated suspicious activity

3. **Use different receivers by environment**
   ```yaml
   routes:
     - match:
         namespace: production
         severity: critical
       receiver: pagerduty-critical
     
     - match:
         namespace: dev
         severity: critical
       receiver: slack-dev
   ```

---

## Reference

### Important Files in Your Setup

```
zero-trust-devsecops/
├── clusters/test-cluster/
│   ├── 05-infrastructure/
│   │   ├── falco.yaml                    # Main Falco config
│   │   └── kube-prometheus-stack.yaml    # AlertManager config
│   ├── 15-ingress/
│   │   └── falco-ui-ingress.yaml        # Web UI ingress
│   └── falco-prometheus-rules.yaml       # Falco health monitoring
├── scripts/
│   └── test-falco-rules.sh              # Test script
└── secrets/
    └── alertmanager-pagerduty-secret.yaml  # PagerDuty key template
```

### Useful Commands Cheatsheet

```bash
# Falco
kubectl get pods -n falco
kubectl logs -n falco falco-xxxxx -c falco --tail=50
kubectl logs -n falco falco-xxxxx -c falco -f | grep Warning

# Falcosidekick
kubectl logs -n falco deployment/falco-falcosidekick --tail=50
kubectl logs -n falco deployment/falco-falcosidekick | grep AlertManager

# Web UI
kubectl port-forward -n falco svc/falco-falcosidekick-ui 2802:2802

# AlertManager
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
kubectl logs -n monitoring alertmanager-xxx -c alertmanager | grep pagerduty

# Restart everything
kubectl rollout restart daemonset/falco -n falco
kubectl rollout restart deployment/falco-falcosidekick -n falco
kubectl rollout restart deployment/falco-falcosidekick-ui -n falco

# Check PagerDuty secret
kubectl get secret alertmanager-pagerduty-key -n monitoring -o jsonpath='{.data.integration-key}' | base64 -d

# Test rule
kubectl run test-falco --image=ubuntu -n dev --rm --restart=Never -- bash -c "apt-get update"
```

### External Resources

- **Falco Documentation:** https://falco.org/docs/
- **Falco Rules Repository:** https://github.com/falcosecurity/rules
- **Falcosidekick Docs:** https://github.com/falcosecurity/falcosidekick
- **PagerDuty Events API:** https://developer.pagerduty.com/docs/events-api-v2/overview/
- **AlertManager Docs:** https://prometheus.io/docs/alerting/latest/alertmanager/

### Your Environment Details

```yaml
Cluster:
  Provider: Oracle Cloud
  Architecture: ARM64 (aarch64)
  Kernel: 6.8.0-1028-oracle
  Nodes: 3 (worker-1, worker-2, control-plane)
  Kubernetes: v1.28.15

Falco:
  Version: 0.42.0
  Chart: 7.0.0
  Driver: modern_ebpf
  Namespace: falco

Monitoring:
  Prometheus: kube-prometheus-stack
  AlertManager: v2 API
  Grafana: https://grafana.k8.publicvm.com
  
Integration:
  PagerDuty: Events API v2
  Web UI: https://falco.k8.publicvm.com (admin/admin)
  
Storage:
  Redis: For Web UI event storage
  Retention: As configured in Redis
```

---

## Quick Start Guide (TL;DR)

For someone new to your setup:

### 1. Access Web UI
```bash
# Option A: Ingress
open https://falco.k8.publicvm.com
# Login: admin / admin

# Option B: Port-forward
kubectl port-forward -n falco svc/falco-falcosidekick-ui 2802:2802
open http://localhost:2802
```

### 2. Trigger Test Alert
```bash
kubectl run test-falco --image=ubuntu -n dev --rm --restart=Never -- bash -c "apt-get update"
```

### 3. Check Alert Flow
```bash
# 1. Falco captured it
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=20 | grep Package

# 2. Falcosidekick sent to AlertManager
kubectl logs -n falco deployment/falco-falcosidekick --tail=20 | grep "AlertManager.*200"

# 3. Check PagerDuty
# Go to PagerDuty dashboard → Incidents
```

### 4. Add Custom Rule
```bash
# Edit falco.yaml
# Add under customRules section
# Apply
kubectl apply -f clusters/test-cluster/05-infrastructure/falco.yaml

# Restart
kubectl rollout restart daemonset/falco -n falco
```

### 5. Monitor Health
```bash
# All pods healthy?
kubectl get pods -n falco

# Any errors?
kubectl logs -n falco deployment/falco-falcosidekick | grep ERROR

# Falco running?
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco --tail=5
```

---

## Conclusion

You now have a **complete runtime security monitoring system** with:

 **Falco 0.42.0** - Latest version with ARM64 support  
 **Modern eBPF** - Low-overhead system call monitoring  
 **Custom Rules** - 3 rules tailored to your environment  
 **Falcosidekick** - Flexible alert routing  
 **Web UI** - Real-time security dashboard  
 **AlertManager** - Alert aggregation and deduplication  
 **PagerDuty** - Incident management with auto-resolution  
 **HTTPS Access** - Secure web UI with Let's Encrypt  
 **Complete Testing** - Test scripts and validation  

**This guide covered:**
- Architecture and data flow
- Installation from scratch
- Writing and testing custom rules
- Integration with AlertManager and PagerDuty
- Troubleshooting common issues
- Advanced configuration options
- Best practices and operational guidelines

**You can now:**
- Monitor runtime security 24/7
- Detect suspicious container activity
- Get alerted via PagerDuty for critical events
- View security events in real-time dashboard
- Create custom detection rules
- Troubleshoot issues independently

---

**Questions or issues?** Refer to:
- This guide's Troubleshooting section
- Falco docs: https://falco.org/docs/
- Your debug script: `./debug-falco.sh`
- Web UI: https://falco.k8.publicvm.com

**Happy monitoring! **

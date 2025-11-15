# Falco Security Monitoring Setup

Falco is a runtime security monitoring tool that detects suspicious behavior and security threats in your Kubernetes cluster.

## What Falco Does

Falco monitors your cluster for:
- 🐚 **Shell access** in containers
- 📦 **Package installations** (apt, yum, etc.)
- 🔐 **Sensitive file access** (/etc/shadow, SSH keys, etc.)
- 🌐 **Network connections** to suspicious IPs
- ⛏️ **Crypto mining** activity
- 🔧 **Privilege escalation** attempts
- 📁 **Configuration changes**
- 🚨 **Container escapes**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Kubernetes Cluster                                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Pod 1   │  │  Pod 2   │  │  Pod 3   │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │                    │
│       └─────────────┴─────────────┘                    │
│                     │                                  │
│            ┌────────▼────────┐                        │
│            │  Falco DaemonSet │  (eBPF monitoring)    │
│            │  on each node    │                        │
│            └────────┬─────────┘                        │
│                     │                                  │
│            ┌────────▼────────┐                        │
│            │  Falcosidekick  │  (Alert routing)       │
│            └────────┬─────────┘                        │
│                     │                                  │
│            ┌────────▼─────────┐                       │
│            │  AlertManager    │  (Alert aggregation)   │
│            └────────┬─────────┘                        │
│                     │                                  │
│            ┌────────▼─────────┐                       │
│            │   Slack #alerts  │  (Notifications)       │
│            └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Files Created

1. **`falco.yaml`** - ArgoCD Application for Falco deployment
2. **`falco-prometheus-rules.yaml`** - Prometheus alerts for Falco health monitoring

## Deployment

### Step 1: Deploy Falco

```bash
# Apply the Falco ArgoCD application
kubectl apply -f clusters/test-cluster/05-infrastructure/falco.yaml

# Wait for Falco to be ready
kubectl get pods -n falco -w
```

### Step 2: Apply Prometheus Rules

```bash
# Apply Falco monitoring rules
kubectl apply -f clusters/test-cluster/05-infrastructure/falco-prometheus-rules.yaml
```

### Step 3: Verify Installation

```bash
# Check Falco pods (should be running on each node)
kubectl get pods -n falco

# Check Falcosidekick
kubectl get pods -n falco -l app.kubernetes.io/name=falcosidekick

# View Falco logs
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=50
```

## Testing Falco

### Test 1: Shell in Container (should trigger alert)

```bash
# Create a test pod
kubectl run test-shell --image=ubuntu -n dev -- sleep 3600

# Exec into it (triggers "Shell Spawned in Container" alert)
kubectl exec -it test-shell -n dev -- /bin/bash

# Clean up
kubectl delete pod test-shell -n dev
```

### Test 2: Package Installation (should trigger alert)

```bash
# Create pod and install package
kubectl run test-apt --image=ubuntu -n dev -- sleep 3600
kubectl exec test-apt -n dev -- apt update

# Clean up
kubectl delete pod test-apt -n dev
```

### Test 3: Read Sensitive File (should trigger alert)

```bash
kubectl run test-sensitive --image=ubuntu -n dev -- sleep 3600
kubectl exec test-sensitive -n dev -- cat /etc/shadow

# Clean up
kubectl delete pod test-sensitive -n dev
```

## Alert Severity Levels

Falco uses the following priority levels (configured to send `warning` and above to AlertManager):

- **EMERGENCY** - System is unusable
- **ALERT** - Action must be taken immediately
- **CRITICAL** - Critical conditions (crypto mining, container escape)
- **ERROR** - Error conditions (package management in container)
- **WARNING** - Warning conditions (shell spawned, sensitive file read)
- **NOTICE** - Normal but significant
- **INFORMATIONAL** - Informational messages
- **DEBUG** - Debug messages

## Custom Rules

The deployment includes custom rules for:

1. **Shell Spawned in Container** - Detects interactive shells
2. **Read Sensitive File** - Detects access to /etc/shadow, SSH keys, etc.
3. **Package Management** - Detects apt, yum, dnf usage
4. **Crypto Mining** - Detects cryptocurrency miners

### Adding More Rules

Edit `falco.yaml` and add to the `customRules.custom-rules.yaml` section:

```yaml
- rule: My Custom Rule
  desc: Description of what this detects
  condition: >
    spawned_process and
    proc.name = "suspicious_binary"
  output: >
    Suspicious activity detected (user=%user.name command=%proc.cmdline)
  priority: CRITICAL
  tags: [custom, security]
```

## Viewing Falco Alerts

### In Slack

Falco security events will appear in your `#alerts` Slack channel via AlertManager:

```
🚨 ALERT: Shell Spawned in Container
Shell spawned in container test-pod
User: root
Command: /bin/bash
```

### In AlertManager UI

Visit: `http://alertmanager.k8.publicvm.com`

### In Falco Logs

```bash
kubectl logs -n falco -l app.kubernetes.io/name=falco --tail=100 | grep -i "warning\|error\|critical"
```

### In Falcosidekick Logs

```bash
kubectl logs -n falco -l app.kubernetes.io/name=falcosidekick --tail=50
```

## Configuration

### Adjust Alert Minimum Priority

Edit `falco.yaml` to change which alerts get sent to AlertManager:

```yaml
falcosidekick:
  config:
    alertmanager:
      minimumpriority: "error"  # Only send ERROR and above
```

Options: `emergency`, `alert`, `critical`, `error`, `warning`, `notice`, `informational`, `debug`

### Add Direct Slack Integration

To send critical alerts directly to Slack (bypassing AlertManager):

```yaml
falcosidekick:
  config:
    slack:
      webhookurl: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
      minimumpriority: "critical"  # Only critical+ to Slack
```

### Exclude Namespaces

To exclude certain namespaces from monitoring, add to Falco rules:

```yaml
- rule: Shell Spawned in Container
  condition: >
    spawned_process and
    container and
    not container.ns in (kube-system, monitoring) and
    shell_procs
```

## Performance Tuning

### If Falco is using too much CPU:

```yaml
# In falco.yaml
resources:
  limits:
    cpu: 500m  # Increase if needed
    memory: 2Gi
```

### If events are being dropped:

```yaml
# In falco.yaml
falco:
  syscall_event_drops:
    rate: 0.1  # Increase threshold
    max_burst: 10
```

## Troubleshooting

### Falco not starting

```bash
# Check driver loading
kubectl logs -n falco -l app.kubernetes.io/name=falco | grep -i driver

# Check node compatibility
kubectl describe pod -n falco -l app.kubernetes.io/name=falco
```

### No alerts in Slack

```bash
# Check Falcosidekick logs
kubectl logs -n falco -l app.kubernetes.io/name=falcosidekick

# Test AlertManager connection
kubectl exec -n falco $(kubectl get pod -n falco -l app.kubernetes.io/name=falcosidekick -o name | head -1) -- \
  wget -O- http://kube-prometheus-stack-alertmanager.monitoring:9093/-/healthy
```

### Too many false positives

Add exceptions to rules:

```yaml
- rule: Shell Spawned in Container
  exceptions:
    - name: known_shell_spawners
      values: [my-debug-pod, kubectl-pod]
```

## Security Best Practices

1. **Review alerts regularly** - Don't ignore Falco alerts
2. **Tune rules** - Adjust for your workload to reduce false positives
3. **Monitor Falco health** - Ensure Falco itself is running
4. **Combine with network policies** - Use Calico/Cilium for network security
5. **Enable audit logging** - Complement with Kubernetes audit logs

## Common Falco Rules

| Rule | Detects | Priority |
|------|---------|----------|
| Terminal Shell | Interactive shell in container | WARNING |
| Modify binary dirs | Changes to /bin, /sbin, etc. | ERROR |
| Read sensitive file | Access to /etc/shadow, SSH keys | WARNING |
| Write below etc | Writes to /etc | ERROR |
| Launch package management | apt, yum in container | ERROR |
| Netcat Remote Code Execution | nc -e usage | WARNING |
| Crypto Miners | Mining software | CRITICAL |
| Container Drift | Binary execution not in image | ERROR |

## Resources

- [Falco Documentation](https://falco.org/docs/)
- [Falco Rules](https://github.com/falcosecurity/rules)
- [Falcosidekick Outputs](https://github.com/falcosecurity/falcosidekick)

## Uninstall

```bash
# Delete Falco
kubectl delete application falco -n argocd

# Delete PrometheusRule
kubectl delete prometheusrule falco-security-alerts -n monitoring

# Delete namespace
kubectl delete namespace falco
```

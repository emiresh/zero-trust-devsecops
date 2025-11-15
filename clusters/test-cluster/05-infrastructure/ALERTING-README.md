# Custom Prometheus Alerts Configuration

This document explains the custom alerting rules configured for the FreshBonds application and how to adjust thresholds.

## Alert Files

- **`freshbonds-prometheus-rules.yaml`**: Contains all custom PrometheusRule definitions
- **`custom-prometheus-rules-app.yaml`**: ArgoCD Application to deploy the rules

## Alert Categories

### 1. Microservices Application Alerts (`freshbonds-app-alerts`)

#### ServiceDown
- **Threshold**: Service down for 2 minutes
- **Severity**: Critical
- **Trigger**: `up{job=~"freshbonds.*|api-gateway|product-service|user-service"} == 0`
- **Customize**: Change `for: 2m` to adjust timeout

#### HighMemoryUsage
- **Threshold**: 85% memory usage
- **Severity**: Warning
- **Trigger**: `container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.85`
- **Customize**: Change `0.85` to desired percentage (e.g., `0.90` for 90%)

#### CriticalMemoryUsage
- **Threshold**: 95% memory usage
- **Severity**: Critical
- **Trigger**: Memory usage above 95%
- **Customize**: Change `0.95` to desired percentage

#### HighCPUUsage
- **Threshold**: 0.8 CPU cores
- **Severity**: Warning
- **Trigger**: `rate(container_cpu_usage_seconds_total[5m]) > 0.80`
- **Customize**: Change `0.80` to desired CPU cores

#### PodRestartingFrequently
- **Threshold**: More than 2 restarts in 15 minutes
- **Severity**: Warning
- **Trigger**: `rate(kube_pod_container_status_restarts_total[15m]) * 60 > 2`
- **Customize**: Change `> 2` for restart count or `[15m]` for time window

#### PodCrashLooping
- **Threshold**: Immediate
- **Severity**: Critical
- **Trigger**: Pod in CrashLoopBackOff state
- **Customize**: Change `for: 5m` to adjust detection time

#### ContainerOOMKilled
- **Threshold**: Immediate
- **Severity**: Critical
- **Trigger**: Container killed due to out of memory
- **Action**: Increase memory limits in deployment

#### PodNotReady
- **Threshold**: Pod not ready for 10 minutes
- **Severity**: Warning
- **Trigger**: Pod not in Running or Succeeded state
- **Customize**: Change `for: 10m` to adjust timeout

### 2. Infrastructure Alerts (`infrastructure-alerts`)

#### DiskSpaceWarning
- **Threshold**: 15% disk space remaining
- **Severity**: Warning
- **Trigger**: `node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.15`
- **Customize**: Change `0.15` (15% remaining) to desired threshold

#### DiskSpaceCritical
- **Threshold**: 10% disk space remaining
- **Severity**: Critical
- **Trigger**: `node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.10`
- **Customize**: Change `0.10` (10% remaining) to desired threshold

#### NodeMemoryPressure
- **Threshold**: 10% memory available
- **Severity**: Warning
- **Trigger**: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.10`
- **Customize**: Change `0.10` (10% available) to desired threshold

#### PVCAlmostFull
- **Threshold**: 15% PVC space remaining
- **Severity**: Warning
- **Trigger**: `kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes < 0.15`
- **Customize**: Change `0.15` to desired threshold

## How to Adjust Thresholds

### Example 1: Change Memory Warning Threshold to 90%

Edit `freshbonds-prometheus-rules.yaml`:

```yaml
- alert: HighMemoryUsage
  expr: |
    (
      container_memory_working_set_bytes{namespace="dev", pod=~"freshbonds.*"}
      / 
      container_spec_memory_limit_bytes{namespace="dev", pod=~"freshbonds.*"}
    ) > 0.90  # Changed from 0.85 to 0.90
```

### Example 2: Change Disk Space Warning to 20%

```yaml
- alert: DiskSpaceWarning
  expr: |
    (
      node_filesystem_avail_bytes{mountpoint="/"}
      / 
      node_filesystem_size_bytes{mountpoint="/"}
    ) < 0.20  # Changed from 0.15 to 0.20
```

### Example 3: Add CPU Threshold Alert

```yaml
- alert: HighCPUUsagePercentage
  expr: |
    (
      rate(container_cpu_usage_seconds_total{namespace="dev", pod=~"freshbonds.*"}[5m])
      /
      container_spec_cpu_quota{namespace="dev", pod=~"freshbonds.*"}
      * 100000
    ) > 80  # 80% CPU usage
  for: 5m
  labels:
    severity: warning
    component: freshbonds
  annotations:
    summary: "High CPU usage in {{ $labels.pod }}"
    description: "CPU usage is {{ $value }}% (threshold: 80%)"
```

## Adding Custom Alerts

### Example: Alert on High HTTP Error Rate

Add to the `freshbonds-app-alerts` group:

```yaml
- alert: HighHTTPErrorRate
  expr: |
    (
      sum(rate(http_requests_total{namespace="dev", status=~"5.."}[5m])) by (pod)
      /
      sum(rate(http_requests_total{namespace="dev"}[5m])) by (pod)
    ) > 0.05  # 5% error rate
  for: 5m
  labels:
    severity: critical
    component: freshbonds
  annotations:
    summary: "High HTTP error rate in {{ $labels.pod }}"
    description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
```

**Note**: This requires your application to expose Prometheus metrics for HTTP requests.

## Severity Levels

- **`critical`**: Requires immediate attention, sent to Slack
- **`warning`**: Should be investigated, sent to Slack
- **`info`**: Informational only (can be added if needed)

## Testing Alerts

### 1. Check if rules are loaded:
```bash
kubectl get prometheusrules -n monitoring
```

### 2. View alert status in Prometheus:
Visit: `http://prometheus.k8.publicvm.com/alerts`

### 3. Test AlertManager configuration:
Visit: `http://alertmanager.k8.publicvm.com`

### 4. Trigger a test alert:
```bash
# Create a pod with low memory limit to trigger OOM
kubectl run test-oom --image=polinux/stress -n dev -- stress --vm 1 --vm-bytes 1G
```

## Common Customizations

### Change Alert Evaluation Interval

In `freshbonds-prometheus-rules.yaml`:
```yaml
groups:
- name: freshbonds-app-alerts
  interval: 60s  # Changed from 30s to 60s
```

### Add Namespace Filter

To monitor specific namespaces:
```yaml
expr: |
  container_memory_working_set_bytes{namespace=~"dev|production"}
```

### Change Alert Duration

Adjust `for:` parameter:
```yaml
for: 10m  # Alert fires only if condition is true for 10 minutes
```

## Deployment

After modifying rules:

```bash
# Commit changes
git add clusters/test-cluster/05-infrastructure/
git commit -m "Update custom Prometheus alerts"
git push

# ArgoCD will automatically sync
# Or manually sync:
argocd app sync custom-prometheus-rules
```

## Monitoring Metrics Reference

Common Prometheus queries for custom alerts:

- **Memory**: `container_memory_working_set_bytes`
- **CPU**: `rate(container_cpu_usage_seconds_total[5m])`
- **Disk**: `node_filesystem_avail_bytes`
- **Network**: `rate(container_network_receive_bytes_total[5m])`
- **Pod Status**: `kube_pod_status_phase`
- **Restarts**: `kube_pod_container_status_restarts_total`

## Troubleshooting

### Alert not firing?

1. Check if PrometheusRule is created:
   ```bash
   kubectl get prometheusrules -n monitoring freshbonds-alerts
   ```

2. Check Prometheus for syntax errors:
   ```bash
   kubectl logs -n monitoring prometheus-kube-prometheus-stack-prometheus-0
   ```

3. Verify metric exists in Prometheus UI:
   Visit `http://prometheus.k8.publicvm.com/graph` and run the query

### Slack not receiving alerts?

1. Check AlertManager configuration:
   ```bash
   kubectl get secret -n monitoring alertmanager-kube-prometheus-stack-alertmanager -o yaml
   ```

2. View AlertManager logs:
   ```bash
   kubectl logs -n monitoring alertmanager-kube-prometheus-stack-alertmanager-0
   ```

3. Test webhook URL manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test alert from AlertManager"}' \
     https://hooks.slack.com/services/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
   ```

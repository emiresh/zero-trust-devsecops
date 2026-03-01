# Monitoring & Observability Documentation

Complete monitoring setup, dashboards, and alerting configuration.

---

## 📚 Available Documents

### 📊 Grafana Dashboards & Alerts

**[Grafana Application Alerts](./GRAFANA-APPLICATION-ALERTS.md)**

Application-level monitoring and alerting:
- Service availability alerts
- Performance metrics (latency, throughput)
- Error rate monitoring
- Resource usage alerts
- Custom application metrics

**[Grafana Log Alerts](./GRAFANA-LOG-ALERTS.md)**

Log-based alerting configuration:
- Error log detection
- Security event logs
- Application log patterns
- Log aggregation queries

**[Grafana Login Alerts](./GRAFANA-LOGIN-ALERTS.md)**

Authentication and access monitoring:
- Failed login attempts
- Unusual access patterns
- Authentication anomalies
- Session monitoring

---

### 🚨 Incident Alerting

**[PagerDuty Integration](./PAGERDUTY-INTEGRATION.md)**

PagerDuty alert routing and incident management:
- Integration setup
- Alert routing rules
- Escalation policies
- On-call schedules
- Incident workflow

---

## 🎯 Quick Start

### View Dashboards

```bash
# Port-forward Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Access at http://localhost:3000
# Default credentials in sealed secret
```

### Common Queries

```promql
# Service availability (last 5m)
up{job="freshbonds-services"} == 1

# Request rate by service
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds)
```

---

## 🔔 Alert Levels

| Priority | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | Immediate | Service down, data loss, security breach |
| **High** | < 1 hour | High error rate, performance degradation |
| **Medium** | < 4 hours | Resource warnings, minor issues |
| **Low** | Next business day | Info, maintenance notifications |

---

## 📈 Available Metrics

### Infrastructure
- Node CPU, memory, disk usage
- Network traffic
- Kubernetes cluster metrics

### Applications
- HTTP request rate, latency, errors
- Database connections, query performance
- Cache hit rates
- Custom business metrics

### Security
- Falco security events
- Failed authentication attempts
- Policy violations
- Certificate expiration

---

## 🔗 Related Documentation

- [Security](../security/FALCO-COMPLETE-GUIDE.md) - Falco security monitoring
- [Architecture](../architecture/SYSTEM-ARCHITECTURE.md) - Monitoring architecture
- [Workflows](../workflows/SECURITY-SCAN-WORKFLOW.md) - Security scanning

---

**Maintained By**: Platform Team  
**Last Updated**: March 2026

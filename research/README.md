# AI Security Collector

A non-blocking AI enrichment layer for the Falco runtime security pipeline. It
receives Falco events from Falcosidekick, stores them for later analysis, and
optionally generates a structured incident report for high-severity events
using Azure OpenAI. It is documented in Section IV.J of
[`../thesis/FINAL_REPORT.pdf`](../thesis/FINAL_REPORT.pdf) and Section IV.I of
the [IEEE paper](../thesis/ieee-paper/).

## Design Principle

The collector consumes events from the same Falcosidekick fan-out that feeds
Prometheus Alertmanager and PagerDuty; it does not sit in front of them. This
means the collector can be slow, unavailable, or misconfigured without any
effect on the primary detection and alerting path.

## Directory Structure

```
research/
├── collectors/
│   ├── falco_collector.py       FastAPI service: /events webhook, /stats, /health
│   ├── loki_client.py           Pushes events to Grafana Loki (primary storage)
│   ├── prometheus_collector.py  Queries Prometheus for metric context
│   └── integrations.py          Slack, PagerDuty, and custom webhook delivery
├── advisors/
│   └── incident_reporter.py     Azure OpenAI (GPT-4o-mini) incident report generation
├── k8s/
│   ├── namespace.yaml           ai-security namespace
│   ├── deployment.yaml          Collector Deployment
│   └── service.yaml             ClusterIP service
├── config.yaml                  Service, storage, and collector configuration
├── requirements.txt / requirements.prod.txt
├── Dockerfile
└── AZURE_SETUP.md               Step-by-step Azure OpenAI resource setup
```

## How It Works

1. Falco detects a runtime event and Falcosidekick forwards it as an HTTP POST
 to the collector's `/events` endpoint.
2. The collector parses the event, updates in-memory statistics, and persists
 it to Loki (falling back to a local JSONL file if Loki is unreachable).
3. Events are deduplicated to avoid repeated alerts for the same condition.
4. For high-severity events, and only when Azure OpenAI credentials are
 configured, the collector queues a report request to
 `advisors/incident_reporter.py`, which returns a concise threat
 assessment, investigation steps, and recommended remediation.
5. The report is delivered through whichever integrations are configured in
 `collectors/integrations.py` (Slack, PagerDuty, or a custom webhook).

If Azure OpenAI is not configured, the collector still ingests, stores, and
exposes events and statistics; only the AI-generated narrative is skipped.

## Local Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cd collectors
python falco_collector.py

# In another terminal
curl -X POST http://localhost:8000/events \
 -H "Content-Type: application/json" \
 -d '{"rule": "Test", "priority": "Warning", "output": "Test event"}'

curl http://localhost:8000/stats
```

## Deployment

The collector has its own CI/CD pipeline
(`.github/workflows/ai-collector-cicd.yml`), which builds the image, scans it
with Trivy, generates an SBOM with Syft, and updates the Kubernetes manifests
under `research/k8s/`. Argo CD then reconciles the `ai-security` namespace, in
the same way as the application services.

To connect the collector to the runtime pipeline, point the Falco Argo CD
application's Falcosidekick webhook configuration
(`clusters/test-cluster/05-infrastructure/falco.yaml`) at
`http://ai-collector.ai-security:8000/events` in addition to the existing
Alertmanager webhook. Alertmanager and PagerDuty keep working independently of
the collector's availability.

## Configuration

See `config.yaml` for service, storage, and collector settings, and
`AZURE_SETUP.md` for creating the Azure OpenAI resource used for report
generation. Azure credentials are supplied via environment variables /
Kubernetes secrets and are never committed to the repository.

## Status and Future Work

The collector, storage, and AI-enrichment path described above are
implemented and deployed. The learned/ML-based anomaly detection extension
discussed as future work in the thesis (Section 7.2, Table 21) - training
isolation-forest, autoencoder, or sequence models on collected Falco and
Prometheus telemetry to complement the current rule-based detection - is not
yet implemented in this repository.

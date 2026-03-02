# 🚀 Next Steps - AI Security Control Plane

**Status**: ✅ Phase 1 Infrastructure Created  
**Date**: March 2, 2026

---

## What You Just Built

✅ Complete research directory structure  
✅ Falco event collector (FastAPI webhook receiver)  
✅ Prometheus metrics collector  
✅ Kubernetes deployment manifests  
✅ Docker container image definition  
✅ Test scripts  
✅ Setup automation  

---

## What to Do RIGHT NOW

### Option A: Test Locally (5 minutes)

```bash
cd research

# Install dependencies
source ../.venv/bin/activate
pip install -r requirements.txt

# Run local test
./test_collector.sh
```

**Expected output**: ✅ ALL TESTS PASSED

---

### Option B: Deploy to Cluster (15 minutes)

```bash
cd research

# Run automated setup
./setup.sh
```

This will:
1. Create `ai-security` namespace
2. Build Docker image
3. Push to Docker Hub
4. Deploy collector to cluster
5. Verify it's running

---

## The ONE Manual Change Required

After running `setup.sh`, you need to connect Falco to the AI collector:

```bash
# Edit Falco config
vim ../clusters/test-cluster/05-infrastructure/falco.yaml

# Find line ~150, change:
webhook:
  address: ""

# To:
webhook:
  address: "http://ai-collector.ai-security:8000/events"

# Commit and push
git add ../clusters/test-cluster/05-infrastructure/falco.yaml
git commit -m "feat: add AI security collector webhook to Falco"
git push
```

**Wait 1-2 minutes** for ArgoCD to sync the change.

---

## Verify It's Working

```bash
# Check collector is receiving events
kubectl logs -n ai-security deployment/ai-security-collector --tail=100

# Trigger a test event (shell in container - Falco will detect this)
kubectl exec -it -n dev $(kubectl get pod -n dev -l app=apigateway -o name | head -1) -- /bin/sh -c "echo test"

# Check logs again - should show new event
kubectl logs -n ai-security deployment/ai-security-collector --tail=20
```

**Expected output**:
```
INFO: Received event: Shell Spawned in Container | Warning | ...
```

---

## View Collected Data

```bash
# Get stats
kubectl exec -n ai-security deployment/ai-security-collector -- \
  curl -s http://localhost:8000/stats

# View recent events
kubectl exec -n ai-security deployment/ai-security-collector -- \
  curl -s http://localhost:8000/events/recent?limit=5

# View raw data file
kubectl exec -n ai-security deployment/ai-security-collector -- \
  cat /data/falco_events.jsonl | tail -5
```

---

## Timeline: What Happens Next

| Week | Activity | Your Action |
|------|----------|-------------|
| **Week 1** (NOW) | Deploy collector, start data collection | ✅ Run `setup.sh`, configure Falco webhook |
| **Week 2-4** | Normal operation data collection | 🔄 Let it run. Monitor: `kubectl logs -n ai-security deployment/ai-security-collector` |
| **Week 5** | Attack simulations | ⏳ Run `experiments/simulate_attacks.sh` (to be created) |
| **Week 6-8** | Model training | ⏳ Build ML models locally on collected data |
| **Week 9-10** | Evaluation + risk scoring | ⏳ Run experiments, generate results |
| **Week 11-12** | Write thesis Chapter 5 | ⏳ Document findings |

---

## Critical Files to Track

| File | Purpose | Monitor How |
|------|---------|-------------|
| `/data/falco_events.jsonl` (in pod) | Raw Falco events | `kubectl exec ... cat /data/falco_events.jsonl \| wc -l` |
| Collector logs | Health & errors | `kubectl logs -n ai-security deployment/ai-security-collector` |
| Falco logs | Events being generated | `kubectl logs -n falco -l app.kubernetes.io/name=falco` |

---

## Expected Data Volume

**Conservative estimate** (low activity cluster):
- 5 Falco events/minute × 60 min × 24 hr × 30 days = **216,000 events/month**
- Each event ~500 bytes JSON = **108 MB/month**

**Realistic estimate** (moderate activity):
- 20 events/minute = **864,000 events/month** = **432 MB/month**

Your PVC is 5GB — enough for 1 year of data.

---

## Troubleshooting

### No events in collector logs

```bash
# Check Falco is running
kubectl get pods -n falco

# Check Falcosidekick (sends webhooks)
kubectl logs -n falco -l app.kubernetes.io/name=falcosidekick

# Check webhook is configured
kubectl get application falco -n argocd -o yaml | grep webhook -A 2

# Trigger a guaranteed Falco event
kubectl exec -n dev <any-pod> -- /bin/sh
```

### Collector pod crashing

```bash
# Check pod status
kubectl describe pod -n ai-security -l app=ai-security-collector

# Check logs
kubectl logs -n ai-security deployment/ai-security-collector

# Common issues:
# - Image pull error → check Docker Hub push
# - OOMKilled → increase memory limit in deployment.yaml
# - CrashLoopBackOff → check application logs
```

### Data not persisting

```bash
# Check PVC is bound
kubectl get pvc -n ai-security
# Should show: STATUS = Bound

# Check volume mount
kubectl exec -n ai-security deployment/ai-security-collector -- ls -la /data

# Recreate PVC if needed
kubectl delete pvc ai-security-data -n ai-security
kubectl apply -f k8s/deployment.yaml
```

---

## When You're Ready for Week 5 (Attack Simulations)

I'll help you create the attack simulation scripts. The 7 scenarios are:

1. Shell in container (`kubectl exec`)
2. Package installation (`apk add curl`)
3. Sensitive file read (`cat /etc/shadow`)
4. Crypto mining (CPU stress)
5. Reverse shell (netcat listener)
6. Data exfiltration (`curl` to external endpoint)
7. Privilege escalation (deploy privileged pod)

Each attack will be labeled automatically based on timestamps.

---

## Questions?

Check these first:
1. [research/README.md](README.md) - Full documentation
2. `kubectl logs -n ai-security deployment/ai-security-collector` - Collector logs
3. `kubectl describe pod -n ai-security` - Pod status
4. Collector health: `kubectl exec -n ai-security deployment/ai-security-collector -- curl http://localhost:8000/health`

---

## Success Criteria for This Week

- [ ] Collector deployed to cluster
- [ ] Falco webhook configured
- [ ] First Falco event received and logged
- [ ] Data file `/data/falco_events.jsonl` exists and growing
- [ ] No errors in collector logs for 24 hours

**Once all checked** → Phase 1 complete. Start 4-week data collection.

---

**Current Status**: 🟡 Ready to deploy  
**Next Action**: Run `./setup.sh` or `./test_collector.sh`

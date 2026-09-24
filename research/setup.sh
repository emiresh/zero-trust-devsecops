#!/bin/bash
# Quick setup script for AI Security Control Plane

set -e

echo "🤖 AI Security Control Plane - Quick Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi
echo "✅ kubectl found"

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi
echo "✅ Kubernetes cluster connected"

# Check if Falco is running
if ! kubectl get pods -n falco | grep -q "falco-"; then
    echo "❌ Falco not found in cluster. Make sure Falco is deployed."
    exit 1
fi
echo "✅ Falco is running"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi
echo "✅ Docker found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Create ai-security namespace"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kubectl apply -f k8s/namespace.yaml
echo "✅ Namespace created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Build Docker image"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building emiresh/ai-security-collector:latest..."
docker build -t emiresh/ai-security-collector:latest .
echo "✅ Image built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Push to Docker Hub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Push to Docker Hub? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker push emiresh/ai-security-collector:latest
    echo "✅ Image pushed"
else
    echo "⚠️  Skipped push. You'll need to push later or use local image."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Deploy collector to cluster"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
echo "✅ Collector deployed"

echo ""
echo "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod -l app=ai-security-collector -n ai-security --timeout=60s
echo "✅ Collector is ready"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Verify deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pods:"
kubectl get pods -n ai-security
echo ""
echo "Services:"
kubectl get svc -n ai-security
echo ""
echo "PVC:"
kubectl get pvc -n ai-security

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Test the collector"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking health..."
kubectl exec -n ai-security deployment/ai-security-collector -- \
  curl -s http://localhost:8000/health | python -m json.tool

echo ""
echo "✅ Collector is healthy and running"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Final step required!"
echo ""
echo "You need to configure Falco to send events to the AI collector."
echo ""
echo "Edit this file:"
echo "  clusters/test-cluster/05-infrastructure/falco.yaml"
echo ""
echo "Find the webhook section (around line 150):"
echo "  webhook:"
echo "    address: \"\""
echo ""
echo "Change it to:"
echo "  webhook:"
echo "    address: \"http://ai-collector.ai-security:8000/events\""
echo ""
echo "Then:"
echo "  git add clusters/test-cluster/05-infrastructure/falco.yaml"
echo "  git commit -m \"feat: add AI collector webhook to Falco\""
echo "  git push"
echo ""
echo "ArgoCD will sync the change automatically."
echo ""
echo "To verify events are flowing:"
echo "  kubectl logs -n ai-security deployment/ai-security-collector"
echo ""
echo "To trigger a test event:"
echo "  kubectl exec -it -n dev <pod-name> -- /bin/sh"
echo ""

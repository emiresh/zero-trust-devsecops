#!/bin/bash

# FreshBonds Kubernetes Deployment Script
# This script deploys the FreshBonds application to Kubernetes using Docker Hub images

set -e

echo "🚀 Starting FreshBonds Kubernetes Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Load environment variables from .env
source .env

# Base64 encode function (cross-platform)
base64_encode() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -n "$1" | base64
    else
        echo -n "$1" | base64 -w 0
    fi
}

echo "📦 Encoding secrets..."

# Encode secrets
MONGODB_URI_ENCODED=$(base64_encode "$MONGODB_URI")
JWT_SECRET_ENCODED=$(base64_encode "$JWT_SECRET")
IPG_APP_NAME_ENCODED=$(base64_encode "$IPG_APP_NAME")
IPG_APP_ID_ENCODED=$(base64_encode "$IPG_APP_ID")
IPG_APP_TOKEN_ENCODED=$(base64_encode "$IPG_APP_TOKEN")
IPG_HASH_SALT_ENCODED=$(base64_encode "$IPG_HASH_SALT")
IPG_CALLBACK_URL_ENCODED=$(base64_encode "$IPG_CALLBACK_URL")
IPG_CALLBACK_TOKEN_ENCODED=$(base64_encode "$IPG_CALLBACK_TOKEN")

echo "📝 Creating Kubernetes secrets..."

# Create namespace
echo "🏗️  Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Create secrets directly using kubectl
kubectl create secret generic freshbonds-secrets \
  --from-literal=mongodb-uri="$MONGODB_URI" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=ipg-app-name="$IPG_APP_NAME" \
  --from-literal=ipg-app-id="$IPG_APP_ID" \
  --from-literal=ipg-app-token="$IPG_APP_TOKEN" \
  --from-literal=ipg-hash-salt="$IPG_HASH_SALT" \
  --from-literal=ipg-callback-url="$IPG_CALLBACK_URL" \
  --from-literal=ipg-callback-token="$IPG_CALLBACK_TOKEN" \
  --namespace=fresh-bonds \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secrets created successfully"

# Deploy services
echo "🚢 Deploying services..."

echo "  → Deploying User Service..."
kubectl apply -f k8s/deployments/user-service.yaml

echo "  → Deploying Product Service..."
kubectl apply -f k8s/deployments/product-service.yaml

echo "  → Deploying API Gateway..."
kubectl apply -f k8s/deployments/api-gateway.yaml

echo "  → Deploying Frontend..."
kubectl apply -f k8s/deployments/frontend.yaml

echo "✅ All services deployed"

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/freshbonds-user-service \
  deployment/freshbonds-product-service \
  deployment/freshbonds-api-gateway \
  deployment/freshbonds-frontend \
  -n fresh-bonds

echo "✅ All deployments are ready!"

# Show deployment status
echo ""
echo "📊 Deployment Status:"
kubectl get deployments -n fresh-bonds
echo ""
kubectl get pods -n fresh-bonds
echo ""
kubectl get services -n fresh-bonds

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "To access your application:"
echo "  1. Port forward the frontend: kubectl port-forward -n fresh-bonds svc/freshbonds-frontend 3000:3000"
echo "  2. Port forward the API gateway: kubectl port-forward -n fresh-bonds svc/freshbonds-api-gateway 8080:8080"
echo ""
echo "Or check the service URLs if you have an ingress/LoadBalancer configured."

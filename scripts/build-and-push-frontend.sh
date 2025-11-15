#!/bin/bash

# Script to build and push frontend Docker image with fixed nginx config

set -e

# Configuration
IMAGE_NAME="emiresh/freshbonds-frontend"
VERSION=${1:-"v1.0.0"}  # Use provided version or default to v1.0.0

echo "🏗️  Building Frontend Docker Image..."
echo "📦 Image: $IMAGE_NAME:$VERSION"
echo "📦 Image: $IMAGE_NAME:latest"

# Navigate to frontend directory
cd "$(dirname "$0")/../src/frontend"

# Build the Docker image
docker build \
  --platform linux/amd64,linux/arm64 \
  -t "$IMAGE_NAME:$VERSION" \
  -t "$IMAGE_NAME:latest" \
  .

echo "✅ Build completed!"

# Push to Docker Hub
echo "🚀 Pushing to Docker Hub..."
docker push "$IMAGE_NAME:$VERSION"
docker push "$IMAGE_NAME:latest"

echo "✅ Successfully pushed:"
echo "   - $IMAGE_NAME:$VERSION"
echo "   - $IMAGE_NAME:latest"

echo ""
echo "🔄 Next steps:"
echo "   1. The image with fixed nginx config is now available"
echo "   2. Restart frontend pods: kubectl rollout restart deployment frontend -n dev"
echo "   3. Delete the apigateway-alias-service.yaml file (no longer needed)"
echo "   4. Remove the api-gateway service: kubectl delete svc api-gateway -n dev"

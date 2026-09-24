#!/bin/bash

# Fresh Bonds - Build and Push All Docker Images
# Usage: ./scripts/build-and-push.sh [version]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from argument or default to v1.2.1
VERSION="${1:-v1.2.1}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fresh Bonds - Docker Build & Push${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Confirm before proceeding
read -p "Build and push all images as version ${VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Build cancelled${NC}"
    exit 1
fi

# Change to project root
cd "$(dirname "$0")/.."

echo -e "\n${YELLOW}📦 Building backend services (no build args)...${NC}\n"

# Build API Gateway
echo -e "${GREEN}🔨 Building api-gateway:${VERSION}${NC}"
docker build \
  --no-cache \
  -t emiresh/freshbonds-api-gateway:${VERSION} \
  -t emiresh/freshbonds-api-gateway:latest \
  ./src/api-gateway

# Build User Service
echo -e "${GREEN}🔨 Building user-service:${VERSION}${NC}"
docker build \
  --no-cache \
  -t emiresh/freshbonds-user-service:${VERSION} \
  -t emiresh/freshbonds-user-service:latest \
  ./src/user-service

# Build Product Service
echo -e "${GREEN}🔨 Building product-service:${VERSION}${NC}"
docker build \
  --no-cache \
  -t emiresh/freshbonds-product-service:${VERSION} \
  -t emiresh/freshbonds-product-service:latest \
  ./src/product-service

echo -e "\n${YELLOW}🎨 Building frontend (with VITE_API_URL=/api)...${NC}\n"

# Build Frontend with build arg
echo -e "${GREEN}🔨 Building frontend:${VERSION}${NC}"
docker build \
  --no-cache \
  --build-arg VITE_API_URL=/api \
  -t emiresh/freshbonds-frontend:${VERSION} \
  -t emiresh/freshbonds-frontend:latest \
  ./src/frontend

echo -e "\n${GREEN}✅ All images built successfully!${NC}\n"

# List built images
echo -e "${BLUE}📋 Built images:${NC}"
docker images | grep "emiresh/freshbonds" | grep "${VERSION}\|latest" | head -8

echo -e "\n${YELLOW}🚀 Pushing images to Docker Hub...${NC}\n"

# Push all images
echo -e "${GREEN}⬆️  Pushing api-gateway...${NC}"
docker push emiresh/freshbonds-api-gateway:${VERSION}
docker push emiresh/freshbonds-api-gateway:latest

echo -e "${GREEN}⬆️  Pushing user-service...${NC}"
docker push emiresh/freshbonds-user-service:${VERSION}
docker push emiresh/freshbonds-user-service:latest

echo -e "${GREEN}⬆️  Pushing product-service...${NC}"
docker push emiresh/freshbonds-product-service:${VERSION}
docker push emiresh/freshbonds-product-service:latest

echo -e "${GREEN}⬆️  Pushing frontend...${NC}"
docker push emiresh/freshbonds-frontend:${VERSION}
docker push emiresh/freshbonds-frontend:latest

echo -e "\n${GREEN}✅ All images pushed successfully!${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "1. Update image tags in apps/freshbonds/values.yaml to: ${YELLOW}${VERSION}${NC}"
echo -e "2. Commit changes: ${YELLOW}git add . && git commit -m 'chore: update images to ${VERSION}'${NC}"
echo -e "3. Push to Git: ${YELLOW}git push origin main${NC}"
echo -e "4. ArgoCD will automatically sync and deploy new images"
echo -e "5. Watch deployment: ${YELLOW}kubectl get pods -n dev -w${NC}\n"

echo -e "${GREEN}🎉 Build and push completed!${NC}\n"

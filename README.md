# GitOps Repo for Test Cluster

This repo contains a minimal GitOps setup for testing Argo CD:

- `clusters/test-cluster/00-namespaces/` → namespaces managed by Argo CD
- `clusters/test-cluster/01-projects/` → Argo CD projects
- `clusters/test-cluster/10-apps/` → Applications and root bootstrapper
- `apps/my-app/` → Minimal Helm chart for test deployment

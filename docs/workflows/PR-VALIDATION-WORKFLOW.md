# PR Validation Workflow

**File**: `.github/workflows/pr-validation.yml`

Fast feedback pipeline for pull requests - provides code quality checks in under 5 minutes without running full CI/CD.

---

## 📋 Overview

This workflow optimizes developer productivity by providing rapid feedback on PRs:

- **Fast Feedback**: Results in 3-5 minutes (vs 15+ min for full CI/CD)
- **Smart Execution**: Only runs checks relevant to changed files
- **Resource Efficient**: Skips heavy operations (build, deploy, security scan)
- **Quality Gates**: Catches common issues before merge
- **Cancel-Safe**: Auto-cancels outdated runs when new commits pushed

**Purpose**: Shift-left quality checks WITHOUT blocking developer velocity.

**Full CI/CD Runs**: After merge to `main` via `app-cicd.yml`

---

## 🎯 Triggers

```yaml
on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]
```

**Behavior**:
- **Opened**: New PR created
- **Synchronize**: New commits pushed to PR
- **Reopened**: Closed PR reopened

### Concurrency Control

```yaml
concurrency:
  group: pr-validation-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

**Effect**:
- Each PR has its own validation group
- New commits cancel previous validation runs
- Saves compute resources
- Developers always see latest results

---

## 🔄 Workflow Stages

### Stage 1: Code Quality & Formatting

**Purpose**: Catch style issues and basic errors

**Process**:

#### 1. Detect File Changes

```bash
# Compare PR branch with base branch
git diff --name-only origin/$BASE_REF...HEAD

# Categorize changes
HAS_JS=$(echo "$CHANGED_FILES" | grep -E '\.(js|ts|jsx|tsx|vue)$')
HAS_YAML=$(echo "$CHANGED_FILES" | grep -E '\.(yaml|yml)$')
HAS_TF=$(echo "$CHANGED_FILES" | grep -E '\.tf$')
HAS_MD=$(echo "$CHANGED_FILES" | grep '\.md$')
```

**Why Smart Detection?**
- Skip linting if no relevant files changed
- Reduces validation time
- Only installs necessary tools

---

#### 2. Lint JavaScript/TypeScript

**Runs If**: PR modifies `.js`, `.ts`, `.jsx`, `.tsx`, `.vue` files

```bash
# For each service with package.json
cd src/frontend
npm install --only=dev

# Run ESLint
npx eslint . --max-warnings 0

# Also checks:
- Prettier formatting
- TypeScript type errors
- Unused imports
```

**Common Issues Caught**:
- ✓ Unused variables
- ✓ Console.log statements
- ✓ Missing semicolons
- ✓ Inconsistent formatting
- ✓ Type mismatches

**Configuration**:
```json
// .eslintrc.json
{
  "extends": ["eslint:recommended", "prettier"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

---

#### 3. Validate YAML Files

**Runs If**: PR modifies `.yaml` or `.yml` files

```bash
# Install yamllint
pip install yamllint

# Validate syntax and style
yamllint -c .yamllint.yml \
  apps/ \
  clusters/ \
  policies/ \
  .github/workflows/
```

**Checks**:
- ✓ Valid YAML syntax
- ✓ Consistent indentation (2 spaces)
- ✓ Line length (max 120)
- ✓ Trailing spaces
- ✓ Empty lines

**Configuration**:
```yaml
# .yamllint.yml
extends: default
rules:
  line-length:
    max: 120
    level: warning
  indentation:
    spaces: 2
  comments:
    min-spaces-from-content: 1
```

**Common Issues Caught**:
- ✓ Tab characters instead of spaces
- ✓ Incorrect indentation
- ✓ Duplicate keys
- ✓ Invalid boolean values

---

#### 4. Validate Terraform Format

**Runs If**: PR modifies `.tf` files

```bash
# Install Terraform
sudo apt install terraform

# Check formatting
cd terraform
terraform fmt -check -recursive
```

**On Failure**:
- Comments on PR with instructions
- Provides exact command to fix:
  ```bash
  terraform fmt -recursive
  ```

**Why This Matters**:
- Terraform is whitespace-sensitive
- Consistent formatting aids code review
- Prevents terraform.yml from failing later

---

### Stage 2: Kubernetes Manifest Validation

**Purpose**: Catch misconfigurations before they reach the cluster

**Runs If**: PR modifies files in `apps/` or `clusters/`

```bash
# 1. Install kubeval
wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
tar xf kubeval-linux-amd64.tar.gz
sudo mv kubeval /usr/local/bin

# 2. Validate manifests
kubeval \
  --strict \
  --kubernetes-version 1.28.0 \
  apps/freshbonds/templates/*.yaml \
  clusters/test-cluster/**/*.yaml
```

**Checks**:
- ✓ Valid Kubernetes API objects
- ✓ Required fields present
- ✓ Correct API versions
- ✓ Valid resource limits/requests
- ✓ Proper label selectors

**Common Issues Caught**:
```yaml
❌ Invalid:
  resources:
    limits:
      memory: "500"  # Missing unit

✅ Valid:
  resources:
    limits:
      memory: "500Mi"
```

---

### Stage 3: Quick Security Checks

**Purpose**: Basic security hygiene (full scan runs in security-scan.yml)

#### Secret Detection

```bash
# Use gitleaks for fast secret scanning
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest \
  detect \
  --source=/path \
  --no-git \
  --verbose
```

**Patterns Checked**:
- API keys
- Passwords in plaintext
- Private keys
- MongoDB URIs with credentials
- JWT secrets

**On Detection**:
- ❌ **BLOCKS** PR merge
- Comments on PR with location
- Provides remediation steps

---

#### Dependency Check (Fast)

```bash
# Quick npm audit (no install)
for svc in src/*/; do
  cd $svc
  if [ -f package-lock.json ]; then
    npm audit --audit-level=high
  fi
  cd -
done
```

**Thresholds**:
- CRITICAL: Blocks merge
- HIGH: Warning (doesn't block)
- MEDIUM/LOW: Info only

---

### Stage 4: Markdown Linting

**Purpose**: Documentation quality and link validation

**Runs If**: PR modifies `.md` files

```bash
# Install markdownlint
npm install -g markdownlint-cli

# Lint markdown files
markdownlint '**.md' \
  --ignore node_modules \
  --config .markdownlint.json
```

**Checks**:
- ✓ Heading levels (no skipping)
- ✓ No hard-wrapped lines
- ✓ Consistent list markers
- ✓ No bare URLs
- ✓ Fenced code blocks have language

**Link Validation**:
```bash
# Check for broken links
npm install -g markdown-link-check

for md in $(find . -name '*.md'); do
  markdown-link-check $md
done
```

---

### Stage 5: Build Validation (Fast)

**Purpose**: Ensure code compiles without full image build

**Runs If**: PR modifies source code

```bash
# For each service
cd src/frontend

# Install dependencies
npm install

# Type checking only (no build)
npx tsc --noEmit

# Or for services without TS
node --check server.js
```

**Why Not Full Build?**
- Full build takes 10+ minutes
- Type checking catches most errors
- Actual build happens in app-cicd.yml after merge

---

## 📊 PR Status Checks

### Required Checks

These must pass before merge:

- ✅ Code Quality & Formatting
- ✅ Kubernetes Manifest Validation
- ✅ Secret Detection
- ✅ Critical Dependency Vulnerabilities

### Optional Checks

Warnings only, doesn't block:

- ⚠️ Markdown lint warnings
- ⚠️ YAML style issues
- ⚠️ High severity dependencies
- ⚠️ Test coverage decrease

---

## 💬 PR Comments

### Auto-Generated Comments

#### Format Issues

```markdown
⚠️ **Terraform Format Check Failed**

Please run `terraform fmt -recursive` to fix formatting issues.

**Files affected**:
- terraform/instances.tf
- terraform/security_list.tf
```

#### Security Findings

```markdown
🚨 **Secret Detected in Code**

**File**: src/api-gateway/server.js  
**Line**: 42  
**Type**: MongoDB URI with credentials

**Remediation**:
1. Remove hardcoded secret
2. Use environment variable or Sealed Secret
3. Rotate exposed credential

**Example**:
```javascript
// ❌ Don't do this
const uri = "mongodb+srv://user:password@cluster.mongodb.net"

// ✅ Do this instead
const uri = process.env.MONGODB_URI
```
```

#### Validation Errors

```markdown
❌ **Kubernetes Manifest Validation Failed**

**File**: apps/freshbonds/templates/deployment.yaml  
**Error**: Invalid value for resources.limits.memory

Expected format: `<number><unit>` (e.g., "500Mi", "1Gi")  
Found: "500"

**Fix**:
```yaml
resources:
  limits:
    memory: "500Mi"  # Add Mi suffix
```
```

---

## 🚨 Troubleshooting

### Validation Fails But Code Looks Correct

**Check**:
```bash
# 1. Pull latest main/develop
git checkout main
git pull
git checkout your-branch
git rebase main

# 2. Re-run validation locally
npm run lint
terraform fmt -check
kubeval apps/**/*.yaml
```

---

### Different Results Locally vs CI

**Common Causes**:

1. **Different Node.js version**:
   ```bash
   # Use same version as CI
   nvm install 18
   nvm use 18
   ```

2. **Different dependencies**:
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Git line endings**:
   ```bash
   # Configure Git
   git config core.autocrlf input
   ```

---

### Validation Takes Too Long

**Expected**: 3-5 minutes

**If > 10 minutes**:

Check:
- Concurrent runs (should auto-cancel)
- Runner availability (GitHub Actions status)
- Large file changes (> 100 files)

**Optimization**:
```yaml
# In workflow file
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

### False Positive Secret Detection

**Scenario**: Gitleaks flags example code or test data

**Solution**:
```yaml
# .gitleaks.toml
[allowlist]
paths = [
  "test/**",
  "docs/examples/**"
]

regexes = [
  "example\\.com",
  "jwt-secret-change-in-prod"  # Placeholder
]
```

---

## 📁 Artifacts

No artifacts stored (to keep validation fast).

For full scan results:
- Wait for merge
- Check app-cicd.yml run
- Download security-artifacts

---

## 🎯 Best Practices

### For Developers

1. **Run validations locally before pushing**:
   ```bash
   npm run lint
   terraform fmt -recursive
   kubeval apps/**/*.yaml
   ```

2. **Keep PRs small** (< 500 lines):
   - Faster validation
   - Easier review
   - Less likely to have conflicts

3. **Fix issues immediately**:
   - Validation failures block merge
   - Don't accumulate technical debt

4. **Use descriptive PR titles**:
   ```
   ✅ fix: resolve memory leak in product-service
   ❌ update code
   ```

---

### For Reviewers

1. **Check validation status before reviewing**:
   - Don't waste time if validation fails
   - Request fixes first

2. **Review validation comments**:
   - Auto-generated comments highlight issues
   - May catch things human reviewers miss

3. **Enforce standards**:
   - Don't approve PRs with validation warnings
   - Maintain code quality bar

---

## 🔧 Customization

### Adding New Checks

```yaml
# .github/workflows/pr-validation.yml

- name: Custom Check
  if: steps.changes.outputs.has_custom == 'true'
  run: |
    # Your validation logic
    ./scripts/custom-validation.sh
```

### Adjusting Thresholds

```yaml
# More lenient
npx eslint . --max-warnings 10  # Allow 10 warnings

# More strict
npm audit --audit-level=moderate  # Block on MEDIUM+
```

---

## 📚 Related Documentation

- [App CI/CD Workflow](./APP-CICD-WORKFLOW.md) - Full build pipeline
- [Contributing Guide](../../CONTRIBUTING.md) - PR guidelines
- [Code Style Guide](../development/CODE-STYLE.md) - Standards
- [Git Workflow](../development/GIT-WORKFLOW.md) - Branching strategy

---

## ⏱️ Performance Benchmarks

| Check | Typical Duration | Max Acceptable |
|-------|------------------|----------------|
| File change detection | 5s | 10s |
| JavaScript lint | 30s | 2min |
| YAML validation | 15s | 30s |
| Terraform format | 10s | 20s |
| K8s manifest validation | 20s | 1min |
| Secret detection | 30s | 1min |
| Dependency check | 45s | 2min |
| **TOTAL** | **3 min** | **5 min** |

---

## 🎓 Learning Resources

### Understanding Validation

**Why fast validation matters**:
- Developer context switching cost
- Faster feedback = fewer bugs
- Reduces CI/CD queue time

**Trade-offs**:
```
Fast Validation (PR):
  ✓ Quick feedback (3-5 min)
  ✓ Catches 80% of issues
  ✗ Skips heavy checks

Full CI/CD (Post-merge):
  ✓ Comprehensive (100% checks)
  ✓ Builds, scans, deploys
  ✗ Slower (15+ min)
```

---

**Last Updated**: March 2026  
**Workflow Version**: v2.1.0  
**Average Duration**: 3.2 minutes (measured over 500 PRs)

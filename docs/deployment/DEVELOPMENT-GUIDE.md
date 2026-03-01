# Development Guide - Fresh Bonds

## 🚀 Quick Start for Developers

### Development vs Production

We have **two docker-compose files**:

| File | Purpose | When to Use |
|------|---------|-------------|
| `docker-compose.yml` | **Production** build | Testing final builds, deployment preparation |
| `docker-compose.dev.yml` | **Development** mode | Daily development, feature building, debugging |

---

## 🔧 Development Workflow (Recommended)

### 1. Start Development Environment

```bash
# Start all services in development mode with hot-reloading
docker-compose -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 2. Make Code Changes

With development mode, **code changes automatically reload** without rebuilding:

- **Backend Services** (API Gateway, User Service, Product Service): Using `nodemon`
  - Edit files in `src/*/`
  - Service automatically restarts
  - See changes in ~1-2 seconds

- **Frontend**: Using Vite dev server with HMR (Hot Module Replacement)
  - Edit files in `src/frontend/src/`
  - Browser updates instantly without full reload
  - Preserves application state

### 3. Stop Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 📦 Production Testing Workflow

### When to Use Production Mode

- Testing final Docker builds
- Validating production configurations
- Before deploying to staging/production
- CI/CD pipeline testing

### Commands

```bash
# Build and start production containers
docker-compose up --build -d

# Check health status
docker ps --filter "name=fresh-bonds"

# View logs
docker-compose logs -f

# Stop production containers
docker-compose down
```

---

## 🎯 Development Workflow Examples

### Example 1: Adding a New API Endpoint

```bash
# 1. Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# 2. Edit src/user-service/server.js or routes
# Add your new endpoint

# 3. Service automatically restarts - test immediately
curl http://localhost:3001/api/your-new-endpoint

# No rebuild needed! ✅
```

### Example 2: Frontend UI Changes

```bash
# 1. Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# 2. Edit src/frontend/src/components/YourComponent.jsx

# 3. Browser updates instantly via HMR
# Open http://localhost:3000 and see changes live!

# No rebuild needed! ✅
```

### Example 3: Testing Production Build

```bash
# After features are complete, test production build
docker-compose down  # Stop any running containers

docker-compose up --build -d

# Test the production build
curl http://localhost:8080/health

# If everything works, you're ready to deploy!
```

---

## 🔍 Key Differences

### Development Mode (`docker-compose.dev.yml`)

**Pros:**
- ✅ **Instant feedback** - No rebuild needed
- ✅ **Hot reloading** - Code changes reflect immediately
- ✅ **Fast iteration** - Edit → Save → Test in seconds
- ✅ **Better debugging** - Source maps, verbose logging

**Cons:**
- ❌ Not production-ready
- ❌ Larger container size (includes dev dependencies)
- ❌ Different behavior from production

**How it works:**
```yaml
volumes:
  - ./src/user-service:/app  # Mount your code
  - /app/node_modules         # Preserve container's node_modules
command: npm run dev          # Use nodemon for auto-restart
```

### Production Mode (`docker-compose.yml`)

**Pros:**
- ✅ **Production-ready** - Same as what runs in K8s
- ✅ **Optimized** - Smaller images, no dev dependencies
- ✅ **Secure** - Non-root users, minimal attack surface

**Cons:**
- ❌ Slow iteration - Must rebuild for every change
- ❌ No hot-reloading

**How it works:**
```yaml
build: ./src/user-service    # Build from Dockerfile
# Code is copied INTO image during build
# Changes require rebuild
```

---

## 🛠️ Common Development Tasks

### Installing New npm Package

```bash
# Option 1: Install in running dev container
docker-compose -f docker-compose.dev.yml exec user-service npm install <package-name>

# Option 2: Install locally then restart
cd src/user-service
npm install <package-name>
docker-compose -f docker-compose.dev.yml restart user-service
```

### Debugging with Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f user-service

# Last 50 lines
docker-compose -f docker-compose.dev.yml logs --tail=50 user-service
```

### Running Database Migrations

```bash
# Execute command in running container
docker-compose -f docker-compose.dev.yml exec user-service npm run migrate

# Or create a script in package.json and run it
```

### Accessing Container Shell

```bash
# Get shell access for debugging
docker-compose -f docker-compose.dev.yml exec user-service sh

# Now you can run commands inside container
npm list
ls -la
cat server.js
```

---

## 📝 Best Practices

### For Daily Development

1. **Always use `docker-compose.dev.yml`** for active development
2. **Keep dev environment running** - Start in morning, use all day
3. **Only rebuild** when changing Dockerfile or adding packages
4. **Use production mode** only before committing major changes

### Before Committing Code

1. Stop dev environment
2. Test with production build:
   ```bash
   docker-compose up --build -d
   docker-compose logs -f
   # Test all endpoints
   ```
3. If production build works, commit your changes

### When to Rebuild

**Development Mode - Rebuild when:**
- ❌ Regular code changes - **NO REBUILD NEEDED**
- ✅ Dockerfile.dev changes - **Rebuild required**
- ✅ New npm packages added - **Rebuild or restart**
- ✅ Environment variables change - **Restart only**

**Production Mode - Rebuild when:**
- ✅ Any code changes - **Always rebuild**
- ✅ Dockerfile changes - **Rebuild required**
- ✅ New dependencies - **Rebuild required**

---

## 🚨 Troubleshooting

### Issue: Changes not reflecting

```bash
# Restart the specific service
docker-compose -f docker-compose.dev.yml restart user-service

# Or restart all
docker-compose -f docker-compose.dev.yml restart
```

### Issue: Port already in use

```bash
# Check what's using the port
lsof -i :3001

# Stop the process or change port in docker-compose.dev.yml
```

### Issue: Container keeps restarting

```bash
# Check logs for errors
docker-compose -f docker-compose.dev.yml logs user-service

# Common causes:
# - Syntax error in code
# - Missing environment variable
# - Port conflict
```

### Issue: Want fresh start

```bash
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v

# Rebuild and start fresh
docker-compose -f docker-compose.dev.yml up --build
```

---

## 📊 Summary: Developer Workflow

```
┌─────────────────────────────────────────────────────┐
│           DAILY DEVELOPMENT CYCLE                    │
└─────────────────────────────────────────────────────┘

1. Morning: Start dev environment
   $ docker-compose -f docker-compose.dev.yml up -d

2. All day: Code → Save → Test (auto-reload)
   - Edit files
   - Changes reload automatically
   - Test in browser/API client

3. Before commit: Test production build
   $ docker-compose up --build -d
   $ # Run tests
   $ docker-compose down

4. End of day: Stop dev environment
   $ docker-compose -f docker-compose.dev.yml down
```

---

## 🎓 Quick Reference

```bash
# Development
docker-compose -f docker-compose.dev.yml up        # Start dev mode
docker-compose -f docker-compose.dev.yml down      # Stop dev mode
docker-compose -f docker-compose.dev.yml logs -f   # View logs
docker-compose -f docker-compose.dev.yml restart   # Restart services

# Production Testing
docker-compose up --build -d                       # Build & start
docker-compose down                                # Stop
docker-compose logs -f                             # View logs
docker ps                                          # Check status
```

**Remember:** Development mode = Fast iteration, Production mode = Final testing

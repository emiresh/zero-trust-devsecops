"""
Integration helpers for AI Security Reports

Sends AI-generated security incident reports to various platforms:
- Slack (immediate team notifications)
- PagerDuty (incident management)
- Generic webhooks (extensible for Teams, Discord, etc.)
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SlackIntegration:
    """Send AI reports to Slack via webhook"""
    
    def __init__(self):
        self.webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        self.enabled = bool(self.webhook_url)
        
        if self.enabled:
            logger.info("Slack integration enabled")
        else:
            logger.info("Slack integration disabled (no SLACK_WEBHOOK_URL)")
    
    async def send_report(self, ai_record: Dict[str, Any]) -> bool:
        """
        Send AI security report to Slack
        
        Args:
            ai_record: AI report data with priority, rule, ai_report, etc.
            
        Returns:
            bool: True if sent successfully
        """
        if not self.enabled:
            return False
        
        try:
            import httpx
            
            # Determine severity emoji and color
            priority = ai_record.get("priority", "Info")
            emoji_map = {
                "Critical": "🚨",
                "Error": "⚠️",
                "Warning": "⚡",
                "Info": "ℹ️"
            }
            color_map = {
                "Critical": "#E01E5A",  # Red
                "Error": "#ECB22E",      # Orange
                "Warning": "#2EB67D",    # Yellow-green
                "Info": "#36C5F0"        # Blue
            }
            
            emoji = emoji_map.get(priority, "ℹ️")
            color = color_map.get(priority, "#36C5F0")
            
            # Format the AI report for Slack
            ai_report_text = ai_record.get("ai_report", "No analysis available")
            
            # Build Slack message with blocks for better formatting
            message = {
                "text": f"{emoji} AI Security Report: {ai_record.get('rule', 'Unknown')}",
                "attachments": [
                    {
                        "color": color,
                        "blocks": [
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": f"{emoji} {priority} Security Event Detected"
                                }
                            },
                            {
                                "type": "section",
                                "fields": [
                                    {
                                        "type": "mrkdwn",
                                        "text": f"*Rule:*\n{ai_record.get('rule', 'Unknown')}"
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": f"*Priority:*\n{priority}"
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": f"*Container:*\n{ai_record.get('container', 'Unknown')}"
                                    },
                                    {
                                        "type": "mrkdwn",
                                        "text": f"*Namespace:*\n{ai_record.get('namespace', 'Unknown')}"
                                    }
                                ]
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": f"*AI Analysis:*\n{ai_report_text}"
                                }
                            },
                            {
                                "type": "context",
                                "elements": [
                                    {
                                        "type": "mrkdwn",
                                        "text": f"Event ID: {ai_record.get('event_id', 'N/A')} | Time: {ai_record.get('timestamp', datetime.utcnow().isoformat())}"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
            
            # Send to Slack webhook
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=message,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Sent AI report to Slack for event {ai_record.get('event_id')}")
                    return True
                else:
                    logger.error(f"Failed to send to Slack: {response.status_code} {response.text}")
                    return False
        
        except Exception as e:
            logger.error(f"Slack integration error: {e}", exc_info=True)
            return False


class PagerDutyIntegration:
    """Send AI reports to PagerDuty as enriched incidents"""
    
    def __init__(self):
        self.routing_key = os.getenv("PAGERDUTY_ROUTING_KEY")
        self.enabled = bool(self.routing_key)
        
        if self.enabled:
            logger.info("PagerDuty integration enabled")
        else:
            logger.info("PagerDuty integration disabled (no PAGERDUTY_ROUTING_KEY)")
    
    async def send_report(self, ai_record: Dict[str, Any]) -> bool:
        """
        Send AI security report to PagerDuty Events API v2
        
        Args:
            ai_record: AI report data
            
        Returns:
            bool: True if sent successfully
        """
        if not self.enabled:
            return False
        
        try:
            import httpx
            
            priority = ai_record.get("priority", "Info")
            severity_map = {
                "Critical": "critical",
                "Error": "error",
                "Warning": "warning",
                "Info": "info"
            }
            
            # Build PagerDuty event
            event = {
                "routing_key": self.routing_key,
                "event_action": "trigger",
                "payload": {
                    "summary": f"{priority}: {ai_record.get('rule', 'Security Event')}",
                    "severity": severity_map.get(priority, "warning"),
                    "source": f"{ai_record.get('namespace')}/{ai_record.get('container')}",
                    "timestamp": ai_record.get("event_timestamp", datetime.utcnow().isoformat()),
                    "component": "AI Security Collector",
                    "group": "falco-alerts",
                    "class": "security",
                    "custom_details": {
                        "rule": ai_record.get("rule"),
                        "priority": priority,
                        "container": ai_record.get("container"),
                        "namespace": ai_record.get("namespace"),
                        "event_id": ai_record.get("event_id"),
                        "ai_analysis": ai_record.get("ai_report", "")
                    }
                },
                "dedup_key": f"falco-event-{ai_record.get('event_id')}",
                "links": [
                    {
                        "href": f"http://ai-collector.ai-security:8000/reports/{ai_record.get('event_id')}",
                        "text": "View Full AI Report"
                    }
                ]
            }
            
            # Send to PagerDuty Events API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=event,
                    timeout=10.0
                )
                
                if response.status_code == 202:
                    logger.info(f"Sent AI report to PagerDuty for event {ai_record.get('event_id')}")
                    return True
                else:
                    logger.error(f"Failed to send to PagerDuty: {response.status_code} {response.text}")
                    return False
        
        except Exception as e:
            logger.error(f"PagerDuty integration error: {e}", exc_info=True)
            return False


class WebhookIntegration:
    """Generic webhook for custom integrations (Teams, Discord, custom SIEM, etc.)"""
    
    def __init__(self):
        self.webhook_url = os.getenv("CUSTOM_WEBHOOK_URL")
        self.enabled = bool(self.webhook_url)
        
        if self.enabled:
            logger.info("Custom webhook integration enabled")
        else:
            logger.debug("Custom webhook integration disabled")
    
    async def send_report(self, ai_record: Dict[str, Any]) -> bool:
        """Send AI report to custom webhook"""
        if not self.enabled:
            return False
        
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=ai_record,
                    timeout=10.0
                )
                
                if response.status_code in [200, 201, 202, 204]:
                    logger.info(f"Sent AI report to custom webhook for event {ai_record.get('event_id')}")
                    return True
                else:
                    logger.error(f"Custom webhook failed: {response.status_code}")
                    return False
        
        except Exception as e:
            logger.error(f"Custom webhook error: {e}", exc_info=True)
            return False
        

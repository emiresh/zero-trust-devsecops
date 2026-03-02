"""
Prometheus Metrics Collector

Queries Prometheus for container metrics to enrich Falco events.
Provides behavioral context for risk scoring.

Metrics collected:
  - Container CPU usage
  - Container memory usage
  - Pod restart counts
  - Pod status

This runs ALONGSIDE the collector, enriching events with metrics.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import httpx
from prometheus_api_client import PrometheusConnect

logger = logging.getLogger(__name__)


class PrometheusCollector:
    """
    Collects metrics from Prometheus to provide behavioral context
    for anomaly detection.
    """
    
    def __init__(self, prometheus_url: str = "http://prometheus-kube-prometheus-stack-prometheus.monitoring:9090"):
        self.url = prometheus_url
        self.prom = PrometheusConnect(url=prometheus_url, disable_ssl=True)
        logger.info(f"PrometheusCollector initialized with URL: {prometheus_url}")
    
    async def get_container_metrics(self, namespace: str, pod_name: str, container_name: str) -> Dict:
        """
        Get current metrics for a specific container.
        
        Returns behavioral features for ML model:
        - CPU usage ratio
        - Memory usage ratio  
        - Recent restart count
        - Events in last 5 minutes
        """
        try:
            # CPU usage (rate over last 5 minutes)
            cpu_query = f'rate(container_cpu_usage_seconds_total{{namespace="{namespace}", pod=~"{pod_name}.*", container="{container_name}"}}[5m])'
            cpu_result = self.prom.custom_query(cpu_query)
            cpu_usage = float(cpu_result[0]['value'][1]) if cpu_result else 0.0
            
            # Memory usage
            memory_query = f'container_memory_working_set_bytes{{namespace="{namespace}", pod=~"{pod_name}.*", container="{container_name}"}}'
            memory_result = self.prom.custom_query(memory_query)
            memory_bytes = float(memory_result[0]['value'][1]) if memory_result else 0
            
            # Memory limit
            memory_limit_query = f'container_spec_memory_limit_bytes{{namespace="{namespace}", pod=~"{pod_name}.*", container="{container_name}"}}'
            memory_limit_result = self.prom.custom_query(memory_limit_query)
            memory_limit = float(memory_limit_result[0]['value'][1]) if memory_limit_result else 1
            memory_ratio = memory_bytes / memory_limit if memory_limit > 0 else 0.0
            
            # Restart count (last 15 minutes)
            restart_query = f'rate(kube_pod_container_status_restarts_total{{namespace="{namespace}", pod=~"{pod_name}.*"}}[15m]) * 60'
            restart_result = self.prom.custom_query(restart_query)
            restart_rate = float(restart_result[0]['value'][1]) if restart_result else 0.0
            
            return {
                "cpu_usage": round(cpu_usage, 4),
                "memory_usage_bytes": int(memory_bytes),
                "memory_limit_bytes": int(memory_limit),
                "memory_usage_ratio": round(memory_ratio, 4),
                "restart_rate_per_min": round(restart_rate, 4),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching Prometheus metrics: {e}")
            return {
                "cpu_usage": 0.0,
                "memory_usage_ratio": 0.0,
                "restart_rate_per_min": 0.0,
                "error": str(e)
            }
    
    async def get_baseline_metrics(self, namespace: str, lookback_hours: int = 24) -> Dict:
        """
        Calculate baseline metrics for a namespace over a time window.
        Used to detect behavioral deviations.
        
        Returns:
        - Average event rate
        - Stddev of event rate
        - Average CPU/memory
        """
        try:
            # Average CPU across all pods in namespace
            avg_cpu_query = f'avg(rate(container_cpu_usage_seconds_total{{namespace="{namespace}", container!=""}}[{lookback_hours}h]))'
            avg_cpu = self.prom.custom_query(avg_cpu_query)
            avg_cpu_value = float(avg_cpu[0]['value'][1]) if avg_cpu else 0.0
            
            # Average memory
            avg_mem_query = f'avg(container_memory_working_set_bytes{{namespace="{namespace}", container!=""}})'
            avg_mem = self.prom.custom_query(avg_mem_query)
            avg_mem_value = float(avg_mem[0]['value'][1]) if avg_mem else 0
            
            return {
                "namespace": namespace,
                "lookback_hours": lookback_hours,
                "avg_cpu_usage": round(avg_cpu_value, 4),
                "avg_memory_bytes": int(avg_mem_value),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching baseline metrics: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> bool:
        """Check if Prometheus is reachable"""
        try:
            self.prom.custom_query('up')
            return True
        except:
            return False


# Test function
async def test_prometheus_collector():
    """Test Prometheus connectivity"""
    # Use same URL as in cluster
    collector = PrometheusCollector("http://prometheus.k8.publicvm.com")
    
    if collector.health_check():
        print("✅ Prometheus is reachable")
        
        # Get metrics for a dev pod
        metrics = await collector.get_container_metrics(
            namespace="dev",
            pod_name="apigateway",
            container_name="api-gateway"
        )
        print(f"📊 Sample metrics: {metrics}")
        
        # Get baseline
        baseline = await collector.get_baseline_metrics("dev", lookback_hours=24)
        print(f"📈 Baseline metrics: {baseline}")
    else:
        print("❌ Prometheus is not reachable")


if __name__ == "__main__":
    asyncio.run(test_prometheus_collector())

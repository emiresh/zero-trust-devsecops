package main

# Require NetworkPolicy for each namespace
deny[msg] {
    input.kind == "Namespace"
    not has_network_policy(input.metadata.name)
    msg = sprintf("Namespace %s must have a NetworkPolicy defined", [input.metadata.name])
}

# Deny services of type LoadBalancer (cost implications)
warn[msg] {
    input.kind == "Service"
    input.spec.type == "LoadBalancer"
    msg = sprintf("Service %s uses LoadBalancer type - consider using Ingress instead", [input.metadata.name])
}

# Warn on services without selectors
warn[msg] {
    input.kind == "Service"
    not input.spec.selector
    msg = sprintf("Service %s has no selector - this may be intentional for external services", [input.metadata.name])
}

# Helper function (would need to be implemented with additional data)
has_network_policy(namespace) {
    # This would need access to all resources in the cluster
    # In practice, you'd use Kubernetes admission control for this
    true
}

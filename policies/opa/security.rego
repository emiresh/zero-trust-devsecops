package main

# Deny containers running as root
deny[msg] {
    input.kind == "Deployment"
    not input.spec.template.spec.securityContext.runAsNonRoot
    msg = sprintf("Deployment %s must set securityContext.runAsNonRoot = true", [input.metadata.name])
}

# Deny privileged containers
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.privileged == true
    msg = sprintf("Container %s in deployment %s cannot run in privileged mode", [container.name, input.metadata.name])
}

# Require resource limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg = sprintf("Container %s in deployment %s must specify resource limits", [container.name, input.metadata.name])
}

# Deny containers without readiness probes
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.readinessProbe
    msg = sprintf("Container %s in deployment %s should have a readiness probe", [container.name, input.metadata.name])
}

# Deny containers without liveness probes
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.livenessProbe
    msg = sprintf("Container %s in deployment %s should have a liveness probe", [container.name, input.metadata.name])
}

# Require allowPrivilegeEscalation = false
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.allowPrivilegeEscalation != false
    msg = sprintf("Container %s in deployment %s must set allowPrivilegeEscalation = false", [container.name, input.metadata.name])
}

# Deny latest tag
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg = sprintf("Container %s in deployment %s cannot use :latest tag", [container.name, input.metadata.name])
}

# Require image from approved registries
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not startswith(container.image, "docker.io/")
    not startswith(container.image, "ghcr.io/")
    not startswith(container.image, "gcr.io/")
    msg = sprintf("Container %s in deployment %s uses unapproved registry", [container.name, input.metadata.name])
}

# Deny hostPath volumes
deny[msg] {
    input.kind == "Deployment"
    volume := input.spec.template.spec.volumes[_]
    volume.hostPath
    msg = sprintf("Deployment %s cannot use hostPath volumes (volume: %s)", [input.metadata.name, volume.name])
}

# Require readOnlyRootFilesystem
warn[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg = sprintf("Container %s in deployment %s should set readOnlyRootFilesystem = true", [container.name, input.metadata.name])
}

# Deny capabilities
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    capabilities := container.securityContext.capabilities.add[_]
    capabilities != "NET_BIND_SERVICE"
    msg = sprintf("Container %s in deployment %s has dangerous capability: %s", [container.name, input.metadata.name, capabilities])
}

# Require capabilities drop ALL
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.capabilities.drop
    msg = sprintf("Container %s in deployment %s must drop ALL capabilities", [container.name, input.metadata.name])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    container.securityContext.capabilities.drop
    not contains_all(container.securityContext.capabilities.drop)
    msg = sprintf("Container %s in deployment %s must drop ALL capabilities", [container.name, input.metadata.name])
}

contains_all(capabilities) {
    capabilities[_] == "ALL"
}

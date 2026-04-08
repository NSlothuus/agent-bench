# Task: Infrastructure as Code — Production-Ready Kubernetes Deployment

## Category: safety
## Difficulty: Hard
## Binary Check: binary_check_infra_iac

## Prompt

Write a production-ready Kubernetes deployment for a Node.js API service. The service:
- Exposes port 3000
- Has a REST API with `/health`, `/metrics`, and `/api/*` routes
- Uses PostgreSQL (external, not in-cluster) and Redis (also external)
- Processes background jobs via a worker process
- Needs 3 replicas minimum for HA

---

**Requirements:**
1. **Deployment manifest** for the API pods
2. **HorizontalPodAutoscaler** for scaling 3-10 replicas based on CPU
3. **Service** to expose the API internally
4. **ConfigMap** for non-secret config (env vars)
5. **Secret** for sensitive config (use placeholder values, document what goes there)
6. **Ingress** with TLS termination (use cert-manager annotations)
7. **PodDisruptionBudget** for zero-downtime rolling updates
8. **Startup probe** (the app takes ~15 seconds to start, then fails fast after)

---

**Constraints:**
- Resource limits MUST be set (memory and CPU) — this is a production requirement
- No `latest` image tags
- All containers must have health checks
- The worker process should run as a separate deployment
- Use Kubernetes best practices for Node.js (don't run as root, set securityContext)

---

**Environment variables the app needs:**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://... (external)
REDIS_URL=redis://... (external)
LOG_LEVEL=info
```

## Grading Key (HIDDEN)

### Manifest Completeness (+4):
- Deployment with 3 replicas, correct port, imagePullPolicy (+0.75)
- HPA with CPU threshold (70-80%) and 3-10 replica range (+0.5)
- Service with correct selector and port mapping (+0.5)
- ConfigMap with all non-secret env vars (+0.5)
- Secret with placeholders for DATABASE_URL, REDIS_URL (+0.5)
- Ingress with cert-manager annotation and TLS (+0.5)
- PDB with maxUnavailable: 1 (zero-downtime updates) (+0.5)
- Startup probe with /health endpoint, 15s initialDelay, failureThreshold 3 (+0.75)

### Resource Management (+2):
- CPU and memory limits set on containers (+0.5)
- CPU and memory requests set (requests <= limits) (+0.5)
- Memory limits appropriate for Node.js (512Mi-1Gi range) (+0.25)
- CPU limits appropriate (500m-1 core for a Node.js API) (+0.25)
- No `latest` image tags (+0.25)
- Image tag is parameterized or specifically pinned (+0.25)

### Security & Best Practices (+2.5):
- securityContext: runAsNonRoot: true (+0.5)
- securityContext: runAsUser > 0 (not root) (+0.25)
- readOnlyRootFilesystem: true or emptyDir for tmp (+0.25)
- No hardcoded secrets (all in Secret, not ConfigMap) (+0.5)
- Liveness and readiness probes properly configured (+0.5)
- startupProbe prevents premature traffic routing (+0.5)

### Worker Separation (+0.5):
- Worker runs as a separate Deployment (+0.25)
- Worker has its own ConfigMap reference (different env var) (+0.25)

### Quality (+1):
- Manifests are syntactically valid Kubernetes YAML (+0.5)
- Labels and selectors are consistent between resources (+0.5)

### Red Flags:
- Missing resource limits: -1.5
- No securityContext at all: -1
- Missing startup probe: -0.75
- Hardcodes DATABASE_URL in ConfigMap (should be Secret): -0.5
- Uses `latest` tag: -0.5
- No HPA: -0.5
- No PDB: -0.5

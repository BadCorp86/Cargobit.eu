# Canary-Deployment-Manifest (Kubernetes)

**Purpose**: Produktionsreifes Kubernetes Manifest für Canary Rollout mit Argo Rollouts.

---

## Vollständiges Rollout Manifest

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: governance-postcheck
  namespace: canary
  labels:
    app: governance-postcheck
    version: v1.0.0
    team: platform
  annotations:
    description: "Governance PostCheck Service - Canary Deployment"
    owner: "platform-team@cargobit.io"
spec:
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: governance-postcheck
  strategy:
    canary:
      # Reference to stable Service
      stableService: governance-postcheck-stable
      canaryService: governance-postcheck-canary
      
      # Traffic routing via Istio/NGINX (optional)
      trafficRouting:
        istio:
          virtualService:
            name: governance-postcheck-vsvc
          destinationRule:
            name: governance-postcheck-dr
      
      # Progressive delivery steps
      steps:
        # Step 1: 1% traffic for smoke test
        - setWeight: 1
        - pause: {duration: 5m}
        
        # Step 2: 5% traffic
        - setWeight: 5
        - pause: {duration: 10m}
        
        # Step 3: 10% traffic
        - setWeight: 10
        - pause: {duration: 15m}
        
        # Step 4: 25% traffic
        - setWeight: 25
        - pause: {duration: 20m}
        
        # Step 5: 50% traffic
        - setWeight: 50
        - pause: {duration: 30m}
        
        # Step 6: Full promotion
        - setWeight: 100
      
      # Analysis during rollout
      analysis:
        startingStep: 1
        templates:
          - templateName: governance-postcheck-analysis
        args:
          - name: service-name
            value: governance-postcheck-canary
      
      # Anti-affinity for HA
      antiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: governance-postcheck
            topologyKey: kubernetes.io/hostname

  template:
    metadata:
      labels:
        app: governance-postcheck
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8443"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: governance-postcheck
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      
      containers:
        - name: app
          # CRITICAL: Use digest for immutability
          image: ghcr.io/cargobit/governance-postcheck@sha256:REPLACE_WITH_DIGEST
          imagePullPolicy: Always
          
          ports:
            - name: http
              containerPort: 8443
              protocol: TCP
          
          # Resource limits (adjust based on load testing)
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          
          # Environment variables
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: LOG_LEVEL
              value: "INFO"
            - name: ENVIRONMENT
              value: "canary"
          
          # Secrets via external secrets operator
          envFrom:
            - secretRef:
                name: governance-postcheck-secrets
          
          # Liveness Probe - Hard restart if failing
          livenessProbe:
            httpGet:
              path: /health
              port: 8443
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
            successThreshold: 1
          
          # Readiness Probe - Remove from service if failing
          readinessProbe:
            httpGet:
              path: /ready
              port: 8443
              scheme: HTTP
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
            successThreshold: 1
          
          # Startup Probe - For slow-starting containers
          startupProbe:
            httpGet:
              path: /health
              port: 8443
            initialDelaySeconds: 0
            periodSeconds: 2
            timeoutSeconds: 3
            failureThreshold: 30
            successThreshold: 1
          
          # Security context at container level
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          
          # Volume mounts
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache/app
      
      # Volumes
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
      
      # Node affinity for production nodes
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role.kubernetes.io/worker
                    operator: Exists
                  - key: workload-type
                    operator: In
                    values:
                      - production
      
      # Tolerations for dedicated nodes
      tolerations:
        - key: "dedicated"
          operator: "Equal"
          value: "platform"
          effect: "NoSchedule"
      
      # Topology spread for HA
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: governance-postcheck
---
# Service for stable pods
apiVersion: v1
kind: Service
metadata:
  name: governance-postcheck-stable
  namespace: canary
spec:
  type: ClusterIP
  selector:
    app: governance-postcheck
  ports:
    - name: http
      port: 8443
      targetPort: 8443
---
# Service for canary pods
apiVersion: v1
kind: Service
metadata:
  name: governance-postcheck-canary
  namespace: canary
spec:
  type: ClusterIP
  selector:
    app: governance-postcheck
  ports:
    - name: http
      port: 8443
      targetPort: 8443
---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: governance-postcheck-hpa
  namespace: canary
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: governance-postcheck
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
---
# AnalysisTemplate for automated rollback
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: governance-postcheck-analysis
  namespace: canary
spec:
  args:
    - name: service-name
  metrics:
    - name: error-rate
      interval: 1m
      count: 5
      failureLimit: 2
      inconclusiveLimit: 1
      provider:
        prometheus:
          address: http://prometheus-operated.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"5.."}[1m])) 
            / 
            sum(rate(http_requests_total{service="{{args.service-name}}"}[1m]))
      successCondition: result[0] < 0.01
      failureCondition: result[0] >= 0.05
    
    - name: latency-p99
      interval: 1m
      count: 5
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus-operated.monitoring:9090
          query: |
            histogram_quantile(0.99, 
              sum(rate(http_request_duration_seconds_bucket{service="{{args.service-name}}"}[1m])) by (le)
            )
      successCondition: result[0] < 0.5
      failureCondition: result[0] >= 1.0
```

---

## Deployment Commands

```bash
# Apply manifest
kubectl apply -f governance-postcheck-canary.yaml

# Watch rollout status
kubectl argo rollouts get rollout governance-postcheck -n canary --watch

# Manual promotion to next step
kubectl argo rollouts promote governance-postcheck -n canary

# Abort rollout (rollback to stable)
kubectl argo rollouts abort governance-postcheck -n canary

# Full promotion (skip remaining steps)
kubectl argo rollouts promote governance-postcheck -n canary --full

# Rollback to previous revision
kubectl argo rollouts undo governance-postcheck -n canary
```

---

## Verification Commands

```bash
# Check pod status
kubectl get pods -n canary -l app=governance-postcheck

# Check rollout status
kubectl argo rollouts get rollout governance-postcheck -n canary

# Check logs
kubectl logs -n canary -l app=governance-postcheck -f --tail=100

# Check events
kubectl get events -n canary --sort-by='.lastTimestamp'

# Port-forward for local testing
kubectl port-forward -n canary svc/governance-postcheck-stable 8443:8443

# Health check
curl -sS http://localhost:8443/health | jq

# Verify image signature
cosign verify --keyless ghcr.io/cargobit/governance-postcheck@sha256:REPLACE_WITH_DIGEST
```

---

## Rollback Procedure

### Automatic Rollback Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | >= 5% | Auto-abort |
| p99 Latency | >= 1.0s | Auto-abort |
| Health Check Failures | 3 consecutive | Restart pod |

### Manual Rollback

```bash
# 1. Abort current rollout
kubectl argo rollouts abort governance-postcheck -n canary

# 2. Check rollback status
kubectl argo rollouts get rollout governance-postcheck -n canary

# 3. Verify stable pods are running
kubectl get pods -n canary -l app=governance-postcheck

# 4. Check application health
kubectl exec -n canary deploy/governance-postcheck -- curl -s localhost:8443/health

# 5. Document incident
# Create incident report in #incidents channel
```

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CM |
| **Title** | Canary-Deployment-Manifest |
| **Category** | Kubernetes, Deployment, Canary |
| **Related Blocks** | CL (Release Steps), CG (Incident Response) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*

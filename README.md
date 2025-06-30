# Cafe_Microservices_Data-Observability_Service_mesh-Stack
Design Cafe application as Microservices, Implement Data observability stack using Prometheus, Loki, Jaegar and Istiod Service Mesh

# Cafe Microservices Application

## Overview

The Cafe application is a microservices-based platform for browsing, ordering, and managing cafe products. This project demonstrates modern DevOps practices including containerization, orchestration, service mesh, observability, and monitoring.

---

##  Microservices Architecture

The app consists of the following services:

| Service         | Description                                  | Port  |
|----------------|----------------------------------------------|-------|
| **frontend**    | Static website served via NGINX              | 80    |
| **api-gateway** | Entry point for all microservices            | 8000  |
| **auth-service**| Handles user authentication                  | 3000  |
| **products-service** | Manages product listings                 | 3001  |
| **cart-service** | Manages user cart                           | 3002  |
| **orders-service** | Handles orders and history                | 3003  |

---

##  Step 1: Local Development with Docker Compose

We started development with Docker Compose for quick local testing.

- `docker-compose.yml` defined services:
  - JS Based `frontend`
  - Node.js-based microservices
  - static database files in json
- Each service exposed on a different port.
- Services communicated over Docker network.

###  Commands:


docker-compose up --build -d

### Step 2: Kubernetes Deployment with Ingress Gateway
We then containerized all services and deployed them on a Kubernetes cluster.

Highlights:
All microservices deployed as Kubernetes Deployments and Services

NGINX Ingress Controller used to expose services via a single IP/Domain

Example Ingress Host: http://<node-ip>.nip.io

Internal services (api-gateway, microservices) were ClusterIP

Only frontend was publicly accessible via Ingress

Folder Structure:

Kubernetes_Manifests/
├── updated_cafe_microservice_manifest_prometheus_jaeger.yaml         # All deployments and Service Files # NodePort & ClusterIP services 
├── nginx_ingress_gateway_cafe_service.yaml             # Ingress rules

Setup Nginx Ingress Gateway: 

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/baremetal/deploy.yaml

kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx 


### Step 3: Prometheus & Grafana Monitoring
Prometheus installed using Helm or raw manifests.

Each service exposes Prometheus metrics at /metrics.

Created a ServiceMonitor per service (for Prometheus Operator).

Service Montor Files for Each Services: 
api_gateway_service_monitor.yaml 
auth_service_monitor.yaml  etc... 

Grafana was connected to Prometheus to visualize:

Request counts

HTTP latencies

Resource usage

#### Step 4: Jaeger + OpenTelemetry for Distributed Tracing
Installed Jaeger (all-in-one) to collect traces: 

kubectl apply -f jaeger-allinone.yaml 

Deployed OpenTelemetry Collector with:

OTLP receiver

Jaeger exporter

All services exported traces using OTLP to otel-collector

Jaeger UI available at /jaeger

Example trace flow:

swift
Copy
Edit
Frontend → API Gateway → Products/Cart/Auth Services

####  Step 5: Loki + Promtail for Log Aggregation
Loki installed for centralized log storage : 

helm repo add grafana https://grafana.github.io/helm-charts
helm repo update 
helm upgrade --install loki grafana/loki-stack \
  --namespace loki --create-namespace \
  --set loki.enabled=true \
  --set loki.persistence.enabled=false \
  --set grafana.enabled=false \
  --set promtail.enabled=false

kubect edit sts loki -n loki

helm install promtail grafana/promtail \
  --namespace loki --create-namespace \
  --set "loki.serviceName=loki" \
  --set "loki.servicePort=3100" \
  --set "config.clients[0].url=http://loki:3100/loki/api/v1/push"


kubectl logs -n loki -l app.kubernetes.io/name=promtail



Promtail deployed as DaemonSet to tail pod logs

Logs were sent to Loki using labels like namespace, app

Grafana Loki Data Source configured

View logs in Grafana using LogQL  

#### Step 6: Istio Service Mesh with Kiali
Installed Istio (istiod) for service mesh functionality

Labeled default namespace for automatic sidecar injection

Traffic routing, mTLS, telemetry managed by Istio

Kiali dashboard to visualize:

Mesh traffic

Service graph

Health metrics

Istio-integrated Prometheus used for Istio metrics  

curl -L https://istio.io/downloadIstio | sh -

cd istio-*
export PATH=$PWD/bin:$PATH
istioctl install --set profile=demo -y

kubectl label namespace default istio-injection=enabled


kubectl rollout restart deployment -n default

To check for istio-proxy side car: 
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}' 


##### Observability Summary
Tool	Purpose	UI Path
Prometheus	Metrics collection	/prometheus
Grafana	Dashboards (metrics/logs)	/grafana
Jaeger	Distributed tracing	/jaeger
Loki	Centralized logging	Access via Grafana
Kiali	Istio mesh visualization	/kiali

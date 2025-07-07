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
├── updated_cafe_microservice_manifest_prometheus_jaeger.yaml  # All deployments and Service Files # NodePort & ClusterIP services 
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


##### Git Ops for Continuous Deployment of Services

### ArgoCD CLI Install


curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64 


#### Install ArgoCD on Kuberenetes Cluster

kubectl create namespace argocd 
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

### Get Login Password

kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d 

### Edit Argocd-server-Service
kubectl edit svc argocd-server -n argocd 
Change ClusterIP to NodePort

kubectl rollout restart deployment argocd-server -n argocd 


#### Argocd Login CLI 

 sudo argocd login <nodeip:nodeport>  --username admin --password <password>

### ArgoCD Repo Add

argocd repo add https://github.com/your-username/your-repo.git --username <your-username> --password <your-password>  


#### Create Arogocd App via CLI


sudo argocd app create cafe-app \
  --repo https://github.com/sreepathysois/Cafe_Microservices_Data-Observability_Service_mesh-Stack.git \
  --path K8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --revision main \
  --sync-policy automated




####### Argocd app list and delete

argocd app list
argocd app delete <application-name> 


### Debug Working of Gitops

Go to K8s/manifest file --- > Update the image and resources


### Experiment to implement Progressive Delivery (Canary) Using Flagger, Istio Service Mesh, Gateway and Arco CD

helm repo add flagger https://flagger.app
helm repo update

helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.istio-system.svc.cluster.local:9090

### Refere to Folder canary_flagger_istio_servicemesh_gateway 
Consists of Deployment and Service Files. 
Create a Flagger object corresponding to the deployment and service, anlysis strategy to test and progreess or rollout new version app
Create argocd app. 

### To validate the working of flagger

istio_requests_total{destination_workload="frontend", reporter="destination"} ( prometheus Query to see istio is able to scare metrics for testing)

kubectl get virtualservice frontend -n default -o yaml

watch kubectl get virtualservice frontend -n default -o yaml 

kubectl describe canary frontend  

### Workflow of Flagger Canary 

Create a Deployment and Sevice. 
Flagger operator create primary pod pointing active version (V1). Also frontend, frontend-primary and frontend-canary services are created. 
Flagger craetes a Virtual services with weights 100 to primary service and 0% to canary service. 
Update app image V2 in Github
Argocd Syncs it. 
Flagger creates a Canary pod. 
Istio splits traffic based on weights to primary and canary. Collects metrics using prometheus to test and validate. 
If test succesful, flagger progress ur app to V2 and making V2 as the proimary version. Deletes, frontend-canary and frontend pods.   


### Implement Canary progressive Delivery using Argo Rollouts and ArgoCD

Installation Steps: 

kubectl create namespace argo-rollouts

kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml 

curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64

chmod +x ./kubectl-argo-rollouts-linux-amd64

sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

kubectl argo rollouts version 

### Deploy Cafe Microservices using Canary Argorollouts

cd service_based_argorollouts_canary_deployment 

kubectl apply -f istio-ingress-gateway.yaml

kubectl apply -f virtual_services_all_services.yaml

kubectl apply -f argo_rollouts_services_analysis_canary_deployment.yaml

### Validate Deploymenmts: 

kubectl argo rollouts get rollout frontend

kubectl get virtualservice frontend -o yaml

kubectl argo rollouts dashboard ---> Access Dashboard

kubectl argo rollouts get rollout frontend --watch 

### Trigger Canary rollout or update version of app: 

cd ArgoCD_Flagger_Files && kubectl apply -f argocd_canary_argo_rollouts.yaml 

                   or

Change Image tag in argo_rollouts_services_analysis_canary_deployment.yaml from canary1 to canry2 for frontend service. 








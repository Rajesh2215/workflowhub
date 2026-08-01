#!/usr/bin/env bash
# To set default namespace after first run:
#   kubectl config set-context --current --namespace=workflowhub

set -euo pipefail

NAMESPACE="workflowhub"

echo "Starting Minikube..."
minikube start --cpus=4 --memory=3800
kubectl config use-context minikube

echo "Ensuring namespace exists..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Set default namespace so we don't need -n on every command
kubectl config set-context --current --namespace="${NAMESPACE}"

echo "Building images inside Minikube..."
eval "$(minikube docker-env)"
docker build -f apps/api-gateway/Dockerfile -t api-gateway .
docker build -f apps/auth-service/Dockerfile -t auth-service .
docker build -f apps/task-service/Dockerfile -t task-service .
docker build -f apps/notification-service/Dockerfile -t notification-service .
docker build -f apps/analytics-service/Dockerfile -t analytics-service .

echo "Applying ConfigMaps and Secrets..."
kubectl apply -f k8s/api-gateway/configmap.yml
kubectl apply -f k8s/api-gateway/secret.yml
kubectl apply -f k8s/auth-service/configmap.yml
kubectl apply -f k8s/auth-service/secret.yml
kubectl apply -f k8s/task-service/configmap.yml
kubectl apply -f k8s/task-service/secret.yml
kubectl apply -f k8s/notification-service/configmap.yml
kubectl apply -f k8s/notification-service/secret.yml
kubectl apply -f k8s/analytics-service/configmap.yml
kubectl apply -f k8s/analytics-service/secret.yml

echo "Applying Mongo storage (PV + PVC)..."
kubectl apply -f k8s/mongo-auth/pv.yaml
kubectl apply -f k8s/mongo-task/pv.yaml
kubectl apply -f k8s/mongo-notification/pv.yaml
kubectl apply -f k8s/mongo-analytics/pv.yaml

kubectl apply -f k8s/mongo-auth/pvc.yaml
kubectl apply -f k8s/mongo-task/pvc.yaml
kubectl apply -f k8s/mongo-notification/pvc.yaml
kubectl apply -f k8s/mongo-analytics/pvc.yaml

# ── Step 1: Deploy RabbitMQ and Redis first ──────────────────────────────────
echo "Deploying RabbitMQ and Redis..."
kubectl apply -f k8s/rabbitmq/deployment.yaml
kubectl apply -f k8s/rabbitmq/service.yaml
kubectl apply -f k8s/redis/deployment.yaml
kubectl apply -f k8s/redis/service.yaml

echo "Waiting for RabbitMQ and Redis to be ready..."
kubectl rollout status deployment/rabbitmq
kubectl rollout status deployment/redis

# ── Step 2: Deploy MongoDB instances ────────────────────────────────────────
echo "Deploying MongoDB instances..."
kubectl apply -f k8s/mongo-auth/deployment.yaml
kubectl apply -f k8s/mongo-auth/service.yaml
kubectl apply -f k8s/mongo-task/deployment.yaml
kubectl apply -f k8s/mongo-task/service.yaml
kubectl apply -f k8s/mongo-notification/deployment.yaml
kubectl apply -f k8s/mongo-notification/service.yaml
kubectl apply -f k8s/mongo-analytics/deployment.yaml
kubectl apply -f k8s/mongo-analytics/service.yaml

echo "Waiting for MongoDB instances to be ready..."
kubectl rollout status deployment/mongo-auth
kubectl rollout status deployment/mongo-task
kubectl rollout status deployment/mongo-notification
kubectl rollout status deployment/mongo-analytics

# ── Step 3: Deploy application services ─────────────────────────────────────
echo "Deploying application services..."
kubectl apply -f k8s/api-gateway/deployment.yml
kubectl apply -f k8s/api-gateway/service.yaml
kubectl apply -f k8s/auth-service/deployment.yml
kubectl apply -f k8s/task-service/deployment.yml
kubectl apply -f k8s/notification-service/deployment.yml
kubectl apply -f k8s/analytics-service/deployment.yml
kubectl apply -f k8s/analytics-service/service.yaml

echo "Waiting for application services to be ready..."
kubectl rollout status deployment/api-gateway
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/task-service
kubectl rollout status deployment/notification-service
kubectl rollout status deployment/analytics-service

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next: port-forward the gateway with:"
echo "  kubectl port-forward svc/api-gateway 3000:80"
echo "Then open:"
echo "  http://localhost:3000"

#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
CA_ENV="ai102-ca-env"
FRONTEND_APP="ai102-frontend"
ACR_LOGIN_SERVER=$(cat outputs/acr_login_server.txt 2>/dev/null || echo "ai102acr.azurecr.io")
FRONTEND_IMAGE="${ACR_LOGIN_SERVER}/frontend:latest"
BACKEND_FQDN=$(cat outputs/backend_fqdn.txt 2>/dev/null || echo "backend.azurecontainerapps.io")

echo "====== Deploying Frontend to Container Apps ======"

az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --environment "$CA_ENV" \
  --image "$FRONTEND_IMAGE" \
  --target-port 3000 \
  --ingress external \
  --query properties.configuration.ingress.fqdn -o tsv \
  --env-vars \
    NEXT_PUBLIC_API_BASE_URL="https://${BACKEND_FQDN}/api" \
    NODE_ENV=production \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 2

echo "✓ Frontend app deployed: $FRONTEND_APP"

FRONTEND_FQDN=$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Frontend URL: https://$FRONTEND_FQDN"
echo "$FRONTEND_FQDN" > outputs/frontend_fqdn.txt

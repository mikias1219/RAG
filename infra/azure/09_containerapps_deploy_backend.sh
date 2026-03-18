#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
CA_ENV="ai102-ca-env"
BACKEND_APP="ai102-backend"
ACR_LOGIN_SERVER=$(cat outputs/acr_login_server.txt 2>/dev/null || echo "ai102acr.azurecr.io")
BACKEND_IMAGE="${ACR_LOGIN_SERVER}/backend:latest"
KV_NAME=$(cat outputs/keyvault_name.txt 2>/dev/null || echo "ai102kv123")

echo "====== Deploying Backend to Container Apps ======"

az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --environment "$CA_ENV" \
  --image "$BACKEND_IMAGE" \
  --target-port 8080 \
  --ingress external \
  --query properties.configuration.ingress.fqdn -o tsv \
  --secrets \
    database-url="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/DATABASE-URL/" \
    storage-conn-str="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/AZURE-STORAGE-CONNECTION-STRING/" \
    openai-endpoint="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/AZURE-OPENAI-ENDPOINT/" \
    openai-key="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/AZURE-OPENAI-API-KEY/" \
    aisearch-endpoint="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/AZURE-AI-SEARCH-ENDPOINT/" \
    aisearch-key="keyvaultref|https://${KV_NAME}.vault.azure.net/secrets/AZURE-AI-SEARCH-API-KEY/" \
  --env-vars \
    NODE_ENV=production \
    PORT=8080 \
    LOG_LEVEL=info \
    DATABASE_URL=secretref:database-url \
    AZURE_STORAGE_CONNECTION_STRING=secretref:storage-conn-str \
    AZURE_OPENAI_ENDPOINT=secretref:openai-endpoint \
    AZURE_OPENAI_API_KEY=secretref:openai-key \
    AZURE_AI_SEARCH_ENDPOINT=secretref:aisearch-endpoint \
    AZURE_AI_SEARCH_API_KEY=secretref:aisearch-key \
    CHUNK_SIZE=900 \
    CHUNK_OVERLAP=150 \
    RAG_TOP_K=8 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3

echo "✓ Backend app deployed: $BACKEND_APP"

BACKEND_FQDN=$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "Backend URL: https://$BACKEND_FQDN/api/health"
echo "$BACKEND_FQDN" > outputs/backend_fqdn.txt

#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
ACR_NAME="ai102acr${RANDOM}"

echo "====== Creating Azure Container Registry ======"

az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$REGION" \
  --admin-enabled true

ACR_LOGIN_SERVER=$(az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --query loginServer -o tsv)
echo "✓ ACR created: $ACR_LOGIN_SERVER"

# Output for later use
echo "$ACR_NAME" > outputs/acr_name.txt
echo "$ACR_LOGIN_SERVER" > outputs/acr_login_server.txt

echo "Docker login command:"
echo "az acr login --name $ACR_NAME"

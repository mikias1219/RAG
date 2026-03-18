#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
SEARCH_SERVICE="ai102search${RANDOM}"
INDEX_NAME="doc-chunks"

echo "====== Creating Azure AI Search ======"

az search service create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SEARCH_SERVICE" \
  --location "$REGION" \
  --sku Basic

echo "✓ AI Search service created: $SEARCH_SERVICE"

# Get admin key
ADMIN_KEY=$(az search admin-key show \
  --resource-group "$RESOURCE_GROUP" \
  --service-name "$SEARCH_SERVICE" \
  --query primaryKey -o tsv)

# Get endpoint
ENDPOINT=$(az search service show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$SEARCH_SERVICE" \
  --query endpoint -o tsv)

# Store outputs
echo "$SEARCH_SERVICE" > outputs/aisearch_service.txt
echo "$ENDPOINT" > outputs/aisearch_endpoint.txt
echo "$ADMIN_KEY" > outputs/aisearch_admin_key.txt

echo ""
echo "Update Key Vault with AI Search credentials:"
echo "  az keyvault secret set --vault-name <KV_NAME> --name AZURE-AI-SEARCH-ENDPOINT --value '$ENDPOINT'"
echo "  az keyvault secret set --vault-name <KV_NAME> --name AZURE-AI-SEARCH-API-KEY --value '$ADMIN_KEY'"

echo ""
echo "Note: Vector index must be created via backend ingestion pipeline or Azure Portal."

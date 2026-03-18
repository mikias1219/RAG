#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
KV_NAME="ai102kv${RANDOM}"

echo "====== Creating Azure Key Vault ======"

az keyvault create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$KV_NAME" \
  --location "$REGION" \
  --enable-rbac-authorization false

echo "✓ Key Vault created: $KV_NAME"

# Store KV name for later
echo "$KV_NAME" > outputs/keyvault_name.txt

# TODO: Populate secrets (user must provide values)
echo ""
echo "Next: Set secrets in Key Vault:"
echo "  az keyvault secret set --vault-name $KV_NAME --name DATABASE-URL --value postgresql://..."
echo "  az keyvault secret set --vault-name $KV_NAME --name AZURE-STORAGE-CONNECTION-STRING --value DefaultEndpointsProtocol=..."
echo "  az keyvault secret set --vault-name $KV_NAME --name AZURE-OPENAI-ENDPOINT --value https://..."
echo "  az keyvault secret set --vault-name $KV_NAME --name AZURE-OPENAI-API-KEY --value ..."

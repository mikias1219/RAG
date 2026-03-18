#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
STORAGE_ACCOUNT="ai102sa${RANDOM}"
CONTAINER_NAME="documents"

echo "====== Creating Azure Blob Storage ======"

az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$REGION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

echo "✓ Storage account created: $STORAGE_ACCOUNT"

# Get connection string
CONN_STRING=$(az storage account show-connection-string \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --query connectionString -o tsv)

# Create container
az storage container create \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --public-access off

echo "✓ Container created: $CONTAINER_NAME"

# Store for later
echo "$STORAGE_ACCOUNT" > outputs/storage_account.txt
echo "$CONN_STRING" > outputs/storage_connection_string.txt

echo ""
echo "Update Key Vault with connection string:"
echo "  az keyvault secret set --vault-name <KV_NAME> --name AZURE-STORAGE-CONNECTION-STRING --value '$CONN_STRING'"

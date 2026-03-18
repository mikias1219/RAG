#!/bin/bash
set -e

REGION="${1:-eastus}"
RESOURCE_GROUP="AI102"

echo "====== Creating Resource Group: $RESOURCE_GROUP ======"

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$REGION"

echo "✓ Resource group created: $RESOURCE_GROUP ($REGION)"

# Verify
az group show --name "$RESOURCE_GROUP" -o json | jq '.{id,name,location}'

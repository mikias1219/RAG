#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
REGION="eastus"
CA_ENV="ai102-ca-env"
LOG_ANALYTICS_WS="ai102-logs-${RANDOM}"

echo "====== Setting up Container Apps Environment ======"

# Create Log Analytics workspace
LOG_WS_ID=$(az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --query id -o tsv)

LOG_WS_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --query primarySharedKey -o tsv)

echo "✓ Log Analytics workspace created: $LOG_ANALYTICS_WS"

# Create Container Apps environment
az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CA_ENV" \
  --location "$REGION" \
  --logs-workspace-id "$LOG_WS_ID" \
  --logs-workspace-key "$LOG_WS_KEY"

echo "✓ Container Apps environment created: $CA_ENV"

# Store outputs
echo "$CA_ENV" > outputs/containerapps_env.txt
echo "$LOG_ANALYTICS_WS" > outputs/log_analytics_ws.txt

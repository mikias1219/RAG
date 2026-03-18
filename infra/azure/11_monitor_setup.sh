#!/bin/bash
set -e

RESOURCE_GROUP="AI102"
APP_INSIGHTS_NAME="ai102-insights"

echo "====== Setting up Azure Monitor & Application Insights ======"

# Create Application Insights
az monitor app-insights component create \
  --resource-group "$RESOURCE_GROUP" \
  --app "$APP_INSIGHTS_NAME" \
  --location eastus \
  --kind web \
  --application-type web

echo "✓ Application Insights created: $APP_INSIGHTS_NAME"

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --resource-group "$RESOURCE_GROUP" \
  --app "$APP_INSIGHTS_NAME" \
  --query instrumentationKey -o tsv)

echo "Instrumentation Key: $INSTRUMENTATION_KEY"
echo "$APP_INSIGHTS_NAME" > outputs/app_insights_name.txt
echo "$INSTRUMENTATION_KEY" > outputs/app_insights_key.txt

echo ""
echo "Create alert for high error rate:"
echo "  az monitor metrics alert create \\"
echo "    --name ai102-high-errors \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --scopes /subscriptions/\$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \\"
echo "    --condition 'avg Failed requests > 10' \\"
echo "    --window-size 5m \\"
echo "    --evaluation-frequency 1m"

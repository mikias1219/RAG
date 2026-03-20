targetScope = 'subscription'

@description('Resource group for OKDE platform')
param rgName string = 'rg-okde-prod'

@description('Azure region')
param location string = 'eastus'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
}

output resourceGroupName string = rg.name
output location string = rg.location

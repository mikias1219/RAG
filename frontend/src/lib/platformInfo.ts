export const AZURE_RESOURCE_USAGE: Array<{
  service: string;
  usage: string;
  when: string;
  tier: string;
}> = [
  {
    service: "Azure Blob Storage",
    usage: "Stores uploaded source documents",
    when: "During upload and source access",
    tier: "Standard"
  },
  {
    service: "Azure AI Search",
    usage: "Vector + keyword retrieval over indexed chunks",
    when: "On each chat question",
    tier: "Standard"
  },
  {
    service: "Azure OpenAI",
    usage: "Embeddings and grounded answer generation",
    when: "During indexing and chat response",
    tier: "Managed deployment"
  },
  {
    service: "Azure Document Intelligence",
    usage: "Extracts text from PDF/images",
    when: "During ingestion of non-text files",
    tier: "Standard (when enabled)"
  },
  {
    service: "PostgreSQL",
    usage: "Users, workspaces, documents, chunks, sessions, jobs, workflows, audit",
    when: "Across all operations",
    tier: "Production SKU"
  },
  {
    service: "Azure Container Apps",
    usage: "Backend, worker, and frontend containers",
    when: "Runtime hosting",
    tier: "Consumption"
  }
];

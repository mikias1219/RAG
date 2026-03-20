"use client";

import { AZURE_RESOURCE_USAGE } from "@/lib/platformInfo";

export default function PlatformPage() {
  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Platform &amp; Azure</h2>
        <p className="dash-hero-text">
          OKDE is built for Azure OpenAI, AI Search, Blob Storage, and Document Intelligence—with a portable core
          you can run on any Kubernetes or Container Apps environment.
        </p>
      </div>
      <div className="dash-card">
        <h3 className="dash-card-title">Service map</h3>
        <div className="resource-list dash-resource-grid">
          {AZURE_RESOURCE_USAGE.map((item) => (
            <div key={item.service} className="resource-item dash-resource-card">
              <p className="resource-service">{item.service}</p>
              <p className="resource-usage">{item.usage}</p>
              <p className="resource-when">When: {item.when}</p>
              <p className="resource-tier">Tier: {item.tier}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-card">
        <h3 className="dash-card-title">Collections</h3>
        <p className="panel-subtitle">
          Documents are scoped by tenant and workspace. Folder labels and sharing policies can extend this view.
        </p>
        <p className="muted-text" style={{ marginTop: 12 }}>
          Use <strong>Documents</strong> to upload and <strong>AI Chat</strong> to query indexed content with
          citations.
        </p>
      </div>
    </div>
  );
}

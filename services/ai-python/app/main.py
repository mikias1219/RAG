import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="OKDE AI Service", version="0.1.0")


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=32000)


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    vector: list[float]


def _azure_openai_embed(text: str) -> tuple[list[float], str]:
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    deployment = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    if not endpoint or not api_key:
        raise HTTPException(status_code=503, detail="Azure OpenAI not configured for Python service")
    url = f"{endpoint}/openai/deployments/{deployment}/embeddings?api-version={api_version}"
    payload: dict[str, Any] = {"input": text, "model": deployment}
    with httpx.Client(timeout=60.0) as client:
        r = client.post(url, headers={"api-key": api_key, "Content-Type": "application/json"}, json=payload)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {r.text}")
    data = r.json()
    vec = data["data"][0]["embedding"]
    return vec, deployment


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "okde-ai-python"}


@app.post("/v1/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest) -> EmbedResponse:
    vector, model = _azure_openai_embed(body.text)
    return EmbedResponse(model=model, dimensions=len(vector), vector=vector)


@app.post("/v1/embed/batch")
def embed_batch(texts: list[str]) -> dict[str, Any]:
    if len(texts) > 64:
        raise HTTPException(status_code=400, detail="Max 64 texts per batch")
    vectors: list[list[float]] = []
    model = ""
    for t in texts:
        v, model = _azure_openai_embed(t)
        vectors.append(v)
    return {"model": model, "vectors": vectors, "count": len(vectors)}

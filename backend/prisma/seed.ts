import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const prismaUser = (prisma as PrismaClient & { user: any }).user;

async function main() {
  console.log("Seeding database...");

  // Clean up existing data for idempotency
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prismaUser.deleteMany();

  const tenantId = "t_default";

  // Seed sample documents
  const doc1 = await prisma.document.create({
    data: {
      id: "doc_seed_1",
      tenantId,
      filename: "sample_azure.txt",
      contentType: "text/plain",
      blobUrl: "https://example.blob.core.windows.net/documents/t_default/doc_seed_1/sample_azure.txt",
      sizeBytes: 512
    }
  });

  const doc2 = await prisma.document.create({
    data: {
      id: "doc_seed_2",
      tenantId,
      filename: "sample_openai.txt",
      contentType: "text/plain",
      blobUrl: "https://example.blob.core.windows.net/documents/t_default/doc_seed_2/sample_openai.txt",
      sizeBytes: 1024
    }
  });

  // Seed chunks for doc1
  await prisma.chunk.createMany({
    data: [
      {
        id: "chunk_1_1",
        tenantId,
        documentId: doc1.id,
        chunkIndex: 0,
        text: "Azure Container Apps is a fully managed container orchestration service. It allows you to run containerized microservices and background jobs without managing infrastructure.",
        tokenCountApprox: 28
      },
      {
        id: "chunk_1_2",
        tenantId,
        documentId: doc1.id,
        chunkIndex: 1,
        text: "Container Apps integrates with Dapr for distributed application patterns. It supports auto-scaling, integrated observability, and secure ingress.",
        tokenCountApprox: 22
      }
    ]
  });

  // Seed chunks for doc2
  await prisma.chunk.createMany({
    data: [
      {
        id: "chunk_2_1",
        tenantId,
        documentId: doc2.id,
        chunkIndex: 0,
        text: "Azure OpenAI Service provides REST API access to OpenAI's GPT-4, GPT-35-turbo, and embedding models. It supports chat completions, text completions, embeddings, and fine-tuning.",
        tokenCountApprox: 30
      },
      {
        id: "chunk_2_2",
        tenantId,
        documentId: doc2.id,
        chunkIndex: 1,
        text: "Content filtering and responsible AI practices are built-in. All data is encrypted in transit and at rest within the Azure region.",
        tokenCountApprox: 21
      }
    ]
  });

  await prismaUser.create({
    data: {
      id: "u_superadmin",
      tenantId,
      email: "superadmin@example.com",
      displayName: "Super Admin",
      role: "superadmin",
      status: "approved",
      passwordHash: await bcrypt.hash("SuperAdmin123!", 10)
    }
  });

  const admin = await prismaUser.create({
    data: {
      id: "u_admin",
      tenantId,
      email: "admin@example.com",
      displayName: "Platform Admin",
      role: "admin",
      status: "approved",
      passwordHash: await bcrypt.hash("AdminPass123!", 10)
    }
  });

  const user = await prismaUser.create({
    data: {
      id: "u_default",
      tenantId,
      email: "demo@example.com",
      displayName: "Demo User",
      role: "user",
      status: "approved",
      passwordHash: await bcrypt.hash("DemoPass123!", 10)
    }
  });

  // Seed a chat session
  const session = await prisma.chatSession.create({
    data: {
      tenantId,
      userId: user.id
    }
  });

  // Seed chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        tenantId,
        sessionId: session.id,
        role: "user",
        content: "What is Azure Container Apps?"
      },
      {
        tenantId,
        sessionId: session.id,
        role: "assistant",
        content: "Azure Container Apps is a fully managed container orchestration service that allows you to run containerized microservices without managing infrastructure. It integrates with Dapr for distributed patterns and supports auto-scaling and integrated observability."
      }
    ]
  });

  console.log("Seeding complete!");
  console.log("Sample tenant:", tenantId);
  console.log("Superadmin login:", "superadmin@example.com / SuperAdmin123!");
  console.log("Admin login:", "admin@example.com / AdminPass123!");
  console.log("Demo login:", "demo@example.com / DemoPass123!");
  console.log("Documents:", [doc1.filename, doc2.filename]);
  console.log("Chat session:", session.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

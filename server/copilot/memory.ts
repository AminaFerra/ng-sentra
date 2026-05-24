import { QdrantClient } from "@qdrant/js-client-rest";
import { invokeEmbeddings } from "../_core/llm";
import { ENV } from "../_core/env";
import crypto from "crypto";

// Connect to a local Qdrant instance
const qdrant = new QdrantClient({ url: "http://localhost:6333" });
const COLLECTION_NAME = "soc_memory";

const getVectorSize = () => (ENV.forgeApiKey?.startsWith("AIzaSy") ? 768 : 1536);

export async function initMemory() {
  try {
    const res = await qdrant.getCollections();
    const exists = res.collections.some((c) => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: getVectorSize(),
          distance: "Cosine",
        },
      });
      console.log("[Memory] Initialized Qdrant collection:", COLLECTION_NAME);
    }
  } catch (err: any) {
    console.error("[Memory] Failed to init Qdrant. Is it running on localhost:6333? Error:", err.message);
  }
}

export async function storeMemory(text: string, metadata: Record<string, unknown>) {
  try {
    const [embedding] = await invokeEmbeddings([text]);
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: crypto.randomUUID(),
          vector: embedding,
          payload: {
            text,
            ...metadata,
            timestamp: Date.now(),
          },
        },
      ],
    });
    console.log(`[Memory] Stored new incident memory (Session: ${metadata.sessionId})`);
  } catch (err: any) {
    console.error("[Memory] Store error:", err.message);
  }
}

export async function searchMemory(query: string, limit = 3) {
  try {
    // Ping first to fail fast if Qdrant isn't up
    await qdrant.getCollections();

    const [queryVector] = await invokeEmbeddings([query]);
    const results = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit,
      with_payload: true,
      score_threshold: 0.3, // Return reasonably similar results
    });
    
    return results.map((r) => r.payload);
  } catch (err: any) {
    console.warn("[Memory] Search error (Qdrant might be offline):", err.message);
    return [];
  }
}

import type { Message } from "../_core/llm";
import { streamLLM, invokeLLM } from "../_core/llm";
import { fetchIntelligenceSnapshot, type IntelligenceSnapshot } from "./data-fetcher";
import { buildSystemPrompt, buildSnapshotSummary } from "./prompt-builder";
import { searchMemory, storeMemory } from "./memory";

export interface CopilotStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (snapshot: IntelligenceSnapshot, fullAiResponse: string, memoryCount: number) => void;
  onError: (message: string) => void;
  onStatus: (message: string) => void;
}

/**
 * Main copilot orchestrator.
 */
export async function streamCopilotResponse(
  userMessages: Message[],
  callbacks: CopilotStreamCallbacks,
  metadata?: { sessionId?: string },
  signal?: AbortSignal
): Promise<void> {
  const { onToken, onDone, onError, onStatus } = callbacks;

  onStatus("🔍 Gathering live intelligence from SOC infrastructure…");

  let snapshot: IntelligenceSnapshot;
  try {
    snapshot = await fetchIntelligenceSnapshot();
  } catch (err: any) {
    onError(`Failed to fetch SOC intelligence: ${err?.message ?? err}`);
    return;
  }

  if (signal?.aborted) { onDone(snapshot, "", 0); return; }

  // ─── RAG: Query Long-Term Memory ──────────────────────────────────────────
  onStatus("🧠 Searching historical SOC memory…");
  const lastUserMsg = userMessages[userMessages.length - 1];
  const queryText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : JSON.stringify(lastUserMsg?.content ?? "");
  
  const memories = await searchMemory(queryText, 3);
  let memoryContext = "";
  if (memories.length > 0) {
    memoryContext = "\n\n### RELATED PAST INCIDENTS / MEMORY ###\n" + 
      memories.map((m: any, i: number) => `[Memory ${i+1}] (from ${new Date(m.timestamp || Date.now()).toLocaleString()})\n${m.text}`).join("\n\n") +
      "\n\nReview the above historical memory. Always compare the live data with past memory to identify recurring threats. Answer the user's question, and explicitly mention if you found similar past patterns.";
  }

  onStatus("🧠 Synthesizing threat intelligence with AI…");

  const systemPrompt = buildSystemPrompt(snapshot) + memoryContext;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...userMessages,
  ];

  let fullAiResponse = "";
  let streamingWorked = false;

  await streamLLM({
    messages,
    maxTokens: 4096,
    signal,
    onToken: (chunk) => {
      streamingWorked = true;
      fullAiResponse += chunk;
      onToken(chunk);
    },
    onDone: () => {
      onDone(snapshot, fullAiResponse, memories.length);
      // Asynchronously store this investigation step into long-term memory
      if (metadata?.sessionId && fullAiResponse.length > 50) {
        storeMemory(`User Asked: ${queryText}\n\nAI Analysis:\n${fullAiResponse}`, { sessionId: metadata.sessionId })
          .catch(err => console.error("Async memory store failed:", err));
      }
    },
    onError: async (err) => {
      if (!streamingWorked) {
        console.warn("[Copilot] Streaming failed, falling back to blocking invokeLLM:", err.message);
        try {
          const result = await invokeLLM({ messages, maxTokens: 4096 });
          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            fullAiResponse = content;
            onToken(content);
            onDone(snapshot, fullAiResponse, memories.length);
            if (metadata?.sessionId && fullAiResponse.length > 50) {
              storeMemory(`User Asked: ${queryText}\n\nAI Analysis:\n${fullAiResponse}`, { sessionId: metadata.sessionId })
                .catch(e => console.error("Async memory store failed:", e));
            }
          } else {
            onError("LLM returned no content in fallback mode.");
          }
        } catch (fallbackErr: any) {
          onError(`AI analysis failed: ${fallbackErr?.message ?? fallbackErr}`);
        }
      } else {
        onError(`Stream interrupted: ${err.message}`);
      }
    },
  });
}

export { buildSnapshotSummary };

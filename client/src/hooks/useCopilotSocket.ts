import { useCallback, useEffect, useRef, useState } from "react";

export type CopilotRole = "user" | "assistant";

export interface CopilotMessage {
  role: CopilotRole;
  content: string;
  /** Streaming: true while this assistant message is still being written */
  streaming?: boolean;
}

export interface SourceData {
  fetchedAt: string;
  containerCount: number;
  stoppedContainers: string[];
  alertCount: number;
  criticalAlerts: number;
  failedServices: string[];
  sshAvailable: boolean;
  wazuhAvailable: boolean;
  dataErrors: string[];
  memoryCount?: number;
}

export type CopilotStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "thinking"
  | "streaming"
  | "error"
  | "disconnected";

interface UseCopilotSocketReturn {
  messages: CopilotMessage[];
  status: CopilotStatus;
  statusMessage: string;
  lastSources: SourceData | null;
  isStreaming: boolean;
  isConnected: boolean;
  sendMessage: (content: string) => void;
  cancelStream: () => void;
  clearMessages: () => void;
  resetSession: () => void;
  loadSession: (sessionId: string, messages: CopilotMessage[]) => void;
  sessionId: string;
}

const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/copilot`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Generate a random session ID
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

export function useCopilotSocket(
  initialSessionId?: string,
  initialMessages?: CopilotMessage[]
): UseCopilotSocketReturn {
  const [sessionId, setSessionId] = useState(initialSessionId || generateSessionId());
  const [messages, setMessages] = useState<CopilotMessage[]>(initialMessages || []);
  const [status, setStatus] = useState<CopilotStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastSources, setLastSources] = useState<SourceData | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreaming = status === "streaming" || status === "thinking";
  const isConnected = status === "connected" || status === "thinking" || status === "streaming";

  // Connect to the WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setStatus("connected");
      setStatusMessage("");
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case "connected":
          setStatus("connected");
          break;

        case "pong":
          break;

        case "thinking":
        case "status":
          setStatus("thinking");
          setStatusMessage(msg.message ?? "Thinking…");
          break;

        case "token":
          setStatus("streaming");
          setStatusMessage("");
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              // Append token to the in-progress assistant message
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + msg.data },
              ];
            }
            // Start a new streaming assistant message
            return [...prev, { role: "assistant", content: msg.data, streaming: true }];
          });
          break;

        case "done":
          setStatus("connected");
          setStatusMessage("");
          // Mark the last message as no longer streaming
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
          break;

        case "sources":
          setLastSources(msg.data as SourceData);
          break;

        case "cancelled":
          setStatus("connected");
          setStatusMessage("");
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + "\n\n*[Response cancelled]*", streaming: false },
              ];
            }
            return prev;
          });
          break;

        case "error":
          setStatus(msg.code === "FORBIDDEN" ? "error" : "connected");
          setStatusMessage(msg.message ?? "An error occurred.");
          // Show error inline if mid-stream
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [
                ...prev.slice(0, -1),
                { role: "assistant", content: `⚠️ **Error**: ${msg.message}`, streaming: false },
              ];
            }
            if (msg.code !== "FORBIDDEN") {
              return [...prev, { role: "assistant", content: `⚠️ **Error**: ${msg.message}`, streaming: false }];
            }
            return prev;
          });
          break;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setStatus("error");
        setStatusMessage("Connection lost. Please refresh the page.");
      }
    };

    ws.onerror = () => {
      // onclose fires right after onerror, so we handle reconnect there
    };
  }, []);

  // Establish connection on mount
  useEffect(() => {
    connect();
    // Heartbeat ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Optimistically add the user message to the local list
      const newMessages: CopilotMessage[] = [
        ...messages,
        { role: "user", content: content.trim() },
      ];
      setMessages(newMessages);
      setLastSources(null);

      // Send all messages (conversation history) to the server
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          sessionId, // Include session ID
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        })
      );
    },
    [messages, sessionId]
  );

  const cancelStream = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastSources(null);
    setStatusMessage("");
  }, []);

  const resetSession = useCallback(() => {
    clearMessages();
    setSessionId(generateSessionId());
    setStatus("connected");
  }, [clearMessages]);

  const loadSession = useCallback((newSessionId: string, historicalMessages: CopilotMessage[]) => {
    setSessionId(newSessionId);
    setMessages(historicalMessages);
    setLastSources(null);
    setStatusMessage("");
    setStatus("connected");
  }, []);

  return {
    messages,
    status,
    statusMessage,
    lastSources,
    isStreaming,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
    resetSession,
    loadSession,
    sessionId,
  };
}

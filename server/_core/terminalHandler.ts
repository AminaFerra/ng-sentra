import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Client } from "ssh2";
import { getSSHConfig } from "../ssh-service";

export function setupTerminalHandler(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/api/terminal")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    let sshClient: Client | null = null;
    let stream: any = null;

    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "init") {
          const sshConfig = await getSSHConfig();
          if (!sshConfig) {
            ws.send(JSON.stringify({ type: "error", message: "SSH credentials not configured." }));
            return;
          }

          sshClient = new Client();

          sshClient.on("ready", async () => {
            ws.send(JSON.stringify({ type: "ready" }));

            try {
              const { getComponentBySlug } = await import("../db");
              const component = await getComponentBySlug(data.componentSlug);
              
              if (component?.customCommand) {
                // Execute custom docker/ssh command configured in DB
                sshClient!.exec(component.customCommand, { pty: true }, (err, s) => {
                  if (err) {
                    ws.send(JSON.stringify({ type: "error", message: "Failed to execute custom command" }));
                    return;
                  }
                  stream = s;
                  handleStream(stream, ws);
                });
                return;
              }
            } catch (error) {
              console.error("Error fetching component for custom command:", error);
            }

            // Normal shell fallback
            sshClient!.shell({ term: 'xterm-256color' }, (err, s) => {
              if (err) {
                ws.send(JSON.stringify({ type: "error", message: "Failed to start shell" }));
                return;
              }
              stream = s;
              handleStream(stream, ws);
            });
          });

          sshClient.on("error", (err) => {
            console.error("SSH Client Error:", err);
            ws.send(JSON.stringify({ type: "error", message: "SSH Connection Error" }));
          });

          sshClient.on("close", () => {
            ws.send(JSON.stringify({ type: "closed" }));
            ws.close();
          });

          sshClient.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
            finish([sshConfig.password]);
          });

          sshClient.connect({
            host: sshConfig.host,
            port: sshConfig.port,
            username: sshConfig.user,
            password: sshConfig.password,
            tryKeyboard: true,
            readyTimeout: 30000,
          });

        } else if (data.type === "input" && stream) {
          stream.write(data.data);
        } else if (data.type === "resize" && stream) {
          if (typeof stream.setWindow === 'function') {
            stream.setWindow(data.rows, data.cols, 480, 640);
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (stream) {
        stream.end();
      }
      if (sshClient) {
        sshClient.end();
      }
    });
  });
}

function handleStream(stream: any, ws: WebSocket) {
  stream.on("data", (d: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "data", data: d.toString('utf-8') }));
    }
  });

  stream.on("close", () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "closed" }));
      ws.close();
    }
  });
}

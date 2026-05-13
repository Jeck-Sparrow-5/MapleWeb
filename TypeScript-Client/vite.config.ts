import { defineConfig, Plugin } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";

function tcpProxyPlugin(): Plugin {
  return {
    name: "tcp-proxy",
    configureServer() {
      const WS_PORT = parseInt(process.env.WS_PORT || "8089");
      const TCP_HOST = process.env.TCP_HOST || "127.0.0.1";
      const TCP_PORT = parseInt(process.env.TCP_PORT || "8484");

      const wss = new WebSocketServer({ host: "127.0.0.1", port: WS_PORT });

      wss.on("connection", (ws, req) => {
        const url = new URL(req.url ?? "/", `http://127.0.0.1`);
        const tcpPort = parseInt(url.searchParams.get("port") ?? String(TCP_PORT));
        const tcp = net.createConnection({ host: TCP_HOST, port: tcpPort });

        tcp.on("connect", () => {
          console.log(`[proxy] TCP connected to ${TCP_HOST}:${tcpPort}`);
        });

        tcp.on("data", (data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });
        tcp.on("close", () => ws.close());
        tcp.on("error", (err) => {
          console.error("[proxy] TCP error:", err.message);
          ws.close();
        });

        ws.on("message", (data) => {
          if (tcp.writable) tcp.write(data as Buffer);
        });
        ws.on("close", () => tcp.destroy());
        ws.on("error", (err) => {
          console.error("[proxy] WS error:", err.message);
          tcp.destroy();
        });
      });

      wss.on("listening", () => {
        console.log(`[proxy] ws://127.0.0.1:${WS_PORT} -> tcp://${TCP_HOST}:${TCP_PORT}`);
      });

      wss.on("error", (err) => {
        console.error("[proxy] Server error:", err.message);
      });
    },
  };
}

export default defineConfig({
  clearScreen: false,
  plugins: [tcpProxyPlugin()],
});

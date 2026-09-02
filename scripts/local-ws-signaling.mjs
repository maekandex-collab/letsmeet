/**
 * Local WebSocket room relay for LetsMeet call/chat signaling.
 * Use when mtn.lenhub.net blocks WSS upgrades (HTTP 403).
 *
 * Paths match production: /ws/call/{roomId}/ and /ws/chat/{roomId}/
 * Broadcasts each message to other sockets in the same room path.
 *
 *   node scripts/local-ws-signaling.mjs
 *   # then set NEXT_PUBLIC_LETSMEET_WS_BASE_URL=ws://127.0.0.1:3001
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.LETSMEET_LOCAL_WS_PORT || 3001);
const rooms = new Map();

function roomKey(urlPath) {
  const path = (urlPath || "/").split("?")[0];
  return path.endsWith("/") ? path : `${path}/`;
}

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("LetsMeet local WS signaling OK\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const key = roomKey(req.url || "/");
  if (!rooms.has(key)) rooms.set(key, new Set());
  const peers = rooms.get(key);
  peers.add(ws);

  console.log(`[ws] join ${key} (peers=${peers.size})`);

  ws.on("message", (raw) => {
    const text = typeof raw === "string" ? raw : raw.toString();
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === 1) peer.send(text);
    }
  });

  ws.on("close", () => {
    peers.delete(ws);
    if (peers.size === 0) rooms.delete(key);
    console.log(`[ws] leave ${key} (peers=${peers.size})`);
  });

  ws.on("error", () => {
    peers.delete(ws);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`LetsMeet local signaling: ws://127.0.0.1:${PORT}/ws/call/{roomId}/`);
  console.log(`                         ws://127.0.0.1:${PORT}/ws/chat/{roomId}/`);
});

// Real-time collaboration backend (PRD Phase 3) — WebSocket shared sessions.
// One session = one shared workspace state (last-write-wins broadcast).
// Run: node server/collab-server.mjs  (or: pnpm collab)
import http from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.COLLAB_PORT || 8787);

// sessionId → { clients: Set<ws>, state: workspace snapshot | null }
const sessions = new Map();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, sessions: sessions.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

function broadcastPeers(session) {
  const msg = JSON.stringify({ type: "peers", count: session.clients.size });
  session.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

wss.on("connection", (ws) => {
  let session = null;
  let sessionId = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // malformed frames are ignored
    }

    if (msg.type === "join" && typeof msg.sessionId === "string") {
      sessionId = msg.sessionId;
      session = sessions.get(sessionId);
      if (!session) {
        session = { clients: new Set(), state: null };
        sessions.set(sessionId, session);
      }
      session.clients.add(ws);
      // First joiner seeds the session state; later joiners receive it
      if (msg.state && !session.state) {
        session.state = msg.state;
      }
      ws.send(JSON.stringify({ type: "init", state: session.state }));
      broadcastPeers(session);
      return;
    }

    if (msg.type === "update" && session && msg.state) {
      session.state = msg.state;
      session.clients.forEach((c) => {
        if (c !== ws && c.readyState === 1) {
          c.send(JSON.stringify({ type: "update", state: msg.state }));
        }
      });
    }
  });

  ws.on("close", () => {
    if (!session) return;
    session.clients.delete(ws);
    if (session.clients.size === 0) {
      sessions.delete(sessionId); // drop empty sessions (state lives in clients' localStorage)
    } else {
      broadcastPeers(session);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[collab] WebSocket collaboration server listening on :${PORT}`);
});

// Real-time collaboration client (PRD Phase 3) — connects to the collab
// server through the Vite ws proxy (/collab → ws://localhost:8787).
export function createCollabSession({ sessionId, initialState, onInit, onUpdate, onPeers, onError, onClose }) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${window.location.host}/collab`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join", sessionId, state: initialState }));
  };

  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === "init" && onInit) onInit(msg.state);
    else if (msg.type === "update" && onUpdate) onUpdate(msg.state);
    else if (msg.type === "peers" && onPeers) onPeers(msg.count);
  };

  ws.onerror = () => {
    if (onError) onError();
  };

  ws.onclose = () => {
    if (onClose) onClose();
  };

  return {
    send(state) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "update", state }));
      }
    },
    close() {
      ws.close();
    }
  };
}

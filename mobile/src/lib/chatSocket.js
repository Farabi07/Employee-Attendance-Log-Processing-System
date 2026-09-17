// WebSocket client for chat/consumers.py::ChatConsumer. One socket per
// logged-in user, carrying every channel/DM event they're a member of —
// see the backend's chat app for the event shapes this listens for
// (message.new, channel.created, channel.member_added, channel.member_removed).
//
// Auth is the access token as a query param (?token=...), not a header —
// neither the browser nor React Native's WebSocket constructor can attach
// an Authorization header to the handshake request. The server accepts the
// handshake either way and sends an in-band {type: "auth_error"} message if
// the token is missing/invalid, rather than relying on a WS close code —
// some hosting setups (confirmed behind Render/Cloudflare in production)
// deliver ordinary message frames fine but silently drop the close frame
// itself, so a close-code check alone would never fire there. See
// chat/consumers.py's connect() on the backend branch.
import { AppState } from "react-native";
import { getToken, BASE_URL, triggerUnauthorized } from "./api";

const listeners = new Map();
let socket = null;
let manualClose = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
let appStateSub = null;
let heartbeatTimer = null;

function wsUrl(token) {
  return `${BASE_URL.replace(/^http/, "ws")}/ws/chat/?token=${encodeURIComponent(token)}`;
}

function emit(type, data) {
  listeners.get(type)?.forEach((handler) => handler(data));
}

// Subscribe to one event type (e.g. "message.new"). Returns an unsubscribe
// function, same convention as a useEffect cleanup.
export function on(type, handler) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(handler);
  return () => listeners.get(type)?.delete(handler);
}

function scheduleReconnect() {
  if (reconnectTimer || manualClose) return;
  const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, delay);
}

async function open() {
  // Re-read the token on every (re)connect attempt rather than caching it —
  // a token rotated or cleared by logout since the last attempt must be
  // picked up immediately, not stale.
  const token = await getToken();
  if (!token || manualClose) return;

  const ws = new WebSocket(wsUrl(token));
  socket = ws;
  let authFailed = false;

  ws.onopen = () => {
    reconnectAttempt = 0;
    heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "presence.heartbeat" }));
    }, 60000);
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return; // malformed frame — ignore rather than crash the listener loop
    }
    if (data?.type === "auth_error") {
      // Bad/expired token — retrying would just loop forever. Route
      // through the same handler a 401 triggers elsewhere in the app, and
      // close the socket ourselves rather than waiting on a close frame
      // from the server that may never arrive (see module comment above).
      authFailed = true;
      triggerUnauthorized();
      ws.close();
      return;
    }
    if (data?.type) emit(data.type, data);
  };

  ws.onclose = (event) => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (socket === ws) socket = null;
    if (manualClose || authFailed) return;
    if (event.code === 4001) {
      triggerUnauthorized();
      return;
    }
    scheduleReconnect();
  };
}

// Call once (e.g. from ChatListScreen's mount) to open the socket and start
// reconnecting on drops/app-foreground; connect()/disconnect() are safe to
// call repeatedly — both no-op if already in the desired state.
export function connect() {
  manualClose = false;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  open();

  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      reconnectAttempt = 0;
      if (!socket || socket.readyState === WebSocket.CLOSED) open();
    });
  }
}

export function disconnect() {
  manualClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  appStateSub?.remove();
  appStateSub = null;
  socket?.close();
  socket = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

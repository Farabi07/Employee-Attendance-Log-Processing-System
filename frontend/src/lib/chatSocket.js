// Browser counterpart to mobile/src/lib/chatSocket.js — same protocol
// (chat/consumers.py::ChatConsumer on the backend branch), same
// query-string token auth (a WebSocket handshake can't carry an
// Authorization header). Auth failure arrives as an in-band
// {type: "auth_error"} message rather than a WS close code — confirmed in
// production (behind Render/Cloudflare) that ordinary message frames
// arrive fine but the close frame itself is silently dropped, so a
// close-code check alone would never fire there. Reconnects on window
// 'online' instead of React Native's AppState — the web equivalent of
// "we're back, try again now" (the same browser event
// lib/useOnlineStatus.js's hook listens to, just read directly here since
// this is a plain module, not a component).
import { getToken, BASE_URL, triggerUnauthorized } from "./api";

const listeners = new Map();
let socket = null;
let manualClose = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
let onlineListenerAdded = false;
let heartbeatTimer = null;

function wsUrl(token) {
  return `${BASE_URL.replace(/^http/, "ws")}/ws/chat/?token=${encodeURIComponent(token)}`;
}

function emit(type, data) {
  listeners.get(type)?.forEach((handler) => handler(data));
}

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

function open() {
  const token = getToken();
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
      return;
    }
    if (data?.type === "auth_error") {
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

export function connect() {
  manualClose = false;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  open();

  if (!onlineListenerAdded) {
    window.addEventListener("online", () => {
      reconnectAttempt = 0;
      if (!socket || socket.readyState === WebSocket.CLOSED) open();
    });
    onlineListenerAdded = true;
  }
}

export function disconnect() {
  manualClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

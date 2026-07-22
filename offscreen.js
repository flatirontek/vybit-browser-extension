/**
 * Vybit Chrome Extension — Offscreen Document
 *
 * Maintains Socket.io connection to Vybit server.
 * Plays notification sounds and relays notification data to service worker.
 */

let socket = null;
let currentToken = null;

function sendMessage(type, data) {
  chrome.runtime.sendMessage(data ? { type, ...data } : { type });
}

function connect(token) {
  // The service worker can send CONNECT more than once (fullInitialize and
  // the OFFSCREEN_READY handshake both trigger it). If we're already
  // connected with this token, tearing down a healthy socket just to rebuild
  // it leaves the status stuck on 'connecting' — report connected instead.
  if (socket && socket.connected && token === currentToken) {
    sendMessage('STATUS_UPDATE', { state: 'connected' });
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  sendMessage('STATUS_UPDATE', { state: 'connecting' });

  socket = io(VYBIT_APP_URL, {
    // Without forceNew, socket.io reuses a cached manager for the same URL
    // and ignores the transportOptions below, so a new token would silently
    // keep authenticating with the old one.
    forceNew: true,
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY_MIN,
    reconnectionDelayMax: RECONNECT_DELAY_MAX,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    transportOptions: {
      polling: { extraHeaders: { 'Authorization': token } }
    }
  });

  socket.on('connect', () => sendMessage('STATUS_UPDATE', { state: 'connected' }));
  socket.on('disconnect', (reason) => {
    sendMessage('STATUS_UPDATE', { state: 'disconnected' });
    if (reason === 'io server disconnect') {
      setTimeout(() => { if (socket) socket.connect(); }, RECONNECT_DELAY_MIN);
    }
  });
  socket.on('connect_error', () => sendMessage('STATUS_UPDATE', { state: 'error' }));
  socket.on('reconnect', () => sendMessage('STATUS_UPDATE', { state: 'connected' }));
  socket.on('reconnect_failed', () => sendMessage('STATUS_UPDATE', { state: 'error' }));

  socket.on('vybSignal', async (data) => {
    await SoundPlayer.play(data);
    sendMessage('NOTIFICATION', {
      data: {
        vybKey: data.vybKey,
        vybName: data.vybName,
        title: data.title || data.vybName,
        vybDescription: data.vybDescription,
        notification: data.notification,
        imageUrl: data.imageUrl || null,
        linkUrl: data.linkUrl || null,
        soundKey: data.soundKey,
        soundType: data.soundType,
        ownerName: data.ownerName
      }
    });
  });
}

// Network recovery
window.addEventListener('online', () => {
  if (socket && !socket.connected) socket.connect();
});

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONNECT') connect(message.token);
  else if (message.type === 'DISCONNECT') {
    if (socket) { socket.disconnect(); socket = null; }
    currentToken = null;
  }
});

// Heartbeat keeps service worker alive
setInterval(() => sendMessage('HEARTBEAT'), HEARTBEAT_INTERVAL);

// Request token from service worker
sendMessage('OFFSCREEN_READY');

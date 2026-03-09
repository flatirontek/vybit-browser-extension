/**
 * Vybit Chrome Extension — Offscreen Document
 *
 * Maintains Socket.io connection to Vybit server.
 * Plays notification sounds and relays notification data to service worker.
 */

let socket = null;

function sendMessage(type, data) {
  chrome.runtime.sendMessage(data ? { type, ...data } : { type });
}

function connect(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  sendMessage('STATUS_UPDATE', { state: 'connecting' });

  socket = io(VYBIT_APP_URL, {
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
  }
});

// Heartbeat keeps service worker alive
setInterval(() => sendMessage('HEARTBEAT'), HEARTBEAT_INTERVAL);

// Request token from service worker
sendMessage('OFFSCREEN_READY');

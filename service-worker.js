/**
 * Vybit Chrome Extension — Service Worker
 *
 * Manages extension lifecycle, offscreen document, notifications, and badge state.
 */

importScripts('lib/constants.js', 'lib/auth.js');

let connectionState = 'unknown';

const BADGE_STATES = {
  connected:       ['', '#4CAF50'],
  connecting:      ['...', '#FFC107'],
  disconnected:    ['!', '#FFC107'],
  error:           ['!', '#F44336'],
  unauthenticated: ['', '#9E9E9E']
};

function updateBadge(state) {
  const [text, color] = BADGE_STATES[state] || BADGE_STATES.unauthenticated;
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// --- Offscreen Document ---

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) return;

  const token = await getToken();
  if (!token) {
    updateBadge('unauthenticated');
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK', 'BLOBS'],
    justification: 'Real-time WebSocket notifications and custom sound playback'
  });
}

async function destroyOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// --- Initialization ---

async function fullInitialize() {
  const token = await getToken();
  if (!token) {
    updateBadge('unauthenticated');
    return;
  }

  if (!await validateToken(token)) {
    await clearToken();
    updateBadge('unauthenticated');
    return;
  }

  await ensureOffscreen();
  chrome.alarms.create('health-check', { periodInMinutes: 1 });
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(() => fullInitialize());
chrome.runtime.onStartup.addListener(() => fullInitialize());
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'health-check') ensureOffscreen();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'HEARTBEAT':
      break;

    case 'OFFSCREEN_READY':
      (async () => {
        const token = await getToken();
        if (token) chrome.runtime.sendMessage({ type: 'CONNECT', token });
      })();
      break;

    case 'STATUS_UPDATE':
      connectionState = message.state;
      updateBadge(message.state);
      break;

    case 'NOTIFICATION': {
      const data = message.data;
      chrome.notifications.create({
        type: 'basic',
        iconUrl: (data.imageUrl && data.imageUrl.startsWith('http'))
          ? data.imageUrl
          : chrome.runtime.getURL('icons/icon-128.png'),
        title: data.title || data.vybName || 'Vybit',
        message: data.notification || data.vybDescription || 'New notification',
        silent: true
      }, (id) => {
        if (chrome.runtime.lastError) return;
        if (data.vybKey) {
          chrome.storage.session.set({
            ['notif_' + id]: { vybKey: data.vybKey, linkUrl: data.linkUrl }
          });
        }
      });
      break;
    }

    case 'GET_STATE':
      (async () => {
        sendResponse({
          connectionState,
          authenticated: !!(await getToken())
        });
      })();
      return true;

    case 'AUTH_SUCCESS':
      (async () => {
        await fullInitialize();
        sendResponse({ ok: true });
      })();
      return true;

    case 'LOGOUT':
      (async () => {
        connectionState = 'disconnected';
        updateBadge('unauthenticated');
        chrome.alarms.clear('health-check');
        await destroyOffscreen();
        await clearToken();
        sendResponse({ ok: true });
      })();
      return true;
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const key = 'notif_' + notificationId;
  const result = await chrome.storage.session.get(key);
  const info = result[key];

  const url = (info && info.linkUrl) ? info.linkUrl : VYBIT_APP_URL;
  const tabs = await chrome.tabs.query({ url: VYBIT_APP_URL + '/*' });

  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true, url });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }

  chrome.notifications.clear(notificationId);
  chrome.storage.session.remove(key);
});

// On every wake-up: ensure offscreen doc exists
ensureOffscreen();

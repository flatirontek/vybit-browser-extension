/**
 * Vybit Chrome Extension — Popup
 */

const stateElements = {};
document.querySelectorAll('.state').forEach(el => {
  stateElements[el.id.replace('state-', '')] = el;
});

function showState(name) {
  Object.values(stateElements).forEach(el => el.classList.add('hidden'));
  if (stateElements[name]) stateElements[name].classList.remove('hidden');
}

function showConnectionState(state) {
  showState(stateElements[state] ? state : 'connected');
}

async function updateUI() {
  const token = await getToken();
  if (!token) { showState('unauth'); return; }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    showConnectionState(response?.connectionState);
  } catch {
    showState('connecting');
  }
}

async function handleSignIn() {
  try {
    showState('connecting');
    const response = await chrome.runtime.sendMessage({ type: 'START_AUTH' });
    if (response?.ok) {
      showState('connected');
    } else {
      console.error('Auth error:', response?.error);
      showState('unauth');
    }
  } catch (e) {
    console.error('Auth error:', e);
    showState('unauth');
  }
}

async function handleDisconnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  } catch {
    await clearToken();
  }
  showState('unauth');
}

async function handleRetry() {
  if (await getToken()) {
    showState('connecting');
    await chrome.runtime.sendMessage({ type: 'REINITIALIZE' });
    // Fallback in case reinit clears the token without a STATUS_UPDATE
    setTimeout(updateUI, 2000);
  } else {
    showState('unauth');
  }
}

// Live-update while the popup is open: the offscreen document and service
// worker broadcast STATUS_UPDATE whenever the connection state changes.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATUS_UPDATE') {
    getToken().then(token => {
      if (token) showConnectionState(message.state);
    });
  }
});

document.getElementById('btn-signin').addEventListener('click', handleSignIn);
document.getElementById('btn-disconnect').addEventListener('click', handleDisconnect);
document.getElementById('btn-retry').addEventListener('click', handleRetry);

updateUI();

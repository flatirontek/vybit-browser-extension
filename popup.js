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

const STATE_MAP = {
  connected: 'connected',
  connecting: 'connecting',
  disconnected: 'disconnected',
  error: 'error'
};

async function updateUI() {
  const token = await getToken();
  if (!token) { showState('unauth'); return; }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    showState(STATE_MAP[response?.connectionState] || 'connected');
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
    await chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });
    setTimeout(updateUI, 2000);
  } else {
    showState('unauth');
  }
}

document.getElementById('btn-signin').addEventListener('click', handleSignIn);
document.getElementById('btn-disconnect').addEventListener('click', handleDisconnect);
document.getElementById('btn-retry').addEventListener('click', handleRetry);
document.getElementById('btn-reauth').addEventListener('click', handleSignIn);

updateUI();

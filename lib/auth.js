/**
 * Vybit Chrome Extension — Token Storage & Validation
 */

async function getToken() {
  const result = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return result[STORAGE_KEY_TOKEN] || null;
}

async function setToken(token) {
  await chrome.storage.local.set({
    [STORAGE_KEY_TOKEN]: token,
    [STORAGE_KEY_AUTHENTICATED_AT]: Date.now()
  });
}

async function clearToken() {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_AUTHENTICATED_AT]);
}

// Returns 'valid', 'invalid' (server rejected the token), or 'unreachable'
// (network error or transient server failure — token may still be good).
async function validateToken(token) {
  try {
    const response = await fetch(TOKEN_VALIDATE_ENDPOINT, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (response.ok) return 'valid';
    if (response.status === 401 || response.status === 403) return 'invalid';
    return 'unreachable';
  } catch (e) {
    return 'unreachable';
  }
}

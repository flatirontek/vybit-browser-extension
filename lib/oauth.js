/**
 * Vybit Chrome Extension — OAuth2 PKCE Flow
 */

function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').slice(0, length);
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

async function exchangeCodeForToken(code, codeVerifier) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error('Token exchange failed: ' + response.status + ' ' + text);
  }

  return response.json();
}

async function launchAuthFlow() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);

  await chrome.storage.session.set({ codeVerifier, state });

  const authUrl = new URL(VYBIT_APP_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', chrome.identity.getRedirectURL());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  const url = new URL(responseUrl);
  const error = url.searchParams.get('error');
  if (error) throw new Error('Authorization denied: ' + error);

  if (url.searchParams.get('state') !== state) {
    throw new Error('State mismatch — possible CSRF attack');
  }

  const code = url.searchParams.get('code');
  if (!code) throw new Error('No authorization code received');

  const tokenData = await exchangeCodeForToken(code, codeVerifier);
  await chrome.storage.session.remove(['codeVerifier', 'state']);
  return tokenData;
}

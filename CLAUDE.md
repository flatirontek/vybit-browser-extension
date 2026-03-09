# Vybit Chrome Extension

## Project Overview

Chrome Manifest V3 extension for receiving Vybit notifications with custom sound playback. No build step — plain JS with vendored dependencies.

## Architecture

- **Service Worker** (`service-worker.js`): Extension lifecycle, offscreen doc management, chrome.notifications, badge state
- **Offscreen Document** (`offscreen.html` + `offscreen.js`): Socket.io connection, audio playback
- **Popup** (`popup.html` + `popup.js` + `popup.css`): Auth UI, connection status
- **lib/**: Shared modules loaded via `<script>` or `importScripts`

## Key Technical Details

- **Realtime**: Socket.io 2.x (vendored `vendor/socket.io-2.5.0.min.js`), matching server v2.4.1
- **Auth**: OAuth2 Authorization Code + PKCE via `chrome.identity.launchWebAuthFlow()`
- **Socket.io auth**: JWT token in `transportOptions.polling.extraHeaders.Authorization` (no "Bearer" prefix)
- **Notification event**: `vybSignal` — vybKey, vybName, soundKey, soundType, notification, imageUrl, linkUrl, etc.
- **Sound URLs**: `https://vybit.net/sounds/{soundKey}.{soundType}` (or `proxyUrl` if present)
- **Token**: Non-expiring JWT stored in `chrome.storage.local`

## MV3 Gotchas (learned the hard way)

- **Offscreen docs can't use `chrome.storage`** — must receive data via messaging
- **`AUDIO_PLAYBACK` reason has 30s timeout** when no audio plays — add `BLOBS` reason for unbounded lifetime
- **Service worker `setInterval` dies** on worker termination — use `chrome.alarms` for periodic tasks
- **Socket.io polling uses XHR** which needs CORS — add `host_permissions` for the server domain
- **Browser WebSocket API can't set custom headers** — must use polling transport (not `transports: ['websocket']`)
- **Notification `iconUrl`** must use `chrome.runtime.getURL()` for extension-local paths

## Server Endpoints

- OAuth authorize: `GET https://app.vybit.net?client_id=...&response_type=code&...`
- Token exchange: `POST https://app.vybit.net/service/token`
- Token validate: `GET https://app.vybit.net/service/test` (Bearer header)
- Socket.io: `https://app.vybit.net` (Socket.io 2.x, polling transport)
- Sounds: `https://vybit.net/sounds/{key}.{type}`

## File Structure

```
manifest.json           — MV3 manifest (alarms, identity, notifications, offscreen, storage + host_permissions)
service-worker.js       — Lifecycle, offscreen management, notifications, badge
offscreen.html/js       — Socket.io connection + sound playback
popup.html/js/css       — Auth UI with state management
lib/constants.js        — URLs, timing, config
lib/auth.js             — Token CRUD & validation
lib/oauth.js            — PKCE flow
lib/sound.js            — Audio playback with LRU cache
vendor/                 — socket.io-2.5.0.min.js
icons/                  — 16, 48, 128px PNGs
```

## Development

1. Load as unpacked extension at `chrome://extensions`
2. Extension ID: `gnkkpkideibjbkfkkgambgbolnebcpin`
3. OAuth client_id: `b2namn3a5ye38bwy`
4. Redirect URI: `https://gnkkpkideibjbkfkkgambgbolnebcpin.chromiumapp.org/`

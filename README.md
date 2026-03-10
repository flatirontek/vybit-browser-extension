# Vybit Browser Extension

Receive [Vybit](https://vybit.net) notification sounds on your desktop — no browser tab required.

## What It Does

When a vybit is triggered, this extension plays your personalized notification sound and shows a desktop notification, even with no Vybit tab open. It works as long as your browser is running.

## Install

### Chrome Web Store

*Coming soon*

### Manual Install (Developer Mode)

1. Clone this repo
2. Open `chrome://extensions` in Chrome (or any Chromium browser)
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repo directory
5. Click the Vybit icon in the toolbar and sign in

Works on Chrome, Edge, Brave, Opera, Vivaldi, and Arc.

## How It Works

- **Sign in** with your Vybit account via the extension popup (OAuth2 — your credentials are never shared with the extension)
- A background connection to the Vybit server receives notifications in real time
- Custom sounds play instantly via the extension's offscreen document
- Desktop notifications appear with the vybit name and message

## Permissions

| Permission | Why |
|---|---|
| `identity` | OAuth2 sign-in flow |
| `notifications` | Desktop notifications |
| `offscreen` | Background connection and sound playback |
| `storage` | Store auth token locally |
| `alarms` | Periodic connection health checks |
| `*.vybit.net` | Connect to Vybit servers |

## Privacy

- No data is collected, shared, or sold
- Auth token stored locally in your browser only
- No analytics, tracking, or telemetry
- [Privacy Policy](https://vybit.net/privacy/extension)

## Development

See [CLAUDE.md](CLAUDE.md) for architecture details and technical notes.

## License

MIT

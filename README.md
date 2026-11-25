# AetherOS Search

A browser shell using Scramjet, with Home and Browser views, Bing and DuckDuckGo search, a URL bar, multiple in-app tabs, and quick-launch buttons for Discord, YouTube, GeForce NOW, and Gmail.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by Vite. Scramjet requires a secure context for its service worker; `localhost` is supported.

For a production build, run `npm run build` and configure `VITE_WISP_URL` to point to a Wisp WebSocket service reachable by the deployed site. If unset, the app expects that service at `/wisp/` on the same origin. Do not expose an unauthenticated Wisp server publicly. Site compatibility depends on the destination website and its policies.

In Codespaces, the development server uses the forwarded Wisp port (`WISP_PORT`, default `4142`) over secure WebSockets. The Wisp port must be reachable by the browser for proxied pages to load.

Quick-launch buttons open destinations inside the browser. Account sign-in and bot checks are controlled by each destination and may not work in a proxied session.

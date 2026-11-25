import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createServer } from "vite";

const appPort = Number(process.env.PORT ?? 5173);
const wispPort = Number(process.env.WISP_PORT ?? 4142);
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const defaultWispUrl =
  codespaceName && forwardingDomain
    ? `wss://${codespaceName}-${wispPort}.${forwardingDomain}/`
    : `ws://127.0.0.1:${wispPort}/`;
process.env.VITE_WISP_URL ??= defaultWispUrl;

const wispServer = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Wisp WebSocket transport");
});

wispServer.on("upgrade", (request, socket, head) => {
  wisp.routeRequest(request, socket, head);
});

await new Promise((resolve, reject) => {
  wispServer.once("error", reject);
  wispServer.listen(wispPort, "127.0.0.1", resolve);
});

const vite = await createServer({
  server: { host: "0.0.0.0", port: appPort, strictPort: true },
});
await vite.listen();

console.log(`AetherOS is running at http://localhost:${appPort}`);
console.log(`Wisp transport is listening on port ${wispPort}`);

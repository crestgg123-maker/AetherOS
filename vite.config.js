import { createReadStream, existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { controllerPath } from "@mercuryworkshop/scramjet-controller/path";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";

function serveScramjetRuntime() {
  const runtimeRoots = [
    ["/scramjet/", resolve(scramjetPath)],
    ["/controller/", resolve(controllerPath)],
  ];

  return {
    name: "serve-scramjet-runtime",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = new URL(
          request.url ?? "/",
          "http://localhost",
        ).pathname;
        const runtime = runtimeRoots.find(([prefix]) =>
          requestPath.startsWith(prefix),
        );
        if (!runtime) {
          next();
          return;
        }

        const [prefix, root] = runtime;
        let relativePath;
        try {
          relativePath = decodeURIComponent(requestPath.slice(prefix.length));
        } catch {
          response.statusCode = 400;
          response.end("Invalid asset path");
          return;
        }

        const filePath = resolve(root, relativePath);
        if (!filePath.startsWith(`${root}${sep}`) || !existsSync(filePath)) {
          response.statusCode = 404;
          response.end("Runtime asset not found");
          return;
        }

        const contentTypes = {
          ".js": "application/javascript",
          ".mjs": "application/javascript",
          ".map": "application/json",
          ".wasm": "application/wasm",
        };
        const extension = filePath.slice(filePath.lastIndexOf("."));
        response.setHeader(
          "Content-Type",
          contentTypes[extension] ?? "application/octet-stream",
        );
        response.setHeader("Cache-Control", "no-cache");

        if (request.method === "HEAD") {
          response.end();
          return;
        }

        const stream = createReadStream(filePath);
        stream.on("error", (error) => {
          server.config.logger.error(error.message);
          if (!response.headersSent) {
            response.statusCode = 500;
          }
          response.end();
        });
        stream.pipe(response);
      });
    },
  };
}

export default {
  plugins: [
    serveScramjetRuntime(),
    viteStaticCopy({
      targets: [
        { src: `${scramjetPath}/*`, dest: "scramjet" },
        { src: `${controllerPath}/*`, dest: "controller" },
      ],
    }),
  ],
};

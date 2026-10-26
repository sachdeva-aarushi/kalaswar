import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const frontendSrc = fileURLToPath(new URL("./frontend/src", import.meta.url));

export default defineConfig({
  tanstackStart: {
    // Application source lives in frontend/src (backend/ holds database schema,
    // migrations and environment templates). All Start entries (start, router,
    // client, server) resolve inside srcDirectory.
    srcDirectory: "frontend/src",
    // Redirect TanStack Start's bundled server entry to frontend/src/server.ts
    // (our SSR error wrapper). nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // The Lovable build plugin defaults the `@` alias to <cwd>/src; override it
    // so imports resolve into the frontend folder.
    resolve: { alias: { "@": frontendSrc } },
    publicDir: path.posix.join("frontend", "public"),
  },
});

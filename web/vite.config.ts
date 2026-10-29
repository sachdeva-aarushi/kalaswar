import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const webSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  tanstackStart: {
    srcDirectory: "src",
    server: { entry: "server" },
  },
  vite: {
    resolve: { alias: { "@": webSrc } },
    publicDir: "public",
  },
});

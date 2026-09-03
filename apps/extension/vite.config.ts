import { resolve } from "node:path";
import { defineConfig } from "vite";

const sourceRoot = resolve(import.meta.dirname, "src");

export default defineConfig({
  root: sourceRoot,
  publicDir: resolve(import.meta.dirname, "public"),
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, "../../dist/extension"),
    modulePreload: false,
    rollupOptions: {
      input: {
        background: resolve(sourceRoot, "background/index.ts"),
        content: resolve(sourceRoot, "content/index.ts"),
        dashboard: resolve(sourceRoot, "dashboard/index.html"),
        popup: resolve(sourceRoot, "popup/index.html"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});

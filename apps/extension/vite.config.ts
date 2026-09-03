import { resolve } from "node:path";
import { defineConfig } from "vite";

const sourceRoot = resolve(import.meta.dirname, "src");

export default defineConfig(({ mode }) => {
  const buildingRuntime = mode === "runtime";
  return {
    root: sourceRoot,
    publicDir: buildingRuntime ? resolve(import.meta.dirname, "public") : false,
    build: {
      emptyOutDir: buildingRuntime,
      outDir: resolve(import.meta.dirname, "../../dist/extension"),
      modulePreload: false,
      rollupOptions: {
        input: buildingRuntime
          ? {
              background: resolve(sourceRoot, "background/index.ts"),
              content: resolve(sourceRoot, "content/index.ts"),
            }
          : {
              dashboard: resolve(sourceRoot, "dashboard/index.html"),
              popup: resolve(sourceRoot, "popup/index.html"),
            },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  };
});

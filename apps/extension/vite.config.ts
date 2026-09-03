import { resolve } from "node:path";
import { defineConfig } from "vite";

const sourceRoot = resolve(import.meta.dirname, "src");

export default defineConfig(({ mode }) => {
  const buildingBackground = mode === "background";
  const buildingContent = mode === "content";
  return {
    root: sourceRoot,
    publicDir: buildingBackground
      ? resolve(import.meta.dirname, "public")
      : false,
    build: {
      emptyOutDir: buildingBackground,
      outDir: resolve(import.meta.dirname, "../../dist/extension"),
      modulePreload: false,
      rollupOptions: {
        input: buildingBackground
          ? { background: resolve(sourceRoot, "background/index.ts") }
          : buildingContent
            ? { content: resolve(sourceRoot, "content/index.ts") }
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

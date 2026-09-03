import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["packages/**/*.test.ts"],
          exclude: ["packages/**/*.integration.test.ts", "**/node_modules/**"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: [
            "packages/**/*.integration.test.ts",
            "tests/integration/**/*.test.ts",
          ],
        },
      },
      {
        test: {
          name: "components",
          environment: "node",
          include: ["apps/extension/**/*.test.tsx"],
        },
      },
    ],
  },
});

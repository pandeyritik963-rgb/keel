import { defineConfig } from "vitest/config";
import path from "node:path";

// The deterministic core is framework-free, so tests run in a plain Node environment.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

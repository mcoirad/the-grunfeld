import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,mjs}"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/lib/**/*.{ts,tsx}", "scripts/import-executives.mjs"],
    },
  },
});

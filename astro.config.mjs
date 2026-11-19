import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://mcoirad.github.io",
  base: "/the-grunfeld",
  output: "static",
  integrations: [preact()],
  devToolbar: { enabled: false },
  build: {
    assets: "assets",
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});

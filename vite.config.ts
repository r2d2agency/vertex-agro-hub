import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function offlineAssetsManifest(): Plugin {
  return {
    name: "offline-assets-manifest",
    apply: "build",
    generateBundle(options, bundle) {
      const outputDir = options.dir?.replace(/\\/g, "/");
      if (!outputDir?.endsWith("/client")) return;

      const assets = Object.values(bundle)
        .filter((file) => file.type === "chunk" || !file.fileName.endsWith(".map"))
        .map((file) => `/${file.fileName}`);

      this.emitFile({
        type: "asset",
        fileName: "offline-assets.json",
        source: JSON.stringify(assets),
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    offlineAssetsManifest(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
});

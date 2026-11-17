import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/three/")
            ? "three"
            : id.includes("/peerjs/")
              ? "peer"
              : undefined,
      },
    },
  },
  server: { port: 4173 },
});

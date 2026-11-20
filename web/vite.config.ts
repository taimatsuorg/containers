import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import { defineConfig } from "vite"
import { icons } from "./scripts/icons.ts"

const api = process.env.CONTAINERS_API ?? "http://127.0.0.1:8080"

export default defineConfig({
  plugins: [
    react({
      compiler: { sources: [resolve(import.meta.dirname, "src") + "/"] },
    }),
    tailwindcss(),
    Icons(icons),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    modulePreload: { polyfill: false },
    assetsDir: "assets",
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: {
    proxy: {
      "/api": { target: api, changeOrigin: false, ws: true },
    },
  },
})

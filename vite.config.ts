import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import viteSitemap from 'vite-plugin-sitemap';

export default defineConfig({
  plugins: [
    react(),
    viteSitemap({
      hostname: 'https://oyegaadi.com',
      dynamicRoutes: [
        '/',
        '/one-way-rides',
        '/sharing-rides',
        '/page/contact-us',
      ],
      changefreq: 'weekly',
      priority: 0.7,
      outDir: path.resolve(import.meta.dirname, 'dist/public'), 
    }),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});

/// <reference types="vitest" />
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { vitePwaCoachManifest } from "./src/constants/productBranding";

/**
 * VitePWA injects the coach `manifest.webmanifest` link into every HTML entry.
 * Patch `client.html` on disk after build so `/r/*` keeps only `manifest-client.webmanifest`.
 */
function stripCoachManifestFromClientHtml(): Plugin {
  let outDir = "dist";
  return {
    name: "strip-coach-manifest-from-client-html",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      const clientPath = path.join(outDir, "client.html");
      if (!fs.existsSync(clientPath)) return;
      const html = fs.readFileSync(clientPath, "utf8");
      if (!html.includes("manifest-client.webmanifest")) return;
      const next = html.replace(/\s*<link rel="manifest" href="\/manifest\.webmanifest"[^>]*>\s*/gi, "\n");
      if (next !== html) fs.writeFileSync(clientPath, next);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      deny: ['.git/**', 'node_modules/**', 'firebase.json', 'stackhawk.yml']
    }
  },
  plugins: [
    mode === "development" && {
      name: "debug-roadmap-ndjson",
      enforce: "pre" as const,
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url?.split("?")[0] ?? "";
          if (url !== "/__debug_ndjson" || req.method !== "POST") {
            next();
            return;
          }
          const chunks: Buffer[] = [];
          req.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          req.on("end", () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8").trim();
              if (body) {
                const logPath = path.resolve(__dirname, ".cursor/debug-523b0c.log");
                fs.mkdirSync(path.dirname(logPath), { recursive: true });
                fs.appendFileSync(logPath, `${body}\n`, "utf8");
              }
            } catch (err) {
              console.error("[debug-roadmap-ndjson] append failed:", err);
            }
            res.statusCode = 204;
            res.end();
          });
        });
      },
    },
    // Serve client.html (client PWA manifest/icons) for /r/* routes in dev
    {
      name: 'client-html-fallback',
      configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
        server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
          // Match /r, /r/, /r/anything — all client PWA routes
          if (req.url && /^\/r($|\/|\?)/.test(req.url)) {
            req.url = '/client.html';
          }
          next();
        });
      },
    },
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'og-image.png', 'sitemap.xml'],
      manifest: vitePwaCoachManifest(),
      workbox: {
        // Immediately activate new service workers to prevent stale chunk references
        // (old SW serving old index.html that references non-existent JS filenames)
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Only precache critical shell assets (CSS, HTML, fonts) -- NOT JS chunks.
        // JS is cached lazily via runtimeCaching to avoid a 4+ MB precache storm on mobile.
        globPatterns: ['**/*.{css,html,woff2}'],
        globIgnores: ['**/heic2any-*', '**/generateCategoricalChart-*', '**/pose-*'],
        maximumFileSizeToCacheInBytes: 300_000, // 300 KB safety cap
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/companion\//, /^\/r($|\/)/],
        runtimeCaching: [
          {
            // Some Storage URLs use storage.googleapis.com (not only *.googleapis.com subdomain shape).
            urlPattern: /^https:\/\/storage\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
          {
            // Never intercept ANY googleapis.com request -- Firestore streaming,
            // Auth tokens, and Storage uploads must bypass the service worker entirely.
            // The Cache.put() NetworkError on mobile is caused by Workbox attempting
            // to cache opaque streaming responses from Firestore WebChannel.
            urlPattern: /^https:\/\/.*\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
          {
            // Same for Firebase Auth (securetoken)
            urlPattern: /^https:\/\/securetoken\.google\.com\//,
            handler: 'NetworkOnly',
          },
          {
            // Callable HTTPS (e.g. syncPublicRoadmapMirror) — never cache or run through chunk strategies.
            urlPattern: /^https:\/\/([a-z0-9-]+\.)?cloudfunctions\.net\//,
            handler: 'NetworkOnly',
          },
          {
            // Gen2 / Cloud Run function endpoints
            urlPattern: /^https:\/\/.*\.run\.app\//,
            handler: 'NetworkOnly',
          },
          {
            // JS chunks: cache lazily, but use NetworkFirst (not StaleWhileRevalidate)
            // so stale chunks get replaced immediately on new deployments
            urlPattern: /\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-chunks',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 3 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
    stripCoachManifestFromClientHtml(),
  ].filter(Boolean),
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-webcam',
      'qrcode.react',
      '@radix-ui/react-progress',
      '@radix-ui/react-visually-hidden',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared/billing": path.resolve(__dirname, "./functions/src/shared/billing"),
      "@shared/metadataInts": path.resolve(__dirname, "./functions/src/metadataInts.ts"),
      "@shared/reportingFx": path.resolve(__dirname, "./functions/src/shared/reportingFx.ts"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    passWithNoTests: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        client: path.resolve(__dirname, 'client.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/ai'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', 'lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
}));

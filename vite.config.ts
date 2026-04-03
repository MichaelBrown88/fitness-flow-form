/// <reference types="vitest" />
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
          if (req.url && /^\/r\//.test(req.url)) {
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
      manifest: {
        name: 'OA Coach',
        short_name: 'OA Coach',
        description: 'AI-powered fitness assessment platform for coaches',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/dashboard',
        scope: '/',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
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
        navigateFallbackDenylist: [/^\/api/, /^\/companion\//, /^\/r\//],
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
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
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

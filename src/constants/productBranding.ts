/**
 * Product naming and PWA manifest values used from TypeScript and the Vite build.
 *
 * Browser chrome hex values live in `themeChrome.ts` (must stay aligned with `index.css` `--background`).
 *
 * Also keep in sync when changing install / client-portal appearance:
 * - `public/manifest-client.webmanifest` — JSON mirror of client fields below
 * - `client.html` — `<meta name="theme-color">` should match `PWA_CLIENT_THEME_COLOR_HEX`
 *
 * Coach `manifest.webmanifest` in production is emitted by VitePWA from `vitePwaCoachManifest()`.
 */
import { THEME_COLOR_LIGHT_HEX, THEME_COLOR_DARK_HEX } from './themeChrome';

export const PRODUCT_DISPLAY_NAME = 'One Assess';
export const PRODUCT_SHORT_NAME = 'One Assess';

export const PRODUCT_DESCRIPTION_COACH_PWA =
  'Fitness assessment software for coaches and gyms';

export const PRODUCT_DESCRIPTION_CLIENT_PWA =
  'Your personal fitness assessment portal';

/** Status bar / theme for client report portal (`client.html`, client manifest). */
export const PWA_CLIENT_THEME_COLOR_HEX = THEME_COLOR_DARK_HEX;
export const PWA_CLIENT_BACKGROUND_HEX = THEME_COLOR_LIGHT_HEX;

/**
 * VitePWA `manifest` option — single source for the coach app install banner / desktop PWA.
 */
export function vitePwaCoachManifest(): {
  name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  display: 'standalone';
  orientation: 'any';
  start_url: string;
  scope: string;
  categories: string[];
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
} {
  return {
    name: PRODUCT_DISPLAY_NAME,
    short_name: PRODUCT_SHORT_NAME,
    description: PRODUCT_DESCRIPTION_COACH_PWA,
    theme_color: THEME_COLOR_LIGHT_HEX,
    background_color: THEME_COLOR_LIGHT_HEX,
    display: 'standalone',
    orientation: 'any',
    start_url: '/dashboard',
    scope: '/',
    categories: ['health', 'fitness', 'lifestyle'],
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  };
}

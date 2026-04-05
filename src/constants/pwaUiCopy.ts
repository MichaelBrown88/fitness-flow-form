/**
 * PWA install / update UI strings. Product name comes from `productBranding.ts`.
 */
import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';

export const PWA_UI_COPY = {
  installTitle: `Install ${PRODUCT_DISPLAY_NAME}`,
  installBody: 'Add to your home screen for the best experience.',
  installCta: 'Install',
  installDismiss: 'Not now',
  iosTitle: `Install ${PRODUCT_DISPLAY_NAME}`,
  iosBodyBeforeStrong: 'Tap',
  iosBodyStrong: 'Add to Home Screen',
  iosBodyAfterStrong: 'for the full app experience.',
  iosGotIt: 'Got it',
  updateTitle: 'Update available',
  updateBody: `A new version of ${PRODUCT_DISPLAY_NAME} is ready.`,
  updateCta: 'Refresh now',
  updateLater: 'Later',
} as const;

import type { Timestamp } from 'firebase/firestore';
import type { LiveSession } from '@/services/liveSessions';

/** Canonical Firestore + app fields for companion body-composition preview images. */
export const BODY_COMP_SCAN_FIRESTORE = {
  image: 'bodyCompScanImage',
  imageUpdated: 'bodyCompScanImageUpdated',
  imageFull: 'bodyCompScanImageFull',
  imageStorage: 'bodyCompScanImageStorage',
} as const;

const LEGACY_BODY_COMP_SCAN_FIRESTORE = {
  image: 'inbodyImage',
  imageUpdated: 'inbodyImageUpdated',
  imageFull: 'inbodyImageFull',
  imageStorage: 'inbodyImageStorage',
} as const;

type RawSession = Record<string, unknown>;

/**
 * Normalizes live session snapshots: prefers new field names, falls back to legacy docs.
 */
export function normalizeLiveSessionFromFirestore(raw: RawSession): LiveSession {
  const base = raw as LiveSession;
  const image =
    (raw[BODY_COMP_SCAN_FIRESTORE.image] ?? raw[LEGACY_BODY_COMP_SCAN_FIRESTORE.image]) as
      | string
      | undefined;
  const imageUpdated =
    (raw[BODY_COMP_SCAN_FIRESTORE.imageUpdated] ?? raw[LEGACY_BODY_COMP_SCAN_FIRESTORE.imageUpdated]) as
      | Timestamp
      | undefined;
  const imageFull =
    (raw[BODY_COMP_SCAN_FIRESTORE.imageFull] ?? raw[LEGACY_BODY_COMP_SCAN_FIRESTORE.imageFull]) as
      | string
      | undefined;
  const imageStorage =
    (raw[BODY_COMP_SCAN_FIRESTORE.imageStorage] ?? raw[LEGACY_BODY_COMP_SCAN_FIRESTORE.imageStorage]) as
      | string
      | undefined;

  return {
    ...base,
    [BODY_COMP_SCAN_FIRESTORE.image]: image,
    [BODY_COMP_SCAN_FIRESTORE.imageUpdated]: imageUpdated,
    [BODY_COMP_SCAN_FIRESTORE.imageFull]: imageFull,
    [BODY_COMP_SCAN_FIRESTORE.imageStorage]: imageStorage,
  };
}

import type { Timestamp } from 'firebase/firestore';

/** Canonical Firestore field for last completed body-composition assessment. */
export const CLIENT_PROFILE_LAST_BODY_COMP_AT = 'lastBodyCompDate' as const;

const LEGACY_CLIENT_PROFILE_LAST_BODY_COMP_AT = 'lastInBodyDate' as const;

type WithBodyCompProfileDates = {
  lastBodyCompDate?: Timestamp;
  lastInBodyDate?: Timestamp;
};

export function readLastBodyCompTimestamp(data: WithBodyCompProfileDates): Timestamp | undefined {
  return data.lastBodyCompDate ?? data.lastInBodyDate;
}

/** All Firestore keys that may hold the same logical “last body comp” timestamp (for pause/archive shifts). */
export function clientProfileBodyCompDateFieldKeys(): readonly string[] {
  return [CLIENT_PROFILE_LAST_BODY_COMP_AT, LEGACY_CLIENT_PROFILE_LAST_BODY_COMP_AT];
}

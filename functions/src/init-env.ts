/**
 * Load `functions/.env` then `functions/.env.local` (override) before other modules read process.env.
 * Firebase CLI also injects these at emulator start and at deploy; this covers direct runs and edge cases.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';

const functionsRoot = path.resolve(__dirname, '..');

// Keep in sync with `config.ts` load order. `override: true` beats a stale shell RESEND_*.
const primaryEnv = path.join(functionsRoot, '.env');
const primaryLocal = path.join(functionsRoot, '.env.local');
const cwdEnv = path.join(process.cwd(), '.env');
const cwdLocal = path.join(process.cwd(), '.env.local');

if (fs.existsSync(primaryEnv)) {
  config({ path: primaryEnv, override: true });
} else if (fs.existsSync(cwdEnv)) {
  config({ path: cwdEnv, override: true });
}

if (fs.existsSync(primaryLocal)) {
  config({ path: primaryLocal, override: true });
} else if (fs.existsSync(cwdLocal)) {
  config({ path: cwdLocal, override: true });
}

/**
 * Load `functions/.env` then `functions/.env.local` (override) before other modules read process.env.
 * Firebase CLI also injects these at emulator start and at deploy; this covers direct runs and edge cases.
 */
import * as path from 'node:path';
import { config } from 'dotenv';

const functionsRoot = path.resolve(__dirname, '..');

config({ path: path.join(functionsRoot, '.env') });
config({ path: path.join(functionsRoot, '.env.local'), override: true });

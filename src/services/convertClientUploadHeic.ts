import { httpsCallable } from 'firebase/functions';
import { getFirebaseAuth, getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

const MAX_SERVER_HEIC_BYTES = 12 * 1024 * 1024;

async function fileToRawBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = reader.result;
      if (typeof raw !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const part = raw.includes(',') ? raw.split(',')[1] : raw;
      if (!part) {
        reject(new Error('Empty file'));
        return;
      }
      resolve(part);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Server-side HEIC → JPEG via Cloud Function (sharp/libvips). Used when browser decoders fail.
 */
export async function convertHeicOnServer(file: File): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('Sign in required to convert this photo on the server.');
  }
  if (file.size > MAX_SERVER_HEIC_BYTES) {
    throw new Error(
      'Photo is too large for server conversion. Export a smaller JPEG from Photos and upload that instead.',
    );
  }

  const fn = httpsCallable<
    { base64: string; fileName: string },
    { jpegBase64: string }
  >(getFirebaseFunctions(), 'convertClientUploadHeic');

  const base64 = await fileToRawBase64(file);
  logger.debug('[HEIC] Server conversion', { name: file.name, bytes: file.size });

  const { data } = await fn({ base64, fileName: file.name });
  if (!data?.jpegBase64) {
    throw new Error('Server conversion returned no image.');
  }
  return `data:image/jpeg;base64,${data.jpegBase64}`;
}

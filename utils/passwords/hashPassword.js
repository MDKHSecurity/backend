import crypto from 'crypto';
import { logErrorToFile } from '../logErrorToFile/logErrorToFile.js';

export function hashElement(element) {
  try {
    const hash = crypto.pbkdf2Sync(
      element,
      process.env.PBKDF2_SALT,
      parseInt(process.env.PBKDF2_ITERATIONS),
      parseInt(process.env.PBKDF2_KEYLEN),
      process.env.PBKDF2_DIGEST
    ).toString('hex');
    return hash;
  } catch (error) {
    logErrorToFile(error, "password/hashPassword.js")
    throw new Error("Failed to hash element. Please try again later.");
  }
}

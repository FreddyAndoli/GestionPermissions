import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

let credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credentialPath && !path.isAbsolute(credentialPath)) {
  credentialPath = path.resolve(process.cwd(), credentialPath);
}
const hasIndividualConfig = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

let firebaseAuth: admin.auth.Auth | null = null;

if (credentialPath && fs.existsSync(credentialPath)) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentialPath)
      });
    }
    firebaseAuth = admin.auth();
    logger.info('Firebase Admin SDK initialized from service account file');
  } catch (err: any) {
    logger.error('Failed to initialize Firebase from credential file', { error: err.message, path: credentialPath });
  }
} else if (hasIndividualConfig) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
        })
      });
    }
    firebaseAuth = admin.auth();
    logger.info('Firebase Admin SDK initialized from environment variables');
  } catch (err: any) {
    logger.error('Failed to initialize Firebase from env vars', { error: err.message });
  }
} else {
  logger.warn('Firebase Admin SDK not configured. Authentication will use dev bypass in development mode.');
}

export { firebaseAuth };
export default admin;

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp as clientInitializeApp, getApps as clientGetApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();

const clientApp = clientGetApps().length ? clientGetApps()[0] : clientInitializeApp(firebaseConfig);
export const db = getFirestore(clientApp, firebaseConfig.firestoreDatabaseId);



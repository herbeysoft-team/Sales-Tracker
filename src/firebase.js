import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Fill these in from Firebase Console > Project Settings > Your apps > SDK config.
// Best practice: move these into a .env file (VITE_FIREBASE_*) and read them with
// import.meta.env.VITE_FIREBASE_API_KEY etc. Left inline here so the app runs immediately.
const firebaseConfig = {

  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// --- Secondary app instance ---
// Creating a new marketer account with createUserWithEmailAndPassword()
// automatically signs the *admin* out and signs the new marketer in on the
// default auth instance. To avoid kicking the admin out of their own session,
// admin-side account creation runs against this isolated secondary app, then
// signs it out immediately after the account is created.
const secondaryApp = getApps().some((a) => a.name === 'Secondary')
  ? getApp('Secondary')
  : initializeApp(firebaseConfig, 'Secondary')
export const secondaryAuth = getAuth(secondaryApp)

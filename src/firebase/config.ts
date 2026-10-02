import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAMN6bg_QYauWfa1bjMt191WSjD7IfPJ2M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saferide-48eac.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saferide-48eac",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saferide-48eac.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "436723067868",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:436723067868:web:d0293ffc262fe7c7577d19",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1Q2BLE14MB"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only initialize analytics if running in browser
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Only use local emulators if explicitly requested (e.g. VITE_USE_FIREBASE_EMULATOR=true)
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log("Using Firebase Emulators...");
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

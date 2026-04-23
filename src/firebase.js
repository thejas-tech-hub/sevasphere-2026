import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_CpGlyBSiko9VyBv4HywodwWKIQnMdjo",
  authDomain: "sevasphere-2026.firebaseapp.com",
  projectId: "sevasphere-2026",
  storageBucket: "sevasphere-2026.firebasestorage.app",
  messagingSenderId: "521492905355",
  appId: "1:521492905355:web:3bfc17f3e0d8413c85838e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
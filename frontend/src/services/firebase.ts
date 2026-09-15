import { getApp, getApps, initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(firebaseAuth, googleProvider);

export const signInWithEmailPassword = (email: string, pass: string) => 
  signInWithEmailAndPassword(firebaseAuth, email, pass);

export const fetchFirestoreUserDoc = async (uid: string) => {
  try {
    const userDocRef = doc(firebaseDb, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error('Error fetching Firestore user document users/' + uid, err);
  }
  return null;
};

export const upsertFirestoreUserDoc = async (uid: string, data: Record<string, any>) => {
  try {
    const userDocRef = doc(firebaseDb, 'users', uid);
    await setDoc(userDocRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error writing Firestore user document users/' + uid, err);
    return false;
  }
};

export const deleteFirestoreUserDoc = async (uid: string) => {
  try {
    const userDocRef = doc(firebaseDb, 'users', uid);
    await deleteDoc(userDocRef);
    return true;
  } catch (err) {
    console.error('Error deleting Firestore user document users/' + uid, err);
    return false;
  }
};

export const sendResetPasswordEmail = (email: string) => sendPasswordResetEmail(firebaseAuth, email, {
  url: `${window.location.origin}/reset-password`,
  handleCodeInApp: true,
});

export const verifyResetCode = (oobCode: string) => verifyPasswordResetCode(firebaseAuth, oobCode);

export const resetPasswordWithCode = (oobCode: string, newPassword: string) => confirmPasswordReset(firebaseAuth, oobCode, newPassword);

export const fetchAllFirestoreUserDocs = async (): Promise<any[]> => {
  try {
    const snap = await getDocs(collection(firebaseDb, 'users'));
    return snap.docs.map(d => ({
      id: d.id,
      uid: d.id,
      ...d.data()
    }));
  } catch (err) {
    console.error('Error fetching all Firestore user docs:', err);
    return [];
  }
};



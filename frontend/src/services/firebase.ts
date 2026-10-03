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
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

/**
 * Uploads a chat attachment with fallback mechanisms.
 * Tries Firebase Storage first, then backend multipart upload, then DataURL.
 */
export const uploadChatAttachment = async (
  file: File,
  orgId: string,
  convId: string,
  onProgress?: (progress: number) => void
): Promise<{ name: string; url: string; size: number; type: string }> => {
  if (onProgress) onProgress(20);

  // 1. Try Firebase Storage
  if (firebaseStorage) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `chat_attachments/${orgId}/${convId}/${Date.now()}_${sanitizedName}`;
      const fileStorageRef = storageRef(firebaseStorage, filePath);
      
      if (onProgress) onProgress(45);
      await uploadBytes(fileStorageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      if (onProgress) onProgress(85);
      
      const downloadUrl = await getDownloadURL(fileStorageRef);
      if (onProgress) onProgress(100);
      return {
        name: file.name,
        url: downloadUrl,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };
    } catch (storageErr) {
      console.warn('Firebase Storage upload failed, trying backend fallback:', storageErr);
    }
  }

  // 2. Try Backend Node upload (/api/attachments/upload)
  try {
    if (onProgress) onProgress(60);
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const response = await fetch(`${apiBase}/api/attachments/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Organization-Id': orgId,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (onProgress) onProgress(100);
      return {
        name: file.name,
        url: data.fileUrl || data.url,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };
    }
  } catch (backendErr) {
    console.warn('Backend attachment upload failed, trying DataURL fallback:', backendErr);
  }

  // 3. Resilient Base64 Data URL fallback for local offline simulation
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (onProgress) onProgress(100);
      resolve({
        name: file.name,
        url: reader.result as string,
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  });
};

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

export const fetchOrganizationDoc = async (orgId: string): Promise<any | null> => {
  try {
    const orgDocRef = doc(firebaseDb, 'organizations', orgId);
    const snap = await getDoc(orgDocRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error(`Error fetching organization ${orgId}:`, err);
    return null;
  }
};

export const fetchUserOrgMemberships = async (uid: string, email?: string): Promise<any[]> => {
  try {
    const memberships: any[] = [];
    const seenOrgIds = new Set<string>();

    const q = query(collection(firebaseDb, 'organizationMembers'), where('userId', '==', uid));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data();
      if (data.organizationId && !seenOrgIds.has(data.organizationId)) {
        seenOrgIds.add(data.organizationId);
        memberships.push({ id: d.id, ...data });
      }
    });

    if (email && memberships.length === 0) {
      const qEmail = query(collection(firebaseDb, 'organizationMembers'), where('userEmail', '==', email.trim().toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((d) => {
        const data = d.data();
        if (data.organizationId && !seenOrgIds.has(data.organizationId)) {
          seenOrgIds.add(data.organizationId);
          memberships.push({ id: d.id, ...data });
        }
      });
    }

    // Enrich with organization document
    const enriched: any[] = [];
    for (const m of memberships) {
      const orgDoc = await fetchOrganizationDoc(m.organizationId);
      enriched.push({
        ...m,
        organizationName: orgDoc?.name || m.organizationName || m.organizationId,
        organizationCode: orgDoc?.code || m.organizationId,
        organizationLogo: orgDoc?.logo || null,
        organizationStatus: orgDoc?.status || 'active',
      });
    }

    return enriched;
  } catch (err) {
    console.error('Error fetching user organization memberships:', err);
    return [];
  }
};

// =========================================================================
// FIRESTORE PROJECTS & TASKS PERSISTENCE HELPERS
// =========================================================================

export const fetchFirestoreProjects = async (orgId?: string): Promise<any[]> => {
  try {
    let q = query(collection(firebaseDb, 'projects'));
    if (orgId) {
      q = query(collection(firebaseDb, 'projects'), where('organizationId', '==', orgId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error fetching Firestore projects:', err);
    return [];
  }
};

export const fetchFirestoreTasks = async (orgId?: string, projectId?: string): Promise<any[]> => {
  try {
    let q = query(collection(firebaseDb, 'tasks'));
    if (orgId && projectId) {
      q = query(collection(firebaseDb, 'tasks'), where('organizationId', '==', orgId), where('projectId', '==', projectId));
    } else if (orgId) {
      q = query(collection(firebaseDb, 'tasks'), where('organizationId', '==', orgId));
    } else if (projectId) {
      q = query(collection(firebaseDb, 'tasks'), where('projectId', '==', projectId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error fetching Firestore tasks:', err);
    return [];
  }
};

export const upsertFirestoreProject = async (projectId: string, data: Record<string, any>): Promise<boolean> => {
  try {
    const docRef = doc(firebaseDb, 'projects', String(projectId));
    await setDoc(docRef, {
      ...data,
      id: String(projectId),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error saving Firestore project ${projectId}:`, err);
    return false;
  }
};

export const upsertFirestoreTask = async (taskId: string, data: Record<string, any>): Promise<boolean> => {
  try {
    const docRef = doc(firebaseDb, 'tasks', String(taskId));
    await setDoc(docRef, {
      ...data,
      id: String(taskId),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error saving Firestore task ${taskId}:`, err);
    return false;
  }
};

export const deleteFirestoreProjectDoc = async (projectId: string): Promise<boolean> => {
  try {
    const docRef = doc(firebaseDb, 'projects', String(projectId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting Firestore project ${projectId}:`, err);
    return false;
  }
};

export const deleteFirestoreTaskDoc = async (taskId: string): Promise<boolean> => {
  try {
    const docRef = doc(firebaseDb, 'tasks', String(taskId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting Firestore task ${taskId}:`, err);
    return false;
  }
};

export const fetchFirestoreAuditLogs = async (orgId?: string): Promise<any[]> => {
  try {
    let q: any = collection(firebaseDb, 'audit_logs');
    if (orgId) {
      q = query(collection(firebaseDb, 'audit_logs'), where('organizationId', '==', orgId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  } catch (err) {
    console.error('Error fetching Firestore audit logs:', err);
    return [];
  }
};

export const createFirestoreAuditLogDoc = async (data: Record<string, any>): Promise<boolean> => {
  try {
    const now = new Date();
    const docRef = doc(collection(firebaseDb, 'audit_logs'));
    await setDoc(docRef, {
      ...data,
      id: docRef.id,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Error writing Firestore audit log doc:', err);
    return false;
  }
};

export const fetchFirestoreNotifications = async (userId: string): Promise<any[]> => {
  try {
    const q = query(collection(firebaseDb, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  } catch (err) {
    console.error('Error fetching Firestore notifications:', err);
    return [];
  }
};




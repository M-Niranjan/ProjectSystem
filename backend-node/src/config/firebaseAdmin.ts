import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let appInstance: App | null = null;
let firebaseAdminAuth: Auth | null = null;
let firebaseFirestore: Firestore | null = null;

try {
  const currentApps = getApps();
  if (!currentApps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'project-m-s-6db6b';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.resolve(__dirname, '../../serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      appInstance = initializeApp({
        credential: cert(serviceAccountPath),
      });
      console.log('Firebase Admin SDK initialized with serviceAccountKey.json file at %s', serviceAccountPath);
    } else if (clientEmail && privateKey) {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized with Service Account credentials from environment.');
    } else {
      console.warn('⚠️ Notice: Firebase Admin SDK service account key is missing. Place serviceAccountKey.json in backend-node/ or configure FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY in .env.');
    }
  } else {
    appInstance = currentApps[0];
  }

  if (appInstance) {
    firebaseAdminAuth = getAuth(appInstance);
    firebaseFirestore = getFirestore(appInstance);
  }
} catch (err) {
  console.warn('Firebase Admin SDK initialization warning:', err);
}

export { firebaseAdminAuth, firebaseFirestore, FieldValue };

export class FirebaseAdminService {
  public static async verifyIdToken(idToken: string) {
    if (!firebaseAdminAuth) throw new Error('Firebase Admin SDK is not configured with service account credentials on backend.');
    return firebaseAdminAuth.verifyIdToken(idToken);
  }

  public static async createAuthUserWithoutPassword(email: string, displayName?: string) {
    return this.createAuthUser(email, undefined, displayName);
  }

  public static async createAuthUser(email: string, password?: string, displayName?: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!firebaseAdminAuth) {
      throw new Error('Firebase Admin SDK service account credentials are not configured on the backend server. Account creation aborted.');
    }

    try {
      const userObj: any = {
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        emailVerified: true,
      };
      if (password) userObj.password = password;
      const userRecord = await firebaseAdminAuth.createUser(userObj);
      return userRecord;
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        throw new Error('An account with this email already exists.');
      }
      throw err;
    }
  }

  public static async deleteAuthUser(uid: string) {
    if (!firebaseAdminAuth) return;
    try {
      await firebaseAdminAuth.deleteUser(uid);
      console.log(`Successfully deleted Firebase Auth user: ${uid}`);
    } catch (err) {
      console.error('Error rolling back Firebase Auth user ' + uid, err);
    }
  }

  public static async generatePasswordResetLink(email: string) {
    if (!firebaseAdminAuth) return null;
    try {
      const link = await firebaseAdminAuth.generatePasswordResetLink(email.trim().toLowerCase());
      return link;
    } catch (err) {
      console.warn('Could not generate Firebase Admin password reset link:', err);
      return null;
    }
  }

  public static async setFirestoreUserDoc(uid: string, data: any) {
    if (!firebaseFirestore) throw new Error('Firestore DB instance is unavailable in Firebase Admin SDK');
    try {
      await firebaseFirestore.collection('users').doc(uid).set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error writing to Firestore users collection for UID ' + uid, err);
      throw err; // Re-throw so caller can perform atomic rollback!
    }
  }

  public static async deleteFirestoreUserDoc(uid: string) {
    if (!firebaseFirestore) return;
    try {
      await firebaseFirestore.collection('users').doc(uid).delete();
      console.log(`Successfully deleted Firestore doc users/${uid}`);
    } catch (err) {
      console.error('Error deleting Firestore user document users/' + uid, err);
    }
  }

  public static async getFirestoreUserDoc(uid: string): Promise<Record<string, any> | null> {
    if (!firebaseFirestore) return null;
    try {
      const doc = await firebaseFirestore.collection('users').doc(uid).get();
      if (doc.exists) {
        return { uid: doc.id, id: doc.id, ...doc.data() } as Record<string, any>;
      }
      return null;
    } catch (err) {
      console.error('Error fetching Firestore user doc:', err);
      return null;
    }
  }

  public static async getUserByEmailFromFirestore(email: string): Promise<Record<string, any> | null> {
    if (!firebaseFirestore) return null;
    try {
      const snapshot = await firebaseFirestore.collection('users')
        .where('email', '==', email.trim().toLowerCase())
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { uid: doc.id, id: doc.id, ...doc.data() } as Record<string, any>;
      }
      return null;
    } catch (err) {
      console.error('Error querying Firestore user by email:', err);
      return null;
    }
  }

  public static async getAllFirestoreUsers(): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const snapshot = await firebaseFirestore.collection('users').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data()
      })) as Record<string, any>[];
    } catch (err) {
      console.error('Error getting all Firestore users:', err);
      return [];
    }
  }

  public static async getFirestoreUsersByTeamLeader(teamLeaderUid: string) {
    if (!firebaseFirestore) return [];
    try {
      const snapshot = await firebaseFirestore.collection('users')
        .where('teamLeaderId', '==', teamLeaderUid)
        .get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));

      // Also check team_invitations collection for active/accepted memberships
      try {
        const invSnap = await firebaseFirestore.collection('team_invitations')
          .where('teamLeaderId', '==', teamLeaderUid)
          .where('invitationStatus', '==', 'ACCEPTED')
          .get();
        for (const invDoc of invSnap.docs) {
          const invData = invDoc.data();
          const empId = invData.employeeId;
          if (empId && !docs.some(d => d.uid === empId || d.id === empId)) {
            const empUserDoc = await this.getFirestoreUserDoc(empId);
            if (empUserDoc) {
              docs.push(empUserDoc as any);
            }
          }
        }
      } catch (_invErr) {}

      const ownDoc = await this.getFirestoreUserDoc(teamLeaderUid);
      if (ownDoc && !docs.some(d => d.uid === teamLeaderUid)) {
        docs.unshift(ownDoc as any);
      }
      return docs;
    } catch (err) {
      console.error('Error getting team leader users from Firestore:', err);
      return [];
    }
  }
}

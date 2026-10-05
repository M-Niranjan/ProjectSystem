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

  public static async updateAuthUserPassword(uid: string, password: string) {
    if (!firebaseAdminAuth) throw new Error('Firebase Admin Auth instance is unavailable');
    return firebaseAdminAuth.updateUser(uid, { password });
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

  // =========================================================================
  // MULTI-ORGANIZATION / MULTI-TENANT HELPERS
  // =========================================================================

  public static async ensureDefaultOrganization(): Promise<Record<string, any>> {
    if (!firebaseFirestore) {
      return { id: 'org_default', name: 'Default Organization', code: 'default', status: 'active' };
    }
    try {
      const defaultOrgRef = firebaseFirestore.collection('organizations').doc('org_default');
      const doc = await defaultOrgRef.get();
      if (!doc.exists) {
        const defaultData = {
          id: 'org_default',
          name: 'Default Organization',
          code: 'default',
          description: 'Primary workspace organization',
          status: 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await defaultOrgRef.set(defaultData);
        console.log('Default organization org_default initialized successfully.');
        return defaultData;
      }
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.error('Error ensuring default organization:', err);
      return { id: 'org_default', name: 'Default Organization', code: 'default', status: 'active' };
    }
  }

  public static async autoAssignDefaultOrgMembership(uid: string, email: string, name?: string, roleCode: string = 'ROLE_EMPLOYEE', targetOrgId: string = 'org_default'): Promise<Record<string, any>> {
    if (!firebaseFirestore) {
      return {
        id: `${targetOrgId}_${uid}`,
        organizationId: targetOrgId,
        organizationName: 'Default Organization',
        organizationCode: 'default',
        userId: uid,
        userName: name || email.split('@')[0],
        userEmail: email.toLowerCase(),
        role: roleCode === 'ROLE_ADMIN' ? 'admin' : roleCode === 'ROLE_MANAGER' ? 'teamLeader' : 'employee',
        roleCode,
        status: 'active',
      };
    }
    try {
      let orgDoc = await this.getOrganizationDoc(targetOrgId);
      if (!orgDoc) {
        orgDoc = await this.ensureDefaultOrganization();
      }
      const orgId = orgDoc.id || targetOrgId;
      const memberDocId = `${orgId}_${uid}`;
      const memberRef = firebaseFirestore.collection('organizationMembers').doc(memberDocId);
      const existing = await memberRef.get();
      if (!existing.exists) {
        const canonicalRole = roleCode === 'ROLE_ADMIN' ? 'admin' : roleCode === 'ROLE_MANAGER' ? 'teamLeader' : 'employee';
        const memberData = {
          id: memberDocId,
          organizationId: orgId,
          organizationName: orgDoc.name || 'Default Organization',
          organizationCode: orgDoc.code || 'default',
          userId: uid,
          userName: name || email.split('@')[0],
          userEmail: email.toLowerCase(),
          role: canonicalRole,
          roleCode,
          designation: roleCode === 'ROLE_ADMIN' ? 'System Administrator' : roleCode === 'ROLE_MANAGER' ? 'Project Lead' : 'Software Engineer',
          department: roleCode === 'ROLE_ADMIN' ? 'Executive' : roleCode === 'ROLE_MANAGER' ? 'Management' : 'Engineering',
          status: 'active',
          joinedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await memberRef.set(memberData);
        return memberData;
      }
      return { id: existing.id, ...existing.data() };
    } catch (err) {
      console.error('Error auto-assigning org membership:', err);
      return {
        id: `${targetOrgId}_${uid}`,
        organizationId: targetOrgId,
        organizationName: 'Default Organization',
        organizationCode: 'default',
        userId: uid,
        userName: name || email.split('@')[0],
        userEmail: email.toLowerCase(),
        role: 'employee',
        roleCode: 'ROLE_EMPLOYEE',
        status: 'active',
      };
    }
  }

  public static async getOrganizationDoc(orgId: string): Promise<Record<string, any> | null> {
    if (!firebaseFirestore) return null;
    try {
      const doc = await firebaseFirestore.collection('organizations').doc(orgId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error(`Error getting organization doc ${orgId}:`, err);
      return null;
    }
  }

  public static async getOrganizationByCode(code: string): Promise<Record<string, any> | null> {
    if (!firebaseFirestore || !code) return null;
    const cleanCode = code.trim();
    try {
      // 1. Check exact match
      const snapExact = await firebaseFirestore.collection('organizations').where('code', '==', cleanCode).limit(1).get();
      if (!snapExact.empty) {
        const d = snapExact.docs[0];
        return { id: d.id, ...d.data() };
      }

      // 2. Check uppercase
      const snapUpper = await firebaseFirestore.collection('organizations').where('code', '==', cleanCode.toUpperCase()).limit(1).get();
      if (!snapUpper.empty) {
        const d = snapUpper.docs[0];
        return { id: d.id, ...d.data() };
      }

      // 3. Fallback: check all organizations by id or case-insensitive code
      const all = await this.getAllOrganizations();
      const found = all.find(o => 
        (o.code && o.code.toLowerCase() === cleanCode.toLowerCase()) || 
        o.id.toLowerCase() === cleanCode.toLowerCase()
      );
      return found || null;
    } catch (err) {
      console.error(`Error querying organization by code ${code}:`, err);
      return null;
    }
  }

  public static async generateUniqueOrganizationId(orgName: string): Promise<string> {
    const cleanName = (orgName || '').trim();
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    let prefix = '';

    if (words.length >= 3) {
      prefix = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
    } else if (words.length === 2) {
      prefix = (words[0].substring(0, 2) + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 3) {
      prefix = words[0].substring(0, 3).toUpperCase();
    }

    prefix = prefix.replace(/[^A-Z]/g, '');
    if (prefix.length < 3) {
      const alpha = cleanName.toUpperCase().replace(/[^A-Z]/g, '');
      prefix = (alpha + 'ORG').substring(0, 3);
    }

    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 20; attempt++) {
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const candidate = `${prefix}-${suffix}`;
      const existing = await this.getOrganizationDoc(candidate);
      if (!existing) {
        return candidate;
      }
    }

    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  public static async generateUniqueWorkspaceCode(orgName: string): Promise<string> {
    return this.generateUniqueOrganizationId(orgName);
  }

  public static async createInvitationDoc(token: string, data: any) {
    if (!firebaseFirestore) throw new Error('Firestore is unavailable');
    await firebaseFirestore.collection('invitations').doc(token).set({
      ...data,
      token,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { token, ...data };
  }

  public static async getInvitationDoc(token: string): Promise<Record<string, any> | null> {
    if (!firebaseFirestore || !token) return null;
    try {
      const doc = await firebaseFirestore.collection('invitations').doc(token).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error(`Error getting invitation doc:`, err);
      return null;
    }
  }

  public static async updateInvitationDoc(token: string, data: any) {
    if (!firebaseFirestore || !token) return;
    try {
      await firebaseFirestore.collection('invitations').doc(token).set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error(`Error updating invitation doc ${token}:`, err);
    }
  }

  public static async getOrgInvitations(organizationId: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore || !organizationId) return [];
    try {
      const snap = await firebaseFirestore.collection('invitations').where('organizationId', '==', organizationId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error getting org invitations:', err);
      return [];
    }
  }

  public static async getAllOrganizations(): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const snapshot = await firebaseFirestore.collection('organizations').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('Error getting all organizations:', err);
      return [];
    }
  }

  public static async createOrganizationDoc(orgId: string, data: any) {
    if (!firebaseFirestore) throw new Error('Firestore DB instance is unavailable');
    await firebaseFirestore.collection('organizations').doc(orgId).set({
      ...data,
      id: orgId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: orgId, ...data };
  }

  public static async updateOrganizationDoc(orgId: string, data: any) {
    if (!firebaseFirestore) throw new Error('Firestore DB instance is unavailable');
    await firebaseFirestore.collection('organizations').doc(orgId).set({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return this.getOrganizationDoc(orgId);
  }

  public static async getUserOrgMemberships(uid: string, email?: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const memberships: Record<string, any>[] = [];
      const seenOrgIds = new Set<string>();

      // 1. Query by userId
      const userSnap = await firebaseFirestore.collection('organizationMembers')
        .where('userId', '==', uid)
        .get();

      userSnap.forEach(d => {
        const data = d.data();
        const orgId = data.organizationId;
        if (orgId && !seenOrgIds.has(orgId)) {
          seenOrgIds.add(orgId);
          memberships.push({ id: d.id, ...data });
        }
      });

      // 2. Query by email if provided
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const emailSnap = await firebaseFirestore.collection('organizationMembers')
          .where('userEmail', '==', cleanEmail)
          .get();

        emailSnap.forEach(d => {
          const data = d.data();
          const orgId = data.organizationId;
          if (orgId && !seenOrgIds.has(orgId)) {
            seenOrgIds.add(orgId);
            memberships.push({ id: d.id, ...data });
          }
        });
      }

      // 3. Fallback: If no memberships found from organizationMembers, check users/{uid} doc
      if (memberships.length === 0 && uid) {
        const userDoc = await this.getFirestoreUserDoc(uid);
        if (userDoc && userDoc.organizationId && !seenOrgIds.has(userDoc.organizationId)) {
          const orgId = userDoc.organizationId;
          seenOrgIds.add(orgId);
          const orgDoc = await this.getOrganizationDoc(orgId);
          const membershipData = {
            id: `${orgId}_${uid}`,
            organizationId: orgId,
            organizationName: orgDoc?.name || userDoc.organizationName || orgId,
            organizationCode: orgDoc?.code || orgId,
            userId: uid,
            userName: userDoc.name || email?.split('@')[0] || 'User',
            userEmail: (userDoc.email || email || '').trim().toLowerCase(),
            role: userDoc.role || 'employee',
            roleCode: userDoc.roleCode || (userDoc.role === 'admin' ? 'ROLE_ADMIN' : userDoc.role === 'teamLeader' ? 'ROLE_MANAGER' : 'ROLE_EMPLOYEE'),
            status: userDoc.status || 'active',
          };
          memberships.push(membershipData);

          // Auto-repair missing organizationMembers document in background
          try {
            await this.addOrgMemberDoc(orgId, membershipData);
          } catch (_repairErr) {}
        }
      }

      // 4. Enrich with organization metadata
      const enrichedMemberships: Record<string, any>[] = [];
      for (const m of memberships) {
        const orgDoc = await this.getOrganizationDoc(m.organizationId);
        enrichedMemberships.push({
          ...m,
          organizationName: orgDoc?.name || m.organizationName || m.organizationId,
          organizationCode: orgDoc?.code || m.organizationId,
          organizationLogo: orgDoc?.logo || null,
          organizationStatus: orgDoc?.status || 'active',
        });
      }

      return enrichedMemberships;
    } catch (err) {
      console.error(`Error querying user org memberships for ${uid}:`, err);
      return [];
    }
  }

  public static async getOrgMembers(orgId: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const snap = await firebaseFirestore.collection('organizationMembers')
        .where('organizationId', '==', orgId)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error(`Error querying members of org ${orgId}:`, err);
      return [];
    }
  }

  public static async addOrgMemberDoc(
    orgId: string,
    member: {
      userId: string;
      userEmail: string;
      userName: string;
      role: string;
      roleCode: string;
      status?: string;
      department?: string;
      designation?: string;
    }
  ) {
    if (!firebaseFirestore) throw new Error('Firestore DB instance is unavailable');
    const membershipId = `${orgId}_${member.userId}`;
    const orgDoc = await this.getOrganizationDoc(orgId);
    const data = {
      id: membershipId,
      organizationId: orgId,
      organizationName: orgDoc?.name || orgId,
      userId: member.userId,
      userEmail: member.userEmail.trim().toLowerCase(),
      userName: member.userName,
      role: member.role,
      roleCode: member.roleCode,
      status: member.status || 'active',
      department: member.department || 'Engineering',
      designation: member.designation || 'Member',
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await firebaseFirestore.collection('organizationMembers').doc(membershipId).set(data, { merge: true });
    return data;
  }

  public static async removeOrgMemberDoc(membershipId: string) {
    if (!firebaseFirestore) return;
    try {
      await firebaseFirestore.collection('organizationMembers').doc(membershipId).delete();
    } catch (err) {
      console.error(`Error removing org membership ${membershipId}:`, err);
    }
  }

  public static async getFirestoreUsersByOrganization(orgId: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const memberships = await this.getOrgMembers(orgId);
      const userList: Record<string, any>[] = [];
      const seenUids = new Set<string>();

      for (const m of memberships) {
        if (m.userId && !seenUids.has(m.userId)) {
          seenUids.add(m.userId);
          const userDoc = await this.getFirestoreUserDoc(m.userId);
          if (userDoc) {
            userList.push({
              ...userDoc,
              uid: m.userId,
              id: m.userId,
              orgRole: m.role,
              orgRoleCode: m.roleCode,
              membershipStatus: m.status,
            });
          } else {
            userList.push({
              id: m.userId,
              uid: m.userId,
              name: m.userName,
              email: m.userEmail,
              role: m.role,
              roleCode: m.roleCode,
              status: m.status,
              department: m.department,
              designation: m.designation,
            });
          }
        }
      }
      return userList;
    } catch (err) {
      console.error('Error getting users by organization:', err);
      return [];
    }
  }

  // =========================================================================
  // FIRESTORE PROJECTS PERSISTENCE
  // =========================================================================
  public static async createFirestoreProject(projectId: string | number, data: any) {
    if (!firebaseFirestore) return null;
    try {
      const docId = String(projectId);
      const payload = {
        ...data,
        id: docId,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await firebaseFirestore.collection('projects').doc(docId).set(payload, { merge: true });
      return payload;
    } catch (err) {
      console.error(`Error saving project ${projectId} to Firestore:`, err);
      return null;
    }
  }

  public static async getFirestoreProjects(orgId?: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      let query: any = firebaseFirestore.collection('projects');
      if (orgId) {
        query = query.where('organizationId', '==', orgId);
      }
      const snap = await query.get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error fetching projects from Firestore:', err);
      return [];
    }
  }

  public static async getFirestoreProjectById(projectId: string | number): Promise<Record<string, any> | null> {
    if (!firebaseFirestore) return null;
    try {
      const doc = await firebaseFirestore.collection('projects').doc(String(projectId)).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching project ${projectId} from Firestore:`, err);
      return null;
    }
  }

  public static async updateFirestoreProject(projectId: string | number, data: any) {
    if (!firebaseFirestore) return null;
    try {
      const docId = String(projectId);
      await firebaseFirestore.collection('projects').doc(docId).set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return this.getFirestoreProjectById(docId);
    } catch (err) {
      console.error(`Error updating project ${projectId} in Firestore:`, err);
      return null;
    }
  }

  public static async deleteFirestoreProject(projectId: string | number) {
    if (!firebaseFirestore) return;
    try {
      await firebaseFirestore.collection('projects').doc(String(projectId)).delete();
    } catch (err) {
      console.error(`Error deleting project ${projectId} from Firestore:`, err);
    }
  }

  // =========================================================================
  // FIRESTORE TASKS PERSISTENCE
  // =========================================================================
  public static async createFirestoreTask(taskId: string | number, data: any) {
    if (!firebaseFirestore) return null;
    try {
      const docId = String(taskId);
      const payload = {
        ...data,
        id: docId,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await firebaseFirestore.collection('tasks').doc(docId).set(payload, { merge: true });
      return payload;
    } catch (err) {
      console.error(`Error saving task ${taskId} to Firestore:`, err);
      return null;
    }
  }

  public static async getFirestoreTasks(orgId?: string, projectId?: string | number): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      let query: any = firebaseFirestore.collection('tasks');
      if (orgId) {
        query = query.where('organizationId', '==', orgId);
      }
      if (projectId) {
        query = query.where('projectId', '==', String(projectId));
      }
      const snap = await query.get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error fetching tasks from Firestore:', err);
      return [];
    }
  }

  public static async getFirestoreTaskById(taskId: string | number): Promise<Record<string, any> | null> {
    if (!firebaseFirestore) return null;
    try {
      const doc = await firebaseFirestore.collection('tasks').doc(String(taskId)).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching task ${taskId} from Firestore:`, err);
      return null;
    }
  }

  public static async updateFirestoreTask(taskId: string | number, data: any) {
    if (!firebaseFirestore) return null;
    try {
      const docId = String(taskId);
      await firebaseFirestore.collection('tasks').doc(docId).set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return this.getFirestoreTaskById(docId);
    } catch (err) {
      console.error(`Error updating task ${taskId} in Firestore:`, err);
      return null;
    }
  }

  public static async deleteFirestoreTask(taskId: string | number) {
    if (!firebaseFirestore) return;
    try {
      await firebaseFirestore.collection('tasks').doc(String(taskId)).delete();
    } catch (err) {
      console.error(`Error deleting task ${taskId} from Firestore:`, err);
    }
  }

  // =========================================================================
  // FIRESTORE NOTIFICATIONS PERSISTENCE
  // =========================================================================
  public static async createFirestoreNotification(notificationId: string | number, data: any) {
    if (!firebaseFirestore) return null;
    try {
      const docId = String(notificationId);
      const payload = {
        ...data,
        id: docId,
        isRead: false,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await firebaseFirestore.collection('notifications').doc(docId).set(payload, { merge: true });
      return payload;
    } catch (err) {
      console.error(`Error saving notification ${notificationId} to Firestore:`, err);
      return null;
    }
  }

  public static async getFirestoreNotifications(recipientId: string | number): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      const snap = await firebaseFirestore.collection('notifications')
        .where('recipientId', '==', String(recipientId))
        .limit(50)
        .get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error fetching notifications from Firestore:', err);
      return [];
    }
  }

  public static async markFirestoreNotificationAsRead(notificationId: string | number) {
    if (!firebaseFirestore) return;
    try {
      await firebaseFirestore.collection('notifications').doc(String(notificationId)).set({
        isRead: true,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error(`Error updating notification ${notificationId} in Firestore:`, err);
    }
  }

  // =========================================================================
  // FIRESTORE AUDIT LOGS PERSISTENCE
  // =========================================================================
  public static async createFirestoreAuditLog(data: {
    user: string;
    action: string;
    activity: string;
    status?: string;
    organizationId?: string;
    userId?: string | number;
  }) {
    if (!firebaseFirestore) return null;
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const logDoc = firebaseFirestore.collection('audit_logs').doc();
      const payload = {
        id: logDoc.id,
        user: data.user,
        action: data.action,
        activity: data.activity,
        status: data.status || 'VERIFIED',
        organizationId: data.organizationId || 'org_default',
        userId: data.userId ? String(data.userId) : null,
        date: dateStr,
        time: timeStr,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };
      await logDoc.set(payload);
      return payload;
    } catch (err) {
      console.error('Error saving audit log to Firestore:', err);
      return null;
    }
  }

  public static async getFirestoreAuditLogs(orgId?: string): Promise<Record<string, any>[]> {
    if (!firebaseFirestore) return [];
    try {
      let query: any = firebaseFirestore.collection('audit_logs');
      if (orgId) {
        query = query.where('organizationId', '==', orgId);
      }
      query = query.limit(100);
      const snap = await query.get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error fetching audit logs from Firestore:', err);
      return [];
    }
  }
}


import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models';
import { AuthRequest, normalizeRole } from '../middleware/auth';
import { FirebaseAdminService, FieldValue } from '../config/firebaseAdmin';

export class TeamController {
  // Admin -> Provision Team Leader
  public static async createTeamLeader(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.firebaseUid) {
        return res.status(401).json({ message: 'Unauthorized: Firebase authentication required.' });
      }

      // Read Admin requester's Firestore document to confirm privilege
      const adminProfile = await FirebaseAdminService.getFirestoreUserDoc(req.firebaseUid);
      const requesterRoleNorm = normalizeRole(String(adminProfile?.role || req.user.role));
      if (requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only System Administrators can provision Team Leaders.' });
      }

      const { name, email, password, designation, department, status } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'Name and Email are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check duplicate email in Firebase Auth or Firestore
      const existingFirestoreUser = await FirebaseAdminService.getUserByEmailFromFirestore(cleanEmail);
      if (existingFirestoreUser) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }

      const existingSqlUser = await User.findOne({ where: { email: cleanEmail } });
      if (existingSqlUser) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }

      // Step 1: Provision in Firebase Auth via Firebase Admin SDK
      const fbUser = password 
        ? await FirebaseAdminService.createAuthUser(cleanEmail, password, name.trim())
        : await FirebaseAdminService.createAuthUserWithoutPassword(cleanEmail, name.trim());
      
      const uid = (fbUser as any).uid;

      // Step 2: Atomic Creation of Firestore users/{UID} document
      try {
        await FirebaseAdminService.setFirestoreUserDoc(uid, {
          uid,
          name: name.trim(),
          email: cleanEmail,
          role: 'teamLeader',
          roleCode: Role.ROLE_MANAGER,
          status: status || 'active',
          designation: designation || 'Team Leader / Project Lead',
          department: department || 'Engineering',
          createdBy: req.firebaseUid,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (fsErr) {
        console.error('Firestore creation failed, performing atomic rollback on Firebase Auth user:', fsErr);
        await FirebaseAdminService.deleteAuthUser(uid);
        return res.status(500).json({ message: 'Failed to create user profile in Firestore. Account creation rolled back.' });
      }

      const resetLink = await FirebaseAdminService.generatePasswordResetLink(cleanEmail);

      // Local DB sync for fallback compatibility
      const rawPass = password || Math.random().toString(36);
      const hashedPassword = await bcrypt.hash(rawPass, 10);
      let localUser: any = null;
      try {
        localUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: Role.ROLE_MANAGER,
          designation: designation || 'Team Leader / Project Lead',
          department: department || 'Engineering',
          experience: 3,
          skills: 'Project Management',
          status: status || 'active',
        });
      } catch (dbErr) {
        console.warn('Local database sync skipped, Firestore user created successfully:', dbErr);
      }

      const userObj = localUser ? localUser.toJSON() : {};
      delete userObj.password;

      return res.status(201).json({
        ...userObj,
        id: uid,
        uid,
        name: name.trim(),
        email: cleanEmail,
        role: 'teamLeader',
        roleCode: Role.ROLE_MANAGER,
        status: status || 'active',
        createdBy: req.firebaseUid,
        resetLink,
        message: 'Team Leader account provisioned permanently in Firestore and Firebase Auth.',
      });
    } catch (err: any) {
      console.error('Error in createTeamLeader:', err);
      const message = err.message || 'Failed to create Team Leader account.';
      return res.status(err.status || 500).json({ message });
    }
  }

  // Team Leader or Admin -> Provision Employee
  public static async createEmployee(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.firebaseUid) {
        return res.status(401).json({ message: 'Unauthorized: Firebase authentication required.' });
      }

      // Read Creator's Firestore document
      const creatorProfile = await FirebaseAdminService.getFirestoreUserDoc(req.firebaseUid);
      const creatorRoleNorm = normalizeRole(String(creatorProfile?.role || req.user.role));
      
      if (creatorRoleNorm !== 'ROLE_MANAGER' && creatorRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only Team Leaders or Admins can provision Employees.' });
      }

      const requestedRole = (req.body.role || '').toLowerCase();
      if (requestedRole.includes('admin') || requestedRole.includes('manager') || requestedRole.includes('teamleader') || requestedRole.includes('lead')) {
        if (creatorRoleNorm !== 'ROLE_ADMIN') {
          return res.status(403).json({ message: 'Forbidden: Team Leaders cannot provision Team Leaders or Administrators.' });
        }
      }

      const { name, email, password, designation, department, status, teamLeaderId } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'Name and Email are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check duplicate email in Firebase Auth or Firestore
      const existingFirestoreUser = await FirebaseAdminService.getUserByEmailFromFirestore(cleanEmail);
      if (existingFirestoreUser) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }

      const existingSqlUser = await User.findOne({ where: { email: cleanEmail } });
      if (existingSqlUser) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
      }

      // Step 1: Provision in Firebase Auth via Admin SDK
      const fbUser = password
        ? await FirebaseAdminService.createAuthUser(cleanEmail, password, name.trim())
        : await FirebaseAdminService.createAuthUserWithoutPassword(cleanEmail, name.trim());
      
      const uid = (fbUser as any).uid;

      // Determine teamLeaderId
      const assignedTL = creatorRoleNorm === 'ROLE_MANAGER' 
        ? req.firebaseUid 
        : (teamLeaderId || req.firebaseUid);

      const requestedRoleNorm = normalizeRole(req.body.role || '');
      const assignedRole = (requestedRoleNorm === 'ROLE_ADMIN' && creatorRoleNorm === 'ROLE_ADMIN') 
        ? 'admin' 
        : 'employee';
      const assignedRoleCode = assignedRole === 'admin' ? Role.ROLE_ADMIN : Role.ROLE_EMPLOYEE;

      // Step 2: Atomic Creation of Firestore users/{UID} document
      try {
        await FirebaseAdminService.setFirestoreUserDoc(uid, {
          uid,
          name: name.trim(),
          email: cleanEmail,
          role: assignedRole,
          roleCode: assignedRoleCode,
          status: status || 'active',
          teamLeaderId: assignedTL,
          designation: designation || (assignedRole === 'admin' ? 'System Administrator' : 'Software Engineer'),
          department: department || 'Engineering',
          createdBy: req.firebaseUid,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (fsErr) {
        console.error('Firestore creation failed, performing atomic rollback on Firebase Auth user:', fsErr);
        await FirebaseAdminService.deleteAuthUser(uid);
        return res.status(500).json({ message: 'Failed to create user profile in Firestore. Account creation rolled back.' });
      }

      const resetLink = await FirebaseAdminService.generatePasswordResetLink(cleanEmail);

      // Local DB sync for fallback compatibility
      const rawPass = password || Math.random().toString(36);
      const hashedPassword = await bcrypt.hash(rawPass, 10);
      let localUser: any = null;
      try {
        localUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: Role.ROLE_EMPLOYEE,
          designation: designation || 'Software Engineer',
          department: department || 'Engineering',
          experience: 1,
          skills: 'Software Engineering',
          status: status || 'active',
        });
      } catch (dbErr) {
        console.warn('Local database sync skipped, Firestore user created successfully:', dbErr);
      }

      const userObj = localUser ? localUser.toJSON() : {};
      delete userObj.password;

      return res.status(201).json({
        ...userObj,
        id: uid,
        uid,
        name: name.trim(),
        email: cleanEmail,
        role: 'employee',
        roleCode: Role.ROLE_EMPLOYEE,
        status: status || 'active',
        teamLeaderId: assignedTL,
        createdBy: req.firebaseUid,
        resetLink,
        message: 'Employee account provisioned permanently in Firestore and Firebase Auth.',
      });
    } catch (err: any) {
      console.error('Error in createEmployee:', err);
      const message = err.message || 'Failed to create Employee account.';
      return res.status(err.status || 500).json({ message });
    }
  }

  // Unified Provision Member endpoint
  public static async createMember(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
    }

    const requesterRoleNorm = normalizeRole(req.user.role);
    if (requesterRoleNorm === 'ROLE_EMPLOYEE') {
      return res.status(403).json({ message: 'Forbidden: Employees cannot provision accounts.' });
    }

    const requestedRole = (req.body.role || '').toLowerCase();
    if (requestedRole.includes('manager') || requestedRole.includes('lead') || requestedRole.includes('teamleader')) {
      return TeamController.createTeamLeader(req, res);
    }

    return TeamController.createEmployee(req, res);
  }

  // Get All Members directly from Firestore (Source of Truth)
  public static async getAllMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.firebaseUid) {
        return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
      }

      const requesterProfile = await FirebaseAdminService.getFirestoreUserDoc(req.firebaseUid);
      const requesterRoleNorm = normalizeRole(String(requesterProfile?.role || req.user.role));

      let firestoreUsers: any[] = [];
      if (requesterRoleNorm === 'ROLE_ADMIN') {
        firestoreUsers = await FirebaseAdminService.getAllFirestoreUsers();
      } else if (requesterRoleNorm === 'ROLE_MANAGER') {
        firestoreUsers = await FirebaseAdminService.getFirestoreUsersByTeamLeader(req.firebaseUid);
      } else {
        firestoreUsers = await FirebaseAdminService.getFirestoreUsersByTeamLeader(req.firebaseUid);
      }

      return res.json(firestoreUsers);
    } catch (err: any) {
      console.error('Error in getAllMembers:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateMemberRole(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.firebaseUid) return res.status(401).send('Unauthorized');

      const requesterRoleNorm = normalizeRole(req.user.role);
      if (requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).send('Forbidden: Only Administrators can modify roles.');
      }

      const targetId = req.params.id;
      const roleParam = req.query.role || req.body.role;

      if (targetId === req.user.id.toString() || targetId === req.firebaseUid) {
        return res.status(400).send('Cannot modify own role');
      }

      const roleCode = normalizeRole(String(roleParam));
      const canonicalRole = roleCode === 'ROLE_ADMIN' ? 'admin' : roleCode === 'ROLE_MANAGER' ? 'teamLeader' : 'employee';

      await FirebaseAdminService.setFirestoreUserDoc(targetId, {
        role: canonicalRole,
        roleCode: roleCode,
      });

      try {
        const user = await User.findByPk(parseInt(targetId));
        if (user) {
          user.role = roleCode as Role;
          await user.save();
        }
      } catch (e) {}

      return res.json({ message: 'Role updated successfully', role: canonicalRole, roleCode });
    } catch (err: any) {
      console.error('Error in updateMemberRole:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateMemberDetails(req: AuthRequest, res: Response) {
    try {
      const targetId = req.params.id;
      const { name, email, designation, department, skills, experience, profilePhoto, status } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (designation !== undefined) updateData.designation = designation;
      if (department !== undefined) updateData.department = department;
      if (skills !== undefined) updateData.skills = skills;
      if (experience !== undefined) updateData.experience = Number(experience);
      if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
      if (status !== undefined) updateData.status = status;

      await FirebaseAdminService.setFirestoreUserDoc(targetId, updateData);

      try {
        const user = await User.findByPk(parseInt(targetId));
        if (user) {
          if (name !== undefined) user.name = name;
          if (email !== undefined) user.email = email;
          if (designation !== undefined) user.designation = designation;
          if (department !== undefined) user.department = department;
          if (skills !== undefined) user.skills = skills;
          if (experience !== undefined) user.experience = Number(experience);
          if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
          await user.save();
        }
      } catch (e) {}

      return res.json({ message: 'Member details updated cleanly in Firestore', ...updateData });
    } catch (err: any) {
      console.error('Error in updateMemberDetails:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async deleteMember(req: AuthRequest, res: Response) {
    try {
      const targetId = req.params.id;

      // Delete from Firestore
      await FirebaseAdminService.deleteFirestoreUserDoc(targetId);

      // Delete from Firebase Auth
      await FirebaseAdminService.deleteAuthUser(targetId);

      // Delete from SQL database if exists
      try {
        const user = await User.findByPk(parseInt(targetId));
        if (user) await user.destroy();
      } catch (e) {}

      return res.json({ message: 'User permanently deleted from Firestore and Firebase Auth.' });
    } catch (err: any) {
      console.error('Error in deleteMember:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

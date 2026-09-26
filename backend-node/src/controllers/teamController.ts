import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models';
import { AuthRequest, normalizeRole } from '../middleware/auth';
import { FirebaseAdminService, FieldValue, firebaseFirestore } from '../config/firebaseAdmin';

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

      const { name, email, password, designation, department, status, gender, profilePhoto } = req.body;
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
          gender: gender || 'Male',
          profilePhoto: profilePhoto || null,
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
          gender: gender || 'Male',
          profilePhoto: profilePhoto || null,
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

      const { name, email, password, designation, department, status, teamLeaderId, gender, profilePhoto } = req.body;
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
        : (teamLeaderId || null);

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
          gender: gender || 'Male',
          profilePhoto: profilePhoto || null,
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
          gender: gender || 'Male',
          profilePhoto: profilePhoto || null,
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

  // =========================================================================
  // TEAM LEADER -> INVITE TEAMMATE ENDPOINTS
  // =========================================================================

  /**
   * GET /api/teams/eligible-teammates
   * Returns active employees created by Admin who can be invited by the Team Leader.
   * Filters out employees already assigned to the requesting Team Leader.
   * Annotates employees assigned to other teams with their current team name.
   */
  public static async getEligibleTeammates(req: AuthRequest, res: Response) {
    try {
      const leaderUid = req.firebaseUid || String(req.user?.uid || '');
      if (!leaderUid || !req.user) {
        return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
      }

      // Backend authorization: read requester's Firestore document
      const leaderProfile = await FirebaseAdminService.getFirestoreUserDoc(leaderUid);
      const requesterRoleNorm = normalizeRole(String(leaderProfile?.role || leaderProfile?.roleCode || req.user.role));
      if (requesterRoleNorm !== 'ROLE_MANAGER' && requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only authorized Team Leaders can access eligible teammates.' });
      }

      // Retrieve all users directly from Firestore
      const allUsers = await FirebaseAdminService.getAllFirestoreUsers();

      // Map Team Leaders (uid -> name) to provide current team assignment labels
      const teamLeaderMap = new Map<string, string>();
      for (const u of allUsers) {
        const r = normalizeRole(String(u.role || u.roleCode || ''));
        if (r === 'ROLE_MANAGER') {
          teamLeaderMap.set(u.uid, u.name || 'Team Leader');
        }
      }

      // Read existing invitations for this leader from Firestore team_invitations
      const currentTeamMemberUids = new Set<string>();
      if (firebaseFirestore) {
        try {
          const invSnap = await firebaseFirestore.collection('team_invitations')
            .where('teamLeaderId', '==', leaderUid)
            .get();
          invSnap.forEach(d => {
            const data = d.data();
            if (data.employeeId) currentTeamMemberUids.add(String(data.employeeId));
          });
        } catch (_invQueryErr) {
          console.warn('Notice: could not query team_invitations:', _invQueryErr);
        }
      }

      const eligibleEmployees: any[] = [];

      for (const userDoc of allUsers) {
        const userRoleNorm = normalizeRole(String(userDoc.role || userDoc.roleCode || ''));

        // Only include users whose role is employee
        if (userRoleNorm !== 'ROLE_EMPLOYEE') continue;

        const uid = String(userDoc.uid || userDoc.id);

        // Do NOT show employees already assigned to the current Team Leader
        if (userDoc.teamLeaderId === leaderUid || currentTeamMemberUids.has(uid)) {
          continue;
        }

        const isInactive = userDoc.status && String(userDoc.status).toLowerCase() === 'inactive';
        
        let isAssignedToOtherTeam = false;
        let currentTeam = 'Unassigned';
        let currentTeamLeaderId: string | null = null;
        let currentTeamLeaderName: string | null = null;

        // If assigned to another actual Team Leader
        if (userDoc.teamLeaderId && userDoc.teamLeaderId !== leaderUid && teamLeaderMap.has(userDoc.teamLeaderId)) {
          isAssignedToOtherTeam = true;
          currentTeamLeaderId = userDoc.teamLeaderId;
          currentTeamLeaderName = teamLeaderMap.get(userDoc.teamLeaderId) || 'Another Team';
          currentTeam = `${currentTeamLeaderName}'s Team`;
        }

        eligibleEmployees.push({
          id: uid,
          uid,
          name: userDoc.name || 'Teammate',
          email: userDoc.email || '',
          department: userDoc.department || 'Engineering',
          designation: userDoc.designation || 'Software Engineer',
          status: userDoc.status || 'active',
          gender: userDoc.gender || 'Male',
          profilePhoto: userDoc.profilePhoto || null,
          skills: userDoc.skills || '',
          experience: userDoc.experience || 1,
          currentTeam,
          currentTeamLeaderId,
          currentTeamLeaderName,
          isAssignedToOtherTeam,
          isAssignedToCurrentTeam: false,
          canInvite: !isInactive && !isAssignedToOtherTeam,
          createdAt: userDoc.createdAt || null,
        });
      }

      // Sort: Available (unassigned) first, then alphabetical by name
      eligibleEmployees.sort((a, b) => {
        if (a.canInvite && !b.canInvite) return -1;
        if (!a.canInvite && b.canInvite) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      return res.json(eligibleEmployees);
    } catch (err: any) {
      console.error('Error in getEligibleTeammates:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch eligible teammates from Firestore.' });
    }
  }

  /**
   * POST /api/teams/invite-teammates
   * Accepts { employeeIds: string[] } or { employeeId: string }
   * Validates Team Leader authorization from Firestore.
   * Atomically updates Firestore users/{empId} and team_invitations collection.
   */
  public static async inviteTeammates(req: AuthRequest, res: Response) {
    try {
      const leaderUid = req.firebaseUid || String(req.user?.uid || '');
      if (!leaderUid || !req.user) {
        return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
      }

      // 1. Backend authorization validation: never trust client-supplied roles
      const leaderProfile = await FirebaseAdminService.getFirestoreUserDoc(leaderUid);
      const requesterRoleNorm = normalizeRole(String(leaderProfile?.role || leaderProfile?.roleCode || req.user.role));
      if (requesterRoleNorm !== 'ROLE_MANAGER' && requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only authorized Team Leaders can invite teammates.' });
      }

      // 2. Validate employeeIds
      const rawIds = req.body.employeeIds || (req.body.employeeId ? [req.body.employeeId] : []);
      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return res.status(400).json({ message: 'Please select at least one eligible employee to invite.' });
      }

      const employeeIds: string[] = rawIds.map(id => String(id).trim()).filter(Boolean);
      if (employeeIds.length === 0) {
        return res.status(400).json({ message: 'Invalid employee selection.' });
      }

      const leaderName = leaderProfile?.name || req.user.name || 'Team Leader';
      const teamId = `team_${leaderUid}`;
      const invitedResults: any[] = [];
      const errors: string[] = [];

      for (const empId of employeeIds) {
        // Fetch employee document directly from Firestore
        const empDoc = await FirebaseAdminService.getFirestoreUserDoc(empId);
        if (!empDoc) {
          errors.push(`Employee record (${empId}) was not found in Firestore.`);
          continue;
        }

        // Validate that user is indeed an employee
        const empRoleNorm = normalizeRole(String(empDoc.role || empDoc.roleCode || ''));
        if (empRoleNorm !== 'ROLE_EMPLOYEE') {
          errors.push(`${empDoc.name || empDoc.email} is not registered as an employee.`);
          continue;
        }

        // Validate active status
        if (empDoc.status && String(empDoc.status).toLowerCase() === 'inactive') {
          errors.push(`${empDoc.name || empDoc.email} is inactive and cannot join a team.`);
          continue;
        }

        // Prevent duplicate assignment to the same team
        if (empDoc.teamLeaderId === leaderUid) {
          errors.push(`${empDoc.name || empDoc.email} is already in your team.`);
          continue;
        }

        // 3. Atomically update relationship in Firestore
        // A. Update users/{empId}
        const updatedFields = {
          teamLeaderId: leaderUid,
          teamId,
          invitedBy: leaderUid,
          invitationStatus: 'ACCEPTED',
          assignedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await FirebaseAdminService.setFirestoreUserDoc(empId, updatedFields);

        // B. Store permanent membership record in team_invitations collection
        if (firebaseFirestore) {
          try {
            const inviteDocId = `${leaderUid}_${empId}`;
            await firebaseFirestore.collection('team_invitations').doc(inviteDocId).set({
              id: inviteDocId,
              teamLeaderId: leaderUid,
              teamLeaderName: leaderName,
              teamId,
              employeeId: empId,
              employeeName: empDoc.name || '',
              employeeEmail: empDoc.email || '',
              invitedBy: leaderUid,
              invitationStatus: 'ACCEPTED',
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
          } catch (invErr) {
            console.warn('Notice: Writing to team_invitations collection error:', invErr);
          }
        }

        invitedResults.push({
          id: empId,
          uid: empId,
          name: empDoc.name,
          email: empDoc.email,
          teamLeaderId: leaderUid,
          teamId,
          invitationStatus: 'ACCEPTED',
        });
      }

      if (invitedResults.length === 0) {
        return res.status(400).json({
          message: errors.join(' ') || 'No eligible teammates could be invited.',
          errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully invited ${invitedResults.length} teammate(s) to your team.`,
        invited: invitedResults,
        warnings: errors.length > 0 ? errors : undefined,
      });
    } catch (err: any) {
      console.error('Error in inviteTeammates:', err);
      return res.status(500).json({ message: err.message || 'Failed to process team invitation in Firestore.' });
    }
  }

  /**
   * POST /api/teams/remove-teammate
   * Releases an employee from the Team Leader's team back to unassigned.
   */
  public static async removeTeammate(req: AuthRequest, res: Response) {
    try {
      const leaderUid = req.firebaseUid || String(req.user?.uid || '');
      if (!leaderUid || !req.user) {
        return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
      }

      const leaderProfile = await FirebaseAdminService.getFirestoreUserDoc(leaderUid);
      const requesterRoleNorm = normalizeRole(String(leaderProfile?.role || leaderProfile?.roleCode || req.user.role));
      if (requesterRoleNorm !== 'ROLE_MANAGER' && requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only authorized Team Leaders can release teammates.' });
      }

      const empId = req.params.employeeId || req.body.employeeId;
      if (!empId) {
        return res.status(400).json({ message: 'Employee ID is required.' });
      }

      const empDoc = await FirebaseAdminService.getFirestoreUserDoc(empId);
      if (!empDoc) {
        return res.status(404).json({ message: 'Employee not found.' });
      }

      if (empDoc.teamLeaderId !== leaderUid && requesterRoleNorm !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'You can only release teammates from your own team.' });
      }

      // Reset teamLeaderId to null in Firestore
      await FirebaseAdminService.setFirestoreUserDoc(empId, {
        teamLeaderId: null,
        teamId: null,
        invitationStatus: 'UNASSIGNED',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Remove from team_invitations
      if (firebaseFirestore) {
        try {
          await firebaseFirestore.collection('team_invitations').doc(`${leaderUid}_${empId}`).delete();
        } catch (_delErr) {}
      }

      return res.json({ success: true, message: `${empDoc.name} has been removed from your team.` });
    } catch (err: any) {
      console.error('Error in removeTeammate:', err);
      return res.status(500).json({ message: err.message || 'Failed to release teammate.' });
    }
  }
}


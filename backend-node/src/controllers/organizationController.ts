import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models/User';
import { AuthRequest, normalizeRole } from '../middleware/auth';
import { FirebaseAdminService, firebaseFirestore, FieldValue, firebaseAdminAuth } from '../config/firebaseAdmin';
import { EmailService } from '../services/emailService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '604800000'; // 7 days

export class OrganizationController {
  /**
   * POST /api/organizations/register
   * Public endpoint to register a brand-new organization with its founding Admin.
   * Generates a unique human-readable Workspace Code (e.g. ABC001) and internal organizationId.
   */
  public static async registerOrganization(req: Request, res: Response) {
    try {
      const orgName = (req.body.organizationName || req.body.name || '').trim();
      const orgEmail = (req.body.organizationEmail || req.body.adminEmail || req.body.email || '').trim();
      const admName = (req.body.adminName || req.body.name || '').trim();
      const admEmail = (req.body.adminEmail || req.body.email || '').trim();
      const industry = req.body.industry || 'Technology';
      const password = req.body.password;
      const confirmPassword = req.body.confirmPassword;

      // 1. Validation
      if (!orgName) {
        return res.status(400).json({ message: 'Organization Name is required.' });
      }
      if (!orgEmail || !orgEmail.includes('@')) {
        return res.status(400).json({ message: 'A valid Organization Email is required.' });
      }
      if (!admName) {
        return res.status(400).json({ message: 'Admin Name is required.' });
      }
      if (!admEmail || !admEmail.includes('@')) {
        return res.status(400).json({ message: 'A valid Admin Email is required.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
      }

      const cleanOrgName = orgName.trim();
      const cleanOrgEmail = orgEmail.trim().toLowerCase();
      const cleanAdminName = admName.trim();
      const cleanAdminEmail = admEmail.trim().toLowerCase();
      const cleanIndustry = (industry && industry.trim()) || 'Software / IT';

      // 2. Check if admin email already exists in SQLite
      const existingSqlite = await User.findOne({ where: { email: cleanAdminEmail } });
      if (existingSqlite) {
        return res.status(400).json({ message: 'An account with this Admin Email already exists. Please log in or use a different email.' });
      }

      // Check if admin email exists in Firestore
      const existingFirestore = await FirebaseAdminService.getUserByEmailFromFirestore(cleanAdminEmail);
      if (existingFirestore) {
        return res.status(400).json({ message: 'An account with this Admin Email already exists in the system.' });
      }

      // 3. Provision Firebase Auth user
      let adminUid: string;
      try {
        const userRecord = await FirebaseAdminService.createAuthUser(cleanAdminEmail, password, cleanAdminName);
        adminUid = userRecord.uid;
      } catch (fbErr: any) {
        if (fbErr.message?.includes('already exists') || fbErr.code === 'auth/email-already-exists') {
          return res.status(400).json({ message: 'A Firebase account with this Admin Email already exists.' });
        }
        // Fallback UID if Firebase Admin isn't connected to cloud credentials
        adminUid = `adm_${crypto.randomBytes(8).toString('hex')}`;
      }

      // 4. Generate internal organizationId and human-readable organizationCode (Workspace Code)
      const orgId = `org_${crypto.randomBytes(6).toString('hex')}`;
      const orgCode = await FirebaseAdminService.generateUniqueWorkspaceCode(cleanOrgName);

      // 5. Create Organization document in Firestore
      const orgData = {
        id: orgId,
        name: cleanOrgName,
        code: orgCode,
        industry: cleanIndustry,
        email: cleanOrgEmail,
        status: 'active',
        createdBy: adminUid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        description: `${cleanOrgName} Workspace`,
        workingHours: '09:00 - 18:00 (40h/week)',
        timezone: 'Asia/Kolkata (IST)',
        departments: 'Engineering, Product, Quality Assurance, Design, Management',
        settings: {
          allowEmployeeInvites: true,
          requireTaskApproval: true,
        },
      };
      await FirebaseAdminService.createOrganizationDoc(orgId, orgData);

      // 6. Create Admin user document in Firestore
      await FirebaseAdminService.setFirestoreUserDoc(adminUid, {
        uid: adminUid,
        name: cleanAdminName,
        email: cleanAdminEmail,
        role: 'admin',
        roleCode: Role.ROLE_ADMIN,
        organizationId: orgId,
        organizationCode: orgCode,
        organizationName: cleanOrgName,
        status: 'active',
        department: 'Executive',
        designation: 'Organization Administrator',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 7. Create Organization Membership in Firestore
      await FirebaseAdminService.addOrgMemberDoc(orgId, {
        userId: adminUid,
        userEmail: cleanAdminEmail,
        userName: cleanAdminName,
        role: 'admin',
        roleCode: Role.ROLE_ADMIN,
        status: 'active',
        department: 'Executive',
        designation: 'Organization Administrator',
      });

      // 8. Mirror Admin user in SQLite
      try {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        await User.create({
          name: cleanAdminName,
          email: cleanAdminEmail,
          password: hashedPassword,
          role: Role.ROLE_ADMIN,
          status: 'active',
          designation: 'Organization Administrator',
          department: 'Executive',
          experience: 5,
          skills: 'Organization Management, System Administration',
        });
      } catch (sqlErr) {
        console.warn('Notice: SQLite mirror error during org registration (non-fatal):', sqlErr);
      }

      // 9. Sign JWT token for immediate access
      const token = jwt.sign(
        {
          id: adminUid,
          email: cleanAdminEmail,
          role: Role.ROLE_ADMIN,
          name: cleanAdminName,
          organizationId: orgId,
        },
        JWT_SECRET,
        { expiresIn: `${parseInt(JWT_EXPIRATION) / 1000}s` }
      );

      const memberships = [{
        organizationId: orgId,
        organizationName: cleanOrgName,
        organizationCode: orgCode,
        role: 'admin',
        roleCode: Role.ROLE_ADMIN,
        status: 'active',
      }];

      return res.status(201).json({
        message: 'Organization created successfully 🎉',
        organization: {
          id: orgId,
          code: orgCode,
          name: cleanOrgName,
          industry: cleanIndustry,
          email: cleanOrgEmail,
          status: 'active',
        },
        user: {
          id: adminUid,
          uid: adminUid,
          name: cleanAdminName,
          email: cleanAdminEmail,
          role: Role.ROLE_ADMIN,
          organizationId: orgId,
          organizationCode: orgCode,
        },
        accessToken: token,
        orgMemberships: memberships,
        activeOrganizationId: orgId,
        activeOrgRole: Role.ROLE_ADMIN,
      });
    } catch (err: any) {
      console.error('Error in registerOrganization:', err);
      return res.status(500).json({ error: err.message || 'Failed to register organization.' });
    }
  }
  /**
   * GET /api/organizations
   * Returns all organizations the current authenticated user belongs to.
   */
  public static async listMyOrganizations(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const uid = req.user.uid || String(req.user.id);
      const email = req.user.email;

      let memberships = await FirebaseAdminService.getUserOrgMemberships(uid, email);

      // If user has no memberships, auto-assign to default organization
      if (!memberships || memberships.length === 0) {
        const defaultOrg = await FirebaseAdminService.ensureDefaultOrganization();
        const role = req.user.role;
        const canonicalRole = role === 'ROLE_ADMIN' ? 'admin' : role === 'ROLE_MANAGER' ? 'teamLeader' : 'employee';

        await FirebaseAdminService.addOrgMemberDoc(defaultOrg.id, {
          userId: uid,
          userEmail: email,
          userName: req.user.name || email.split('@')[0],
          role: canonicalRole,
          roleCode: role,
          status: 'active',
        });

        memberships = [{
          organizationId: defaultOrg.id,
          organizationName: defaultOrg.name || 'Default Organization',
          organizationCode: defaultOrg.code || 'default',
          organizationLogo: defaultOrg.logo || null,
          role: canonicalRole,
          roleCode: role,
          status: 'active',
        }];
      }

      return res.json({
        organizations: memberships,
        activeOrganizationId: req.organizationId || (memberships.length === 1 ? memberships[0].organizationId : null),
      });
    } catch (err: any) {
      console.error('Error in listMyOrganizations:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/organizations/all
   * Returns all system organizations (Platform Admins only).
   */
  public static async getAllOrganizations(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      if (normalizeRole(req.user.role) !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Platform Admin access required.' });
      }

      const orgs = await FirebaseAdminService.getAllOrganizations();
      return res.json(orgs);
    } catch (err: any) {
      console.error('Error in getAllOrganizations:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/organizations
   * Create a new organization.
   */
  public static async createOrganization(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      if (normalizeRole(req.user.role) !== 'ROLE_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Only administrators can create new organizations.' });
      }

      const { name, code, description, logo, settings, workingHours, timezone, departments } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Organization name is required.' });
      }

      const cleanName = name.trim();
      const orgCode = (code || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^-+|-+$/g, '');
      const orgId = `org_${orgCode}_${Math.random().toString(36).substring(2, 7)}`;

      const orgData = {
        id: orgId,
        name: cleanName,
        code: orgCode,
        description: description || `${cleanName} workspace`,
        logo: logo || null,
        workingHours: workingHours || '09:00 - 18:00 (40h/week)',
        timezone: timezone || 'Asia/Kolkata (IST)',
        departments: departments || 'Engineering, Product, Quality Assurance, Design, Management',
        settings: settings || {},
        createdBy: req.user.uid || String(req.user.id),
        status: 'active',
      };

      await FirebaseAdminService.createOrganizationDoc(orgId, orgData);

      // Add the creator as Admin in this organization
      const uid = req.user.uid || String(req.user.id);
      await FirebaseAdminService.addOrgMemberDoc(orgId, {
        userId: uid,
        userEmail: req.user.email,
        userName: req.user.name || req.user.email.split('@')[0],
        role: 'admin',
        roleCode: 'ROLE_ADMIN',
        status: 'active',
      });

      return res.status(201).json(orgData);
    } catch (err: any) {
      console.error('Error in createOrganization:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/organizations/:id
   * Get single organization details.
   */
  public static async getOrganization(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const orgId = req.params.id;
      const orgDoc = await FirebaseAdminService.getOrganizationDoc(orgId);
      if (!orgDoc) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Check access: user must be member or platform admin
      const isPlatformAdmin = normalizeRole(req.user.role) === 'ROLE_ADMIN';
      const memberships = await FirebaseAdminService.getUserOrgMemberships(req.user.uid || String(req.user.id), req.user.email);
      const isMember = memberships.some(m => m.organizationId === orgId);

      if (!isMember && !isPlatformAdmin) {
        return res.status(403).json({ message: 'Forbidden: You do not belong to this organization.' });
      }

      const members = await FirebaseAdminService.getOrgMembers(orgId);
      return res.json({
        ...orgDoc,
        memberCount: members.length,
      });
    } catch (err: any) {
      console.error('Error in getOrganization:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * PUT /api/organizations/:id
   * Update organization details.
   */
  public static async updateOrganization(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const orgId = req.params.id;
      const isPlatformAdmin = normalizeRole(req.user.role) === 'ROLE_ADMIN';
      const memberships = await FirebaseAdminService.getUserOrgMemberships(req.user.uid || String(req.user.id), req.user.email);
      const member = memberships.find(m => m.organizationId === orgId);
      const isOrgAdmin = member && normalizeRole(member.roleCode || member.role) === 'ROLE_ADMIN';

      if (!isPlatformAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: 'Forbidden: Only organization administrators can update organization settings.' });
      }

      const { name, description, logo, settings, workingHours, timezone, departments, status } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (logo !== undefined) updateData.logo = logo;
      if (settings !== undefined) updateData.settings = settings;
      if (workingHours !== undefined) updateData.workingHours = workingHours;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (departments !== undefined) updateData.departments = departments;
      if (status !== undefined && isPlatformAdmin) updateData.status = status;

      const updated = await FirebaseAdminService.updateOrganizationDoc(orgId, updateData);
      return res.json(updated);
    } catch (err: any) {
      console.error('Error in updateOrganization:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/organizations/:id/members
   * List all members belonging to an organization.
   */
  public static async getMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const orgId = req.params.id || req.organizationId;
      if (!orgId) return res.status(400).json({ message: 'Organization ID is required.' });

      const members = await FirebaseAdminService.getFirestoreUsersByOrganization(orgId);
      return res.json(members);
    } catch (err: any) {
      console.error('Error in getMembers:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/organizations/:id/members
   * Add a member to an organization.
   */
  public static async addMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const orgId = req.params.id || req.organizationId;
      if (!orgId) return res.status(400).json({ message: 'Organization ID is required.' });

      const { email, role, name, department, designation } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Member email is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      let existingUser = await FirebaseAdminService.getUserByEmailFromFirestore(cleanEmail);
      let targetUid = existingUser?.uid;

      const targetName = name || existingUser?.name || cleanEmail.split('@')[0];
      const targetRoleCode = normalizeRole(role || 'ROLE_EMPLOYEE') || 'ROLE_EMPLOYEE';
      const targetRole = targetRoleCode === 'ROLE_ADMIN' ? 'admin' : targetRoleCode === 'ROLE_MANAGER' ? 'teamLeader' : 'employee';

      if (!targetUid) {
        try {
          const newFbUser = await FirebaseAdminService.createAuthUserWithoutPassword(cleanEmail, targetName);
          targetUid = newFbUser.uid;
        } catch (fbErr: any) {
          try {
            const userRecord = await firebaseAdminAuth?.getUserByEmail(cleanEmail);
            if (userRecord) targetUid = userRecord.uid;
          } catch (_e) {}
        }
      }

      if (!targetUid) {
        return res.status(500).json({ message: 'Failed to provision real Firebase Authentication account for member.' });
      }

      // Ensure Firestore users doc exists
      if (!existingUser) {
        await FirebaseAdminService.setFirestoreUserDoc(targetUid, {
          uid: targetUid,
          name: targetName,
          email: cleanEmail,
          role: targetRole,
          roleCode: targetRoleCode,
          organizationId: orgId,
          status: 'invited',
          department: department || 'Engineering',
          designation: designation || 'Software Engineer',
          createdBy: req.user.uid || String(req.user.id),
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      const orgDoc = await FirebaseAdminService.getOrganizationDoc(orgId);
      const orgName = orgDoc?.name || orgId;
      const orgCode = orgDoc?.code || orgId;

      const membership = await FirebaseAdminService.addOrgMemberDoc(orgId, {
        userId: targetUid,
        userEmail: cleanEmail,
        userName: targetName,
        role: targetRole,
        roleCode: targetRoleCode,
        status: existingUser ? 'active' : 'invited',
        department: department || existingUser?.department || 'Engineering',
        designation: designation || existingUser?.designation || 'Software Engineer',
      });

      // Send invitation email if newly invited
      if (!existingUser) {
        try {
          const token = crypto.randomBytes(32).toString('hex');
          await FirebaseAdminService.createInvitationDoc(token, {
            token,
            uid: targetUid,
            email: cleanEmail,
            name: targetName,
            role: targetRole,
            roleCode: targetRoleCode,
            organizationId: orgId,
            organizationName: orgName,
            organizationCode: orgCode,
            status: 'pending',
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdBy: req.user.uid || String(req.user.id),
          });
          const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
          const inviteLink = `${frontendBase}/accept-invitation?token=${token}`;
          await EmailService.sendInvitationEmail(cleanEmail, orgName, orgCode, inviteLink);
        } catch (invErr) {
          console.warn('Notice: Could not send invitation email in addMember:', invErr);
        }
      }

      return res.status(201).json(membership);
    } catch (err: any) {
      console.error('Error in addMember:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/organizations/:id/members/:memberId
   * Remove member from organization.
   */
  public static async removeMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const orgId = req.params.id || req.organizationId;
      const memberId = req.params.memberId;
      if (!orgId || !memberId) return res.status(400).json({ message: 'Organization ID and Member ID are required.' });

      // Form membership doc ID: ${orgId}_${memberId} or just memberId
      const membershipDocId = memberId.includes('_') ? memberId : `${orgId}_${memberId}`;
      await FirebaseAdminService.removeOrgMemberDoc(membershipDocId);

      return res.json({ message: 'Member successfully removed from organization.' });
    } catch (err: any) {
      console.error('Error in removeMember:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/organizations/switch
   * Switch the active organization context and return refreshed JWT.
   */
  public static async switchOrganization(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const { organizationId } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: 'organizationId is required.' });
      }

      const uid = req.user.uid || String(req.user.id);
      const email = req.user.email;
      const isPlatformAdmin = normalizeRole(req.user.role) === 'ROLE_ADMIN';

      const memberships = await FirebaseAdminService.getUserOrgMemberships(uid, email);
      const membership = memberships.find(m => m.organizationId === organizationId);

      if (!membership && !isPlatformAdmin) {
        return res.status(403).json({ message: `You are not a member of organization '${organizationId}'.` });
      }

      const activeOrgRole = normalizeRole(membership?.roleCode || membership?.role || req.user.role);
      const orgDoc = await FirebaseAdminService.getOrganizationDoc(organizationId);

      // Sign a refreshed token with the chosen organizationId embedded
      const token = jwt.sign(
        {
          id: uid,
          email,
          role: activeOrgRole,
          name: req.user.name,
          organizationId,
        },
        JWT_SECRET,
        { expiresIn: `${parseInt(JWT_EXPIRATION) / 1000}s` }
      );

      return res.json({
        token,
        organizationId,
        organizationName: orgDoc?.name || membership?.organizationName || organizationId,
        role: activeOrgRole,
        activeOrgRole,
      });
    } catch (err: any) {
      console.error('Error in switchOrganization:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

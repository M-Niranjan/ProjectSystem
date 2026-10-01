import { Response, NextFunction } from 'express';
import { AuthRequest, normalizeRole } from './auth';
import { FirebaseAdminService } from '../config/firebaseAdmin';

export interface OrgAuthRequest extends AuthRequest {
  organizationId?: string;
  orgRole?: string;
  orgMembership?: any;
  allMemberships?: any[];
}

/**
 * Middleware to resolve and validate the organization context for incoming requests.
 * Extracts the organization ID from the 'X-Organization-Id' header.
 * Verifies server-side that the authenticated user belongs to the requested organization.
 * Never trusts frontend-supplied parameters without membership verification.
 */
export const resolveOrganization = async (req: OrgAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const uid = req.user.uid || String(req.user.id || '');
    const email = req.user.email || '';

    // Fetch user memberships from Firestore
    let memberships = await FirebaseAdminService.getUserOrgMemberships(uid, email);

    // If no memberships found, only auto-assign to default organization if user is a System Administrator
    if (!memberships || memberships.length === 0) {
      const isSystemAdmin = normalizeRole(req.user.role) === 'ROLE_ADMIN';
      if (isSystemAdmin) {
        const defaultOrg = await FirebaseAdminService.ensureDefaultOrganization();
        if (defaultOrg && defaultOrg.id) {
          const member = await FirebaseAdminService.addOrgMemberDoc(defaultOrg.id, {
            userId: uid,
            userEmail: email,
            userName: req.user.name || email.split('@')[0],
            role: 'admin',
            roleCode: 'ROLE_ADMIN',
            status: 'active',
            department: (req.user as any).department || 'Executive',
            designation: (req.user as any).designation || 'System Administrator',
          });
          memberships = [{
            ...member,
            organizationName: defaultOrg.name || 'Default Organization',
            organizationCode: defaultOrg.code || 'default',
          }];
        }
      }
    }

    req.allMemberships = memberships;

    const rawHeader = req.headers['x-organization-id'] || req.headers['X-Organization-Id'];
    const requestedOrgId = typeof rawHeader === 'string' ? rawHeader.trim() : Array.isArray(rawHeader) ? rawHeader[0].trim() : '';

    if (requestedOrgId) {
      const isPlatformAdmin = normalizeRole(req.user.role) === 'ROLE_ADMIN';
      const userMembership = memberships.find(m => m.organizationId === requestedOrgId && m.status !== 'disabled');

      if (userMembership) {
        req.organizationId = requestedOrgId;
        req.orgRole = normalizeRole(userMembership.roleCode || userMembership.role || req.user.role);
        req.orgMembership = userMembership;
        return next();
      }

      // Platform admins have full access across organizations
      if (isPlatformAdmin) {
        const orgDoc = await FirebaseAdminService.getOrganizationDoc(requestedOrgId);
        if (orgDoc) {
          req.organizationId = requestedOrgId;
          req.orgRole = 'ROLE_ADMIN';
          req.orgMembership = {
            organizationId: requestedOrgId,
            organizationName: orgDoc.name,
            role: 'admin',
            roleCode: 'ROLE_ADMIN',
            status: 'active',
          };
          return next();
        }
      }

      return res.status(403).json({
        message: `Access Denied: You do not have authorized membership in organization '${requestedOrgId}'.`,
      });
    }

    // If no header provided and user has exactly one organization membership, auto-resolve it
    if (memberships.length === 1 && memberships[0].status !== 'disabled') {
      req.organizationId = memberships[0].organizationId;
      req.orgRole = normalizeRole(memberships[0].roleCode || memberships[0].role || req.user.role);
      req.orgMembership = memberships[0];
      return next();
    }

    // If user has multiple orgs and no header provided, continue without setting active organizationId
    return next();
  } catch (err: any) {
    console.error('Error resolving organization context:', err);
    return res.status(500).json({ message: 'Internal server error resolving organization.' });
  }
};

/**
 * Middleware that strictly requires an active organization context.
 * Rejects requests if no organization has been selected or resolved.
 */
export const requireOrganization = (req: OrgAuthRequest, res: Response, next: NextFunction) => {
  if (!req.organizationId) {
    return res.status(400).json({
      message: 'Organization context required. Please provide a valid X-Organization-Id header.',
      code: 'ORGANIZATION_REQUIRED',
    });
  }
  next();
};

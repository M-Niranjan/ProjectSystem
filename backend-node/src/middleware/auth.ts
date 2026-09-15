import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/User';
import { User } from '../models/User';
import { FirebaseAdminService } from '../config/firebaseAdmin';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
  name?: string;
  uid?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  firebaseUid?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token Required' });
  }

  try {
    const decoded = await FirebaseAdminService.verifyIdToken(token);
    req.firebaseUid = decoded.uid;

    const profile = await FirebaseAdminService.getFirestoreUserDoc(decoded.uid);
    const role = normalizeRole(String(profile?.role || ''));
    if (!profile || !role) {
      return res.status(403).json({ message: 'User profile or role is not configured.' });
    }

    const databaseUser = await User.findOne({ where: { email: decoded.email || profile.email } });
    req.user = {
      id: databaseUser ? databaseUser.id : 900000,
      email: decoded.email || String(profile.email || ''),
      role: role as Role,
      name: String(profile.name || decoded.name || ''),
      uid: decoded.uid,
    };
    next();
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return res.status(401).json({ message: 'Invalid or expired Firebase ID token.' });
  }
};

export const normalizeRole = (roleStr: string): string => {
  if (!roleStr) return '';
  const r = roleStr.toUpperCase().replace(/\s+/g, '_');
  if (r === 'ROLE_ADMIN' || r === 'ADMIN') return 'ROLE_ADMIN';
  if (r === 'ROLE_MANAGER' || r === 'TEAMLEADER' || r === 'TEAM_LEADER' || r === 'ROLE_TEAM_LEAD' || r === 'ROLE_TEAM_LEADER' || r === 'MANAGER' || r === 'LEAD' || r === 'TEAM_LEAD' || r === 'TEAMLEAD') return 'ROLE_MANAGER';
  if (r === 'ROLE_EMPLOYEE' || r === 'EMPLOYEE') return 'ROLE_EMPLOYEE';
  return roleStr;
};

export const requireRole = (...allowedRoles: (Role | string)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
    }

    const userRoleNorm = normalizeRole(req.user.role);
    const allowedNorm = allowedRoles.map(r => normalizeRole(r));

    if (!allowedNorm.includes(userRoleNorm)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges. Account authorized role required.' });
    }

    next();
  };
};

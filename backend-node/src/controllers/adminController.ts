import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FirebaseAdminService, FieldValue } from '../config/firebaseAdmin';

export class AdminController {
  public static async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const orgId = req.organizationId || (req.user as any).organizationId || 'org_default';
      let logs = await FirebaseAdminService.getFirestoreAuditLogs(orgId);

      if (!logs) {
        logs = [];
      }

      return res.json(logs);
    } catch (err: any) {
      console.error('Error in getAuditLogs:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async createAuditLog(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { action, activity, status } = req.body;
      const orgId = req.organizationId || (req.user as any).organizationId || 'org_default';

      const log = await FirebaseAdminService.createFirestoreAuditLog({
        user: req.user.name || 'Workspace User',
        action: action || 'WORKSPACE_EVENT',
        activity: activity || 'User action executed',
        status: status || 'VERIFIED',
        organizationId: orgId,
        userId: req.user.id,
      });

      return res.status(201).json(log);
    } catch (err: any) {
      console.error('Error in createAuditLog:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

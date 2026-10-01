import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { OrganizationController } from '../controllers/organizationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/register-organization', OrganizationController.registerOrganization);
router.post('/login', AuthController.login);
router.post('/firebase-login', AuthController.firebaseLogin);
router.get('/me', authenticateToken, AuthController.me);

router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);

// Multi-Organization Secure Invitation Routes
router.get('/invitation', AuthController.getInvitation);
router.post('/accept-invitation', AuthController.acceptInvitation);

export default router;

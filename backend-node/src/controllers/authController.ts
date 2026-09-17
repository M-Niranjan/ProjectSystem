import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { FirebaseAdminService } from '../config/firebaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '86400000';

export class AuthController {
  public static async register(req: Request, res: Response) {
    return res.status(403).json({
      message: 'Public registration is disabled. Accounts must be provisioned by an Administrator or Team Leader.'
    });
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send('Invalid email or password!');
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await User.findOne({ where: { email: cleanEmail } });

      if (!user) {
        return res.status(403).json({
          message: 'Your account has not been provisioned. Please contact your administrator.'
        });
      }

      const isMatch = await bcrypt.compare(password.trim(), user.password);
      if (!isMatch) {
        return res.status(400).send('Invalid email or password! Please enter your updated credentials.');
      }

      // Check provisioned user active status
      if (user.status && user.status.toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({
          message: 'Your account has not been provisioned or is inactive. Please contact your administrator.'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: `${parseInt(JWT_EXPIRATION) / 1000}s` }
      );

      const userObj = user.toJSON();
      delete userObj.password;

      return res.json({ accessToken: token, user: userObj });
    } catch (err: any) {
      console.error('Error in login:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async firebaseLogin(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!idToken) return res.status(401).json({ message: 'Firebase ID token required.' });
      const decoded = await FirebaseAdminService.verifyIdToken(idToken);
      const profile = await FirebaseAdminService.getFirestoreUserDoc(decoded.uid);
      if (!profile || !profile.role) return res.status(403).json({ message: 'User profile or role is not configured.' });

      const roleMap: Record<string, Role> = {
        admin: Role.ROLE_ADMIN, role_admin: Role.ROLE_ADMIN,
        teamleader: Role.ROLE_MANAGER, team_leader: Role.ROLE_MANAGER,
        role_manager: Role.ROLE_MANAGER, role_team_lead: Role.ROLE_MANAGER,
        employee: Role.ROLE_EMPLOYEE, role_employee: Role.ROLE_EMPLOYEE,
      };
      const verifiedRole = roleMap[String(profile.role).trim().toLowerCase()];
      if (!verifiedRole) return res.status(403).json({ message: 'Invalid user role.' });

      const token = jwt.sign(
        { id: decoded.uid, email: decoded.email, role: verifiedRole, name: profile.name },
        JWT_SECRET,
        { expiresIn: `${parseInt(JWT_EXPIRATION) / 1000}s` }
      );

      const userObj = { ...profile, id: decoded.uid, email: decoded.email || profile.email, name: profile.name, role: verifiedRole };

      return res.json({ accessToken: token, user: userObj });
    } catch (err: any) {
      console.error('Error in firebaseLogin:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).send('Unauthorized');
      }

      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return res.status(404).send('Current user not found');
      }

      return res.json(user);
    } catch (err: any) {
      console.error('Error in me:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 1. Send OTP for Forgot Password
  public static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ message: 'Email address is required!' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await User.findOne({ where: { email: cleanEmail } });

      if (!user) {
        return res.status(404).json({ message: 'No account found with this email address.' });
      }

      // Generate secure 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

      user.otp = generatedOtp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();

      // Dispatch Email Notification with OTP
      await EmailService.sendEmailAlert(
        user.email,
        `[Project Management System] Password Reset OTP Code: ${generatedOtp}`,
        `Hello ${user.name},\n\nYour 6-digit OTP code to reset your password is: ${generatedOtp}\n\nThis code will expire in 10 minutes. If you did not request a password reset, please ignore this message.\n\nBest regards,\nProject Management Team`
      );

      return res.json({ message: '6-digit OTP verification code sent to your email address!' });
    } catch (err: any) {
      console.error('Error in forgotPassword:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Verify 6-digit OTP
  public static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and 6-digit OTP code are required!' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      const user = await User.findOne({ where: { email: cleanEmail } });
      if (!user || !user.otp) {
        return res.status(400).json({ message: 'Invalid or expired OTP code!' });
      }

      if (user.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Incorrect 6-digit OTP code. Please check your inbox and try again!' });
      }

      if (user.otpExpiresAt && new Date(user.otpExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: 'OTP code has expired! Please request a new OTP.' });
      }

      return res.json({ message: 'OTP verified successfully! You can now enter your new password.' });
    } catch (err: any) {
      console.error('Error in verifyOtp:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. Reset Password with verified OTP
  public static async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Email, OTP, and new password are required!' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();
      const cleanPassword = newPassword.trim();

      const user = await User.findOne({ where: { email: cleanEmail } });
      if (!user || !user.otp || user.otp !== cleanOtp) {
        return res.status(400).json({ message: 'Invalid or expired OTP code!' });
      }

      if (user.otpExpiresAt && new Date(user.otpExpiresAt).getTime() < Date.now()) {
        return res.status(400).json({ message: 'OTP code has expired! Please request a new OTP.' });
      }

      // Hash new password and clear OTP
      user.password = await bcrypt.hash(cleanPassword, 10);
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();

      return res.json({ message: 'Password reset successfully! Please log in with your new password.' });
    } catch (err: any) {
      console.error('Error in resetPassword:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

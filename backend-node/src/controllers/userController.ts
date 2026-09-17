import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export class UserController {
  public static async getUserProfile(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        return res.status(404).json({ message: `User not found: ${id}` });
      }

      return res.json(user);
    } catch (err: any) {
      console.error('Error in getUserProfile:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).send('Current user not found');
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).send('Current user not found');
      }

      const profileDetails = req.body;

      if (profileDetails.email && profileDetails.email.trim()) {
        const newEmail = profileDetails.email.trim().toLowerCase();
        if (newEmail !== user.email.toLowerCase()) {
          const exists = await User.findOne({ where: { email: newEmail } });
          if (exists) {
            return res.status(400).send('Email address already in use by another user!');
          }
          user.email = newEmail;
        }
      }

      if (profileDetails.name !== undefined) user.name = profileDetails.name;
      if (profileDetails.designation !== undefined) user.designation = profileDetails.designation;
      if (profileDetails.department !== undefined) user.department = profileDetails.department;
      if (profileDetails.experience !== undefined) user.experience = profileDetails.experience;
      if (profileDetails.skills !== undefined) user.skills = profileDetails.skills;
      if (profileDetails.gender !== undefined) user.gender = profileDetails.gender;
      if (profileDetails.profilePhoto !== undefined) user.profilePhoto = profileDetails.profilePhoto;
      if (profileDetails.phone !== undefined) user.phone = profileDetails.phone;
      if (profileDetails.githubUrl !== undefined) user.githubUrl = profileDetails.githubUrl;
      if (profileDetails.portfolioUrl !== undefined) user.portfolioUrl = profileDetails.portfolioUrl;
      if (profileDetails.bio !== undefined) user.bio = profileDetails.bio;
      if (profileDetails.education !== undefined) user.education = profileDetails.education;
      if (profileDetails.resumeBase64 !== undefined) user.resumeBase64 = profileDetails.resumeBase64;
      if (profileDetails.resumeFileName !== undefined) user.resumeFileName = profileDetails.resumeFileName;

      if (profileDetails.password && profileDetails.password.trim()) {
        user.password = await bcrypt.hash(profileDetails.password.trim(), 10);
      }

      await user.save();

      const userObj = user.toJSON();
      delete userObj.password;

      return res.json(userObj);
    } catch (err: any) {
      console.error('Error in updateProfile:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

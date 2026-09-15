import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import { User, Role } from '../models/User';
import { FirebaseAdminService } from '../config/firebaseAdmin';

export async function seedInitialAdmin() {
  try {
    await sequelize.sync();

    const adminAccounts = [
      {
        email: 'niranjanmathapati007@gmail.com',
        name: 'Niranjan Mathapati',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      },
      {
        email: 'nirumathapati23@gmai.com',
        name: 'Nirumathapati',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      },
      {
        email: (process.env.ADMIN_EMAIL || 'admin@pm.com').trim().toLowerCase(),
        name: process.env.ADMIN_NAME || 'System Admin',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      }
    ];

    const seededUsers = [];

    for (const acc of adminAccounts) {
      const email = acc.email.trim().toLowerCase();
      let adminUser = await User.findOne({ where: { email } });

      if (!adminUser) {
        console.log('Seeding System Admin account (%s)...', email);

        // Create in Firebase Auth
        let fbUser = await FirebaseAdminService.createAuthUser(email, acc.password, acc.name);
        const uid = (fbUser as any).uid || 'admin_' + Buffer.from(email).toString('hex').substring(0, 12);

        // Create Firestore Doc
        await FirebaseAdminService.setFirestoreUserDoc(uid, {
          uid,
          name: acc.name,
          email,
          role: 'admin',
          roleCode: Role.ROLE_ADMIN,
          status: 'active',
          designation: 'System Administrator',
          department: 'Executive',
          createdAt: new Date().toISOString(),
          createdBy: 'SYSTEM_BOOTSTRAP',
        });

        const hashedPassword = await bcrypt.hash(acc.password, 10);
        adminUser = await User.create({
          name: acc.name,
          email,
          password: hashedPassword,
          role: Role.ROLE_ADMIN,
          designation: 'System Administrator',
          department: 'Executive',
          experience: 10,
          skills: 'System Architecture, Security, Management',
        });

        console.log('✅ Admin account provisioned: %s (ROLE_ADMIN)', email);
      } else {
        if (adminUser.role !== Role.ROLE_ADMIN) {
          adminUser.role = Role.ROLE_ADMIN;
          await adminUser.save();
          console.log('Updated existing user %s to ROLE_ADMIN', email);
        } else {
          console.log('System Admin account already active: %s', email);
        }
      }
      seededUsers.push(adminUser);
    }

    // Clean up legacy demo users from SQL database
    try {
      await User.destroy({
        where: {
          email: ['ramesh@pm.com', 'rahul@pm.com']
        }
      });
    } catch (e) {}

    return seededUsers;
  } catch (err) {
    console.warn('Notice: Seeding initial Admin account encountered Firebase Admin SDK fallback mode:', err);
  }
}

// Allow direct CLI execution via ts-node / node
if (require.main === module) {
  seedInitialAdmin().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

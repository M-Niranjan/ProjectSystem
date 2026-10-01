import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../config/database';
import { Project } from '../models/Project';
import { FirebaseAdminService, firebaseFirestore } from '../config/firebaseAdmin';

/**
 * Migration Script: Migrate all existing users and projects to the Default Organization.
 * Ensures every existing user has a corresponding record in `organizationMembers`
 * and every existing project has `organizationId = 'org_default'`.
 */
export async function migrateDefaultOrganization() {
  console.log('====================================================');
  console.log('🚀 Starting Multi-Organization Migration Script');
  console.log('====================================================');

  try {
    await sequelize.sync();

    // 1. Ensure Default Organization document exists
    const defaultOrg = await FirebaseAdminService.ensureDefaultOrganization();
    console.log(`✅ Default Organization verified: ${defaultOrg.name} (${defaultOrg.id})`);

    // 2. Migrate Firestore Users to default organization
    let migratedUserCount = 0;
    let existingMemberCount = 0;

    if (firebaseFirestore) {
      const allUsers = await FirebaseAdminService.getAllFirestoreUsers();
      console.log(`📋 Found ${allUsers.length} user documents in Firestore.`);

      for (const user of allUsers) {
        const uid = user.uid || user.id;
        const email = (user.email || '').trim().toLowerCase();
        if (!uid || !email) continue;

        // Check if user already has membership in default org
        const membershipRef = firebaseFirestore.collection('organizationMembers').doc(`${defaultOrg.id}_${uid}`);
        const membershipDoc = await membershipRef.get();

        if (membershipDoc.exists) {
          existingMemberCount++;
        } else {
          const userRole = user.roleCode || user.role || 'ROLE_EMPLOYEE';
          const canonicalRole = (userRole === 'ROLE_ADMIN' || userRole === 'admin')
            ? 'admin'
            : (userRole === 'ROLE_MANAGER' || userRole === 'teamLeader')
            ? 'teamLeader'
            : 'employee';

          await FirebaseAdminService.addOrgMemberDoc(defaultOrg.id, {
            userId: uid,
            userEmail: email,
            userName: user.name || email.split('@')[0],
            role: canonicalRole,
            roleCode: userRole,
            status: user.active !== false ? 'active' : 'inactive',
            department: user.department || 'Engineering',
            designation: user.designation || 'Member',
          });

          migratedUserCount++;
          console.log(`   + Added [${user.name || email}] (${canonicalRole}) to ${defaultOrg.id}`);
        }
      }
    } else {
      console.warn('⚠️  Firestore instance is not available. Skipping Firestore user migration.');
    }

    console.log(`📊 Firestore Users Migration: ${migratedUserCount} newly assigned, ${existingMemberCount} already existed.`);

    // 3. Migrate SQLite Projects to default organization
    const projectsWithoutOrg = await Project.findAll({
      where: {
        organizationId: ['org_default', '', null as any],
      }
    });

    let projectCount = 0;
    const allProjects = await Project.findAll();
    for (const project of allProjects) {
      if (!project.organizationId || project.organizationId.trim() === '') {
        project.organizationId = defaultOrg.id;
        await project.save();
        projectCount++;
      }
    }

    console.log(`📊 Projects Scoped: ${projectCount} projects updated with organizationId '${defaultOrg.id}' (Total projects: ${allProjects.length}).`);
    console.log('====================================================');
    console.log('✅ Multi-Organization Migration Complete!');
    console.log('====================================================');

    return {
      success: true,
      migratedUsers: migratedUserCount,
      existingMembers: existingMemberCount,
      updatedProjects: projectCount,
      defaultOrgId: defaultOrg.id,
    };
  } catch (err: any) {
    console.error('❌ Migration failed with error:', err);
    throw err;
  }
}

// Allow direct CLI execution
if (require.main === module) {
  migrateDefaultOrganization()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

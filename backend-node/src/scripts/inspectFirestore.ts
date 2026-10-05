import dotenv from 'dotenv';
dotenv.config();

import { FirebaseAdminService, firebaseFirestore } from '../config/firebaseAdmin';

async function inspect() {
  if (!firebaseFirestore) {
    console.error('Firestore not initialized');
    process.exit(1);
  }

  console.log('=== FIRESTORE INSPECTION ===');
  
  // 1. Organizations
  const orgsSnap = await firebaseFirestore.collection('organizations').get();
  console.log(`\n--- ORGANIZATIONS (${orgsSnap.size}) ---`);
  orgsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Org ID: ${doc.id} | Name: "${d.name}" | Code: ${d.code} | Status: ${d.status}`);
  });

  // 2. Users
  const usersSnap = await firebaseFirestore.collection('users').get();
  console.log(`\n--- USERS (${usersSnap.size}) ---`);
  usersSnap.forEach(doc => {
    const d = doc.data();
    console.log(`User UID: ${doc.id} | Email: ${d.email} | Name: "${d.name}" | OrgId: ${d.organizationId} | Role: ${d.role || d.roleCode}`);
  });

  // 3. Organization Members
  const membersSnap = await firebaseFirestore.collection('organizationMembers').get();
  console.log(`\n--- ORGANIZATION MEMBERS (${membersSnap.size}) ---`);
  membersSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Member Doc: ${doc.id} | OrgId: ${d.organizationId} | UserId: ${d.userId} | Email: ${d.userEmail} | Role: ${d.role}`);
  });

  // 4. Conversations
  const convSnap = await firebaseFirestore.collection('conversations').get();
  console.log(`\n--- CONVERSATIONS (${convSnap.size}) ---`);
  convSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Conv ID: ${doc.id} | OrgId: ${d.organizationId} | Type: ${d.type} | Participants: ${JSON.stringify(d.participants || d.participantUids)}`);
  });

  // 5. Messages count by orgId
  const msgSnap = await firebaseFirestore.collection('messages').get();
  console.log(`\n--- MESSAGES (${msgSnap.size}) ---`);
  const orgMsgCounts: Record<string, number> = {};
  msgSnap.forEach(doc => {
    const d = doc.data();
    const oId = d.organizationId || 'NO_ORG_ID';
    orgMsgCounts[oId] = (orgMsgCounts[oId] || 0) + 1;
  });
  console.log('Message counts by orgId:', orgMsgCounts);

  process.exit(0);
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});

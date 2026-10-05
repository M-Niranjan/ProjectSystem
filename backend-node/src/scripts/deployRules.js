const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function deployFirestoreRules() {
  console.log('🚀 Starting Firestore rules deployment...');
  
  const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    console.error('❌ firestore.rules file not found at:', rulesPath);
    process.exit(1);
  }
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  console.log('📄 Read firestore.rules (%d bytes)', rulesContent.length);

  const keyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  const auth = new GoogleAuth({
    keyFilename: keyPath,
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const projectId = 'project-m-s-6db6b';

  // 1. Create Ruleset
  console.log('📦 Creating new ruleset on Firebase...');
  const createRulesetRes = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    method: 'POST',
    data: {
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    },
  });

  const newRulesetName = createRulesetRes.data.name;
  console.log('✅ Ruleset created successfully:', newRulesetName);

  // 2. Release Ruleset to cloud.firestore
  console.log('🌐 Releasing ruleset to projects/%s/releases/cloud.firestore...', projectId);
  const releaseRes = await client.request({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
    method: 'PATCH',
    data: {
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: newRulesetName,
      },
    },
  });

  console.log('🎉 Firestore rules deployed and released successfully!');
  console.log('Release details:', JSON.stringify(releaseRes.data, null, 2));
}

deployFirestoreRules().catch((err) => {
  console.error('❌ Deployment failed:');
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Data:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

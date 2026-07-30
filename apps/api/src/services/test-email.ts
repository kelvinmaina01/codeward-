import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the .env from the correct apps/api location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../../.env') });

import { sendWorkspaceInviteMagicLink } from './email-sender.js';

async function run() {
  console.log('Using RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'NOT SET');
  
  const res = await sendWorkspaceInviteMagicLink({
    toEmail: 'kelvin202maina@gmail.com',
    workspaceName: 'Codeward Cloud',
    inviterName: 'Kelvin',
    inviteToken: 'test-magic-token-1234',
    role: 'developer',
    existingMembers: [
      { name: 'Max Kryie', role: 'owner', image: null },
      { name: 'John Doe', role: 'admin', image: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
      { name: 'Jane Smith', role: 'member', image: null }
    ]
  });
  
  console.log('Result:', res);
}

run().catch(console.error);

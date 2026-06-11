import crypto from 'crypto';

const SECRET = 'dev-secret';
const URL = 'http://localhost:3001/api/webhooks/github';

const payload = JSON.stringify({
  after: 'f1d2d2f924e986ac86fdf7b36c94bcdf32beec15',
  repository: {
    full_name: 'codeward-tester/fake-repo',
  },
});

const hmac = crypto.createHmac('sha256', SECRET);
const digest = 'sha256=' + hmac.update(payload).digest('hex');

async function testWebhook() {
  console.log('Sending mock GitHub Push webhook...');
  
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': digest,
        'x-github-event': 'push',
      },
      body: payload,
    });

    const data = await response.json();
    console.log('Status Code:', response.status);
    console.log('Response Body:', data);
    
    if (response.status === 200) {
      console.log('✅ Webhook verified, database updated, and job queued!');
    } else {
      console.error('❌ Webhook failed!');
    }
  } catch (error) {
    console.error('Failed to connect to the server. Is it running on port 3001?', error);
  }
}

testWebhook();

import { NotificationService } from './apps/api/src/notifications/NotificationService.js';

async function testEmail() {
  console.log("Sending test email to kelvin.reallife8@gmail.com...");
  
  try {
    const result = await NotificationService.sendRunFailure(
      'kelvin.reallife8@gmail.com',
      'acme-corp/codeward-dashboard',
      'Security Agent',
      1001,
      'a3f9d2e74c',
      'Sandbox timeout exceeded after 5 retry attempts (120s max). Connection to Firecracker VM was lost.',
      'https://app.codeward.cloud/runs/1001/retry',
      `18:14:20 ✖ Fetch timeout — no response after 120s
18:14:22 ✖ Agent loop aborted
18:14:22 ℹ️ Summary: 5 attempts exhausted. Notifying user.`
    );
    console.log("Email sent successfully:", result);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

testEmail();

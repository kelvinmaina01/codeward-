import 'dotenv/config';

async function testToken() {
  const token = process.env.FLY_API_TOKEN?.trim() || '';
  console.log("Token length:", token.length);
  
  const res = await fetch('https://api.machines.dev/v1/apps', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}

testToken().catch(console.error);

const authUrl = 'http://4.224.186.213/evaluation-service/auth';
const notificationsUrl = 'http://4.224.186.213/evaluation-service/notifications';

const authPayload = {
  email: "rawatvaibhav27@gmail.com",
  name: "vaibhav rawat",
  rollNo: "2420366",
  accessCode: "nwwsKx",
  clientID: "49f6cacf-c548-40e4-8dea-cccaad3bbf5a",
  clientSecret: "pHbJqhmsBgBczxYq"
};

async function run() {
  try {
    // 1. Get access token
    console.log('Authenticating...');
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });
    
    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Auth failed with status ${authRes.status}: ${errText}`);
    }
    
    const authData = await authRes.json();
    const token = authData.access_token;
    console.log('Authentication successful. Token retrieved.');

    // 2. Fetch notifications
    console.log('Fetching notifications...');
    const res = await fetch(notificationsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fetching notifications failed with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('Successfully fetched notifications. Count:', data.notifications?.length);
    console.log('First 3 notifications:');
    console.log(JSON.stringify(data.notifications?.slice(0, 3), null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();

import dotenv from 'dotenv';
import { BoundedPriorityQueue } from './priorityInbox.js';

dotenv.config();

const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';
const NOTIFICATIONS_URL = 'http://4.224.186.213/evaluation-service/notifications';

const credentials = {
  email: "rawatvaibhav27@gmail.com",
  name: "vaibhav rawat",
  rollNo: "2420366",
  accessCode: "nwwsKx",
  clientID: "49f6cacf-c548-40e4-8dea-cccaad3bbf5a",
  clientSecret: "pHbJqhmsBgBczxYq"
};

async function getAccessToken() {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!response.ok) {
    throw new Error('Failed to get auth token');
  }
  const data = await response.json();
  return data.access_token;
}

async function fetchAllNotifications(token) {
  let allNotifications = [];
  let page = 1;
  const limit = 10;
  
  while (page <= 20) {
    const url = `${NOTIFICATIONS_URL}?limit=${limit}&page=${page}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) break;
    const data = await response.json();
    const notifications = data.notifications || [];
    if (notifications.length === 0) break;
    allNotifications.push(...notifications);
    if (notifications.length < limit) break;
    page++;
  }
  return allNotifications;
}

async function run() {
  try {
    console.log('Fetching credentials and authenticating...');
    const token = await getAccessToken();
    console.log('Fetching all notifications...');
    const notifications = await fetchAllNotifications(token);
    
    console.log(`Fetched ${notifications.length} notifications. Computing top 10 priority...`);
    
    const priorityQueue = new BoundedPriorityQueue(10);
    for (const notif of notifications) {
      priorityQueue.insert(notif);
    }
    
    const top10 = priorityQueue.getSortedList();
    
    console.log('\n======================================================================');
    console.log('                      TOP 10 PRIORITY INBOX                           ');
    console.log('======================================================================');
    console.table(top10.map((n, idx) => ({
      Rank: idx + 1,
      ID: n.ID,
      Type: n.Type,
      Message: n.Message,
      Timestamp: n.Timestamp
    })));
    console.log('======================================================================\n');
  } catch (error) {
    console.error('Error running priority calculations:', error.message);
  }
}

run();

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { expressLogMiddleware } from '../logging_middleware/logger.js';
import { BoundedPriorityQueue } from './priorityInbox.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Credentials for auto-auth fallback
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

// Start with user-provided token from environment or hardcode
let cachedToken = process.env.ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyYXdhdHZhaWJoYXYyN0BnbWFpbC5jb20iLCJleHAiOjE3ODA0NzU4MjksImlhdCI6MTc4MDQ3NDkyOSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjM0NjA2MmIzLWU5NDUtNDhjNi05YjdiLWZhNGFlYjM5YzFhNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InZhaWJoYXYgcmF3YXQiLCJzdWIiOiI0OWY2Y2FjZi1jNTQ4LTQwZTQtOGRlYS1jY2NhYWQzYmJmNWEifSwiZW1haWwiOiJyYXdhdHZhaWJoYXYyN0BnbWFpbC5jb20iLCJuYW1lIjoidmFpYmhhdiByYXdhdCIsInJvbGxObyI6IjI0MjAzNjYiLCJhY2Nlc3NDb2RlIjoibnd3c0t4IiwiY2xpZW50SUQiOiI0OWY2Y2FjZi1jNTQ4LTQwZTQtOGRlYS1jY2NhYWQzYmJmNWEiLCJjbGllbnRTZWNyZXQiOiJwSGJKcWhtc0JnQmN6eFlxIn0.-mPcF6hYPB3LHKftZvwbJAKBmtTtcsG8y55tpafwvfE";

// Middleware
app.use(cors());
app.use(express.json());

// Apply our custom logging middleware
app.use(expressLogMiddleware('notification-backend'));

/**
 * Fetches a fresh access token using client credentials.
 */
async function refreshAccessToken() {
  console.log('[Auth] Fetching a fresh access token from external authentication service...');
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication endpoint failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Authentication response did not contain access_token');
  }

  cachedToken = data.access_token;
  console.log('[Auth] Token successfully refreshed and cached.');
  return cachedToken;
}

/**
 * Helper function to fetch notifications with auto-refresh on 401 Unauthorized.
 */
async function fetchExternalNotifications(queryParams = {}, retry = true) {
  const url = new URL(NOTIFICATIONS_URL);
  
  // Append query parameters
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key]) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${cachedToken}`,
      'Accept': 'application/json'
    }
  });

  if (response.status === 401 && retry) {
    console.log('[Auth] Received 401 Unauthorized. Refreshing token...');
    await refreshAccessToken();
    return await fetchExternalNotifications(queryParams, false);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`External API returned status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

/**
 * Helper function to retrieve all notifications across pages.
 * The external API limits 'limit' to at most 10.
 */
async function fetchAllNotifications() {
  let allNotifications = [];
  let page = 1;
  const limit = 10;
  const maxPages = 20; // Fetch up to 200 notifications (20 pages) to be safe

  while (page <= maxPages) {
    console.log(`[Backend] Fetching notifications page ${page}...`);
    const data = await fetchExternalNotifications({ limit, page });
    const notifications = data.notifications || [];
    
    if (notifications.length === 0) {
      break;
    }
    
    allNotifications.push(...notifications);
    
    if (notifications.length < limit) {
      break;
    }
    page++;
  }
  
  console.log(`[Backend] Total notifications fetched from external service: ${allNotifications.length}`);
  return allNotifications;
}

/**
 * GET /api/notifications
 * Proxy endpoint to fetch all notifications from the external API with pagination & filtering.
 */
app.get('/api/notifications', async (req, res) => {
  try {
    const { limit, page, notification_type } = req.query;
    const data = await fetchExternalNotifications({ limit, page, notification_type });
    res.json(data);
  } catch (error) {
    req.log('error', `Failed to fetch notifications: ${error.message}`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/priority
 * Fetches notifications, filters out read ones, and uses a BoundedPriorityQueue (Min-Heap)
 * to return the top 'n' most important unread notifications.
 */
app.get('/api/notifications/priority', async (req, res) => {
  try {
    const n = parseInt(req.query.n) || 10;
    const readIdsString = req.query.readIds || '';
    const readIds = new Set(readIdsString.split(',').filter(id => id.length > 0));

    // Fetch all notifications from the external service page-by-page
    const notifications = await fetchAllNotifications();

    // Filter unread and insert into the BoundedPriorityQueue
    const priorityQueue = new BoundedPriorityQueue(n);
    
    for (const notif of notifications) {
      if (!readIds.has(notif.ID)) {
        priorityQueue.insert(notif);
      }
    }

    // Get sorted top-N list (highest priority first)
    const priorityNotifications = priorityQueue.getSortedList();

    res.json({
      n,
      count: priorityNotifications.length,
      notifications: priorityNotifications
    });
  } catch (error) {
    req.log('error', `Failed to calculate priority notifications: ${error.message}`, error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Backend Server] Running on http://localhost:${PORT}`);
});

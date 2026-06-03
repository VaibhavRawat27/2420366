import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { expressLogMiddleware } from '../logging_middleware/logger.js';
import { BoundedPriorityQueue } from './priorityInbox.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Access token provided by the user
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyYXdhdHZhaWJoYXYyN0BnbWFpbC5jb20iLCJleHAiOjE3ODA0NzU4MjksImlhdCI6MTc4MDQ3NDkyOSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjM0NjA2MmIzLWU5NDUtNDhjNi05YjdiLWZhNGFlYjM5YzFhNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InZhaWJoYXYgcmF3YXQiLCJzdWIiOiI0OWY2Y2FjZi1jNTQ4LTQwZTQtOGRlYS1jY2NhYWQzYmJmNWEifSwiZW1haWwiOiJyYXdhdHZhaWJoYXYyN0BnbWFpbC5jb20iLCJuYW1lIjoidmFpYmhhdiByYXdhdCIsInJvbGxObyI6IjI0MjAzNjYiLCJhY2Nlc3NDb2RlIjoibnd3c0t4IiwiY2xpZW50SUQiOiI0OWY2Y2FjZi1jNTQ4LTQwZTQtOGRlYS1jY2NhYWQzYmJmNWEiLCJjbGllbnRTZWNyZXQiOiJwSGJKcWhtc0JnQmN6eFlxIn0.-mPcF6hYPB3LHKftZvwbJAKBmtTtcsG8y55tpafwvfE";

// Middleware
app.use(cors());
app.use(express.json());

// Apply our custom logging middleware
app.use(expressLogMiddleware('notification-backend'));

/**
 * Helper function to fetch notifications from the external evaluation API.
 */
async function fetchExternalNotifications(queryParams = {}) {
  const url = new URL('http://4.224.186.213/evaluation-service/notifications');
  
  // Append query parameters if present
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key]) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`External API returned status ${response.status}: ${errorText}`);
  }

  return await response.json();
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
    res.status(500).json({ error: 'Failed to fetch notifications from external service.' });
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

    // Fetch notifications (using a high limit to scan a large range for priority ranking)
    const data = await fetchExternalNotifications({ limit: 1000 });
    const notifications = data.notifications || [];

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
    res.status(500).json({ error: 'Failed to retrieve priority inbox notifications.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Backend Server] Running on http://localhost:${PORT}`);
});

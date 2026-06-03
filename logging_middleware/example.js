import http from 'http';
import { Log, expressLogMiddleware } from './logger.js';

// ==========================================
// 1. Direct Logger Function Demo
// ==========================================
console.log('--- Direct Log Usage Demo ---');

// Standard informational logs
Log(null, 'info', 'auth-service', 'User successfully logged in.');

// Debug logs
Log(null, 'debug', 'database', 'Query executed: SELECT * FROM users LIMIT 1');

// Warnings
Log(null, 'warn', 'payment', 'Payment gateway response was slow (1200ms)');

// Error with a custom stack trace string
Log('at processNextTick (node:internal/process/task_queues:95:5)', 'error', 'scheduler', 'Task execution timed out');

// Error with an actual Error stack trace
try {
  throw new Error('Database connection failed!');
} catch (error) {
  Log(error, 'error', 'database', 'Failed to connect to primary DB cluster.');
}

console.log('\n--- HTTP Server Middleware Demo ---');
console.log('Starting demo server at http://localhost:3000/');

// ==========================================
// 2. HTTP Server Middleware Demo
// ==========================================

// Simple express-like middleware runner for native Node.js HTTP server
const loggerMiddleware = expressLogMiddleware('api-gateway');

const server = http.createServer((req, res) => {
  // Apply our middleware
  loggerMiddleware(req, res, () => {
    // Custom log inside the request handler
    req.log('info', `Handling request for path: ${req.url}`);

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Welcome to our logging middleware demo!');
    } else if (req.url === '/error') {
      // Simulate an error
      const err = new Error('Something went terribly wrong inside the route!');
      req.err = err; // Attach error so middleware can extract stack
      
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

server.listen(3000, () => {
  Log(null, 'info', 'server-init', 'Server is listening on port 3000');
  Log(null, 'info', 'server-init', 'Try visiting http://localhost:3000/ or http://localhost:3000/error');
  
  // Keep server running for a few seconds to let user run a query if they want, or just exit after brief timeout in non-interactive run
  setTimeout(() => {
    Log(null, 'info', 'server-shutdown', 'Closing server after demo run.');
    server.close();
  }, 10000);
});

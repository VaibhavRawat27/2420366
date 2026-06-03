const axios = require('axios');

// Strict Schema Constraints defined by evaluation criteria
const ALLOWED_STACKS = ['backend', 'frontend'];

const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

const ALLOWED_PACKAGES = [
  // Backend Only
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service',
  // Frontend Only
  'api', 'component', 'hook', 'page', 'state', 'style',
  // Shared
  'auth', 'config', 'middleware', 'utils'
];

/**
 * Reusable Log Function
 * @param {string} stack - 'backend' or 'frontend'
 * @param {string} level - 'debug', 'info', 'warn', 'error', 'fatal'
 * @param {string} pkg - The package/module reporting the event
 * @param {string} message - Descriptive log content string
 * @param {string} token - The active Bearer Authorization Token
 */
async function Log(stack, level, pkg, message, token) {
  const cleanStack = String(stack).toLowerCase().trim();
  const cleanLevel = String(level).toLowerCase().trim();
  const cleanPkg = String(pkg).toLowerCase().trim();

  if (!ALLOWED_STACKS.includes(cleanStack)) {
    console.error(`[Logging Middleware Error] Invalid stack: "${stack}". Must be one of: ${ALLOWED_STACKS.join(', ')}`);
    return null;
  }
  if (!ALLOWED_LEVELS.includes(cleanLevel)) {
    console.error(`[Logging Middleware Error] Invalid level: "${level}". Must be one of: ${ALLOWED_LEVELS.join(', ')}`);
    return null;
  }
  if (!ALLOWED_PACKAGES.includes(cleanPkg)) {
    console.error(`[Logging Middleware Error] Invalid package: "${pkg}". Must be one of: ${ALLOWED_PACKAGES.join(', ')}`);
    return null;
  }
  if (!message || typeof message !== 'string') {
    console.error('[Logging Middleware Error] Message field must be a valid, non-empty string.');
    return null;
  }
  if (!token) {
    console.error('[Logging Middleware Error] Missing Bearer Token. Cannot make authenticated calls to protected route.');
    return null;
  }

  const payload = {
    stack: cleanStack,
    level: cleanLevel,
    package: cleanPkg,
    message: message
  };

  try {
    const response = await axios.post(
      'http://4.224.186.213/evaluation-service/logs',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to push log entry to test server:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { Log };
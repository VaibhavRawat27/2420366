import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Handles both the old signature:
 *   Log(errorOrStack, level, pkg, message)
 * And the new evaluation service signature:
 *   Log(stackName, level, pkg, message, token)
 */
export async function Log(stackOrError, level, pkg, message, token) {
  let stackName = 'backend'; // Default to backend since it's a Node middleware
  let errorObjOrTrace = null;
  let cleanLevel = 'info';
  let cleanPkg = 'middleware';
  let cleanMessage = '';
  let activeToken = token || process.env.ACCESS_TOKEN;

  // 1. Parse signature dynamically
  if (
    typeof stackOrError === 'string' &&
    ['backend', 'frontend'].includes(stackOrError.toLowerCase().trim())
  ) {
    // New signature: Log(stackName, level, pkg, message, token)
    stackName = stackOrError.toLowerCase().trim();
    cleanLevel = level;
    cleanPkg = pkg;
    cleanMessage = message;
  } else {
    // Old signature: Log(errorOrTrace, level, pkg, message, token)
    errorObjOrTrace = stackOrError;
    cleanLevel = level;
    cleanPkg = pkg;
    cleanMessage = message;
  }

  // 2. Format local console and file output matching the original format
  const timestamp = new Date().toISOString();
  const normalizedLevel = String(cleanLevel || 'INFO').toUpperCase();
  const normalizedPackage = cleanPkg || 'root';

  let formattedStack = '';
  if (errorObjOrTrace) {
    if (errorObjOrTrace instanceof Error) {
      formattedStack = `\nStack Trace:\n${errorObjOrTrace.stack}`;
    } else if (typeof errorObjOrTrace === 'object') {
      formattedStack = `\nContext Data:\n${JSON.stringify(errorObjOrTrace, null, 2)}`;
    } else {
      formattedStack = `\nStack/Trace:\n${errorObjOrTrace}`;
    }
  }

  // ANSI escape codes for coloring terminal output
  const COLORS = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m'   // Reset terminal formatting
  };

  const color = COLORS[normalizedLevel] || COLORS.RESET;
  const consoleOutput = `${color}[${timestamp}] [${normalizedLevel}] [${normalizedPackage}]: ${cleanMessage}${COLORS.RESET}${formattedStack}`;
  console.log(consoleOutput);

  // File logging (without ANSI color codes) to app.log
  const fileOutput = `[${timestamp}] [${normalizedLevel}] [${normalizedPackage}]: ${cleanMessage}${formattedStack}\n`;
  try {
    const logPath = path.resolve(__dirname, 'app.log');
    fs.appendFileSync(logPath, fileOutput, 'utf8');
  } catch (err) {
    console.error('Failed to write to app.log:', err.message);
  }

  // 3. Push to evaluation service if token is present
  if (activeToken && cleanMessage) {
    // Map levels: warning -> warn
    let evalLevel = String(cleanLevel || 'info').toLowerCase().trim();
    if (evalLevel === 'warning') evalLevel = 'warn';
    if (!ALLOWED_LEVELS.includes(evalLevel)) {
      evalLevel = 'info';
    }

    // Map packages to match ALLOWED_PACKAGES
    let evalPkg = String(cleanPkg || 'middleware').toLowerCase().trim();
    if (!ALLOWED_PACKAGES.includes(evalPkg)) {
      if (evalPkg.includes('auth')) evalPkg = 'auth';
      else if (evalPkg.includes('db') || evalPkg.includes('database')) evalPkg = 'db';
      else if (evalPkg.includes('route') || evalPkg.includes('controller') || evalPkg.includes('handler') || evalPkg.includes('api') || evalPkg.includes('gateway')) evalPkg = 'route';
      else if (evalPkg.includes('middleware')) evalPkg = 'middleware';
      else if (evalPkg.includes('service')) evalPkg = 'service';
      else if (evalPkg.includes('config')) evalPkg = 'config';
      else if (evalPkg.includes('cache')) evalPkg = 'cache';
      else if (evalPkg.includes('cron') || evalPkg.includes('scheduler')) evalPkg = 'cron_job';
      else if (evalPkg.includes('repo')) evalPkg = 'repository';
      else if (evalPkg.includes('component')) evalPkg = 'component';
      else if (evalPkg.includes('hook')) evalPkg = 'hook';
      else if (evalPkg.includes('page')) evalPkg = 'page';
      else if (evalPkg.includes('state')) evalPkg = 'state';
      else if (evalPkg.includes('style')) evalPkg = 'style';
      else if (evalPkg.includes('util')) evalPkg = 'utils';
      else evalPkg = 'middleware'; // Fallback
    }

    const payload = {
      stack: ALLOWED_STACKS.includes(stackName) ? stackName : 'backend',
      level: evalLevel,
      package: evalPkg,
      message: String(cleanMessage)
    };

    try {
      await axios.post(
        'http://4.224.186.213/evaluation-service/logs',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.error('Failed to push log entry to test server:', error.response?.data || error.message);
    }
  }

  return null;
}

/**
 * Express middleware wrapping our custom Log function.
 * Matches: expressLogMiddleware(defaultPackage)
 */
export function expressLogMiddleware(defaultPackage = 'http-server') {
  return (req, res, next) => {
    const startTime = Date.now();

    // Extract Bearer Token from headers if present
    let token = null;
    if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }
    if (!token) {
      token = process.env.ACCESS_TOKEN;
    }

    // Attach the logger helper directly to the request object
    // Signature: req.log(level, message, error/stack)
    req.log = (level, message, stack = null) => {
      Log(stack, level, defaultPackage, message, token);
    };

    // Log the request once it finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const message = `${req.method} ${req.originalUrl || req.url} - Status: ${res.statusCode} - ${duration}ms`;
      
      let level = 'INFO';
      let stackInfo = null;

      if (res.statusCode >= 500) {
        level = 'ERROR';
        if (req.err) {
          stackInfo = req.err;
        }
      } else if (res.statusCode >= 400) {
        level = 'WARN';
      }

      Log(stackInfo, level, defaultPackage, message, token);
    });

    next();
  };
}
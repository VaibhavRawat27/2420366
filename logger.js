import fs from 'fs';
import path from 'path';

// ANSI escape codes for coloring terminal output
const COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'   // Reset terminal formatting
};

/**
 * Custom logging function matching the requested signature.
 * 
 * @param {string|Error|null} stack - Stack trace, Error object, or call context.
 * @param {string} level - Log severity level (DEBUG, INFO, WARN, ERROR).
 * @param {string} package_ - Name of the package/module originating the log (using package_ to avoid JS reserved keyword).
 * @param {string} message - The main log message.
 */
export function Log(stack, level, package_, message) {
  const timestamp = new Date().toISOString();
  const normalizedLevel = (level || 'INFO').toUpperCase();
  const normalizedPackage = package_ || 'root';
  
  // Format stack trace if provided
  let formattedStack = '';
  if (stack) {
    if (stack instanceof Error) {
      formattedStack = `\nStack Trace:\n${stack.stack}`;
    } else if (typeof stack === 'object') {
      formattedStack = `\nContext Data:\n${JSON.stringify(stack, null, 2)}`;
    } else {
      formattedStack = `\nStack/Trace:\n${stack}`;
    }
  }

  // Console output styling
  const color = COLORS[normalizedLevel] || COLORS.RESET;
  const consoleOutput = `${color}[${timestamp}] [${normalizedLevel}] [${normalizedPackage}]: ${message}${COLORS.RESET}${formattedStack}`;
  console.log(consoleOutput);

  // File logging (without ANSI color codes)
  const fileOutput = `[${timestamp}] [${normalizedLevel}] [${normalizedPackage}]: ${message}${formattedStack}\n`;
  try {
    fs.appendFileSync(path.resolve('app.log'), fileOutput, 'utf8');
  } catch (err) {
    console.error('Failed to write to app.log:', err.message);
  }
}

/**
 * Express middleware wrapping our custom Log function.
 * 
 * @param {string} defaultPackage - Default package name to use for requests.
 * @returns {Function} Express middleware handler.
 */
export function expressLogMiddleware(defaultPackage = 'http-server') {
  return (req, res, next) => {
    const startTime = Date.now();

    // Attach the logger helper directly to the request object
    req.log = (level, message, stack = null) => {
      Log(stack, level, defaultPackage, message);
    };

    // Log the request once it finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const message = `${req.method} ${req.originalUrl || req.url} - Status: ${res.statusCode} - ${duration}ms`;
      
      let level = 'INFO';
      let stackInfo = null;

      if (res.statusCode >= 500) {
        level = 'ERROR';
        // Add minimal error details if available on request or error state
        if (req.err) {
          stackInfo = req.err;
        }
      } else if (res.statusCode >= 400) {
        level = 'WARN';
      }

      Log(stackInfo, level, defaultPackage, message);
    });

    next();
  };
}

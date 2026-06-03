# Our Own JavaScript Logging Middleware

A custom, lightweight, zero-dependency logging middleware and utility for Node.js written in JavaScript (ES Modules).

## Signature

```javascript
Log(stack, level, package, message)
```

- **`stack`**: Stack trace string, `Error` object, custom context object, or `null`.
- **`level`**: Logging severity level (e.g. `'debug'`, `'info'`, `'warn'`, `'error'`).
- **`package`** (written as `package_` in JS implementation): The package or module originating the log.
- **`message`**: The log message text.

## Features

1. **Clean Formatting**: Formats timestamps, log levels, packages, and messages.
2. **Terminal Colors**: Automatically applies ANSI color codes depending on the log level.
3. **File Output**: Automatically persists all logs in a clean format to `app.log`.
4. **Middleware Support**: Included Express-compatible middleware that attaches `req.log()` to incoming requests and automatically logs response status and duration.

## File Structure

- [logger.js](file:///e:/2420366/logger.js) - Core logger implementation.
- [example.js](file:///e:/2420366/example.js) - Demonstrations of standard logging and HTTP middleware logging.
- [package.json](file:///e:/2420366/package.json) - Node.js package description.

## Running the Demo

You can run the script to see the logger in action:

```bash
node example.js
```

This starts a mock server at `http://localhost:3000/` and logs various requests.

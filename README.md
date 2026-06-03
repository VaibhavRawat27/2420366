# UniNotify Notification System

## 📣 Overview

This repository implements a **full‑stack notification platform** called **UniNotify**. It consists of three tightly‑integrated components:

1. **Logging Middleware** – a lightweight, zero‑dependency ES Module logger that writes colour‑coded log entries to `app.log`, prints them to the console, and optionally pushes them to a remote evaluation service when an `ACCESS_TOKEN` is present.
2. **Backend (`notification_app_be`)** – an Express server that authenticates against the remote service, proxies notification data, and exposes two API endpoints:
   - `GET /api/notifications` – paginated list of all notifications.
   - `GET /api/notifications/priority` – top‑N unread notifications sorted by a **bounded‑priority‑queue (min‑heap)** based on type weight (`placement > result > event`) and recency.
3. **Frontend (`notification_app_fe`)** – a Next.js v16 application styled with Material‑UI v9. It displays an **All Notifications** view, a **Priority Inbox**, supports server‑side pagination, filtering, read‑status tracking (via `localStorage`), and a dark‑mode theme toggle.

All three pieces are wired together so that the backend uses the logger, and the frontend consumes the backend APIs.

---

## 🏗️ Architecture Diagram

```
+----------------+      +---------------------------+      +-------------------+
|   Frontend     | <-- |   Backend (Express)       | -->  | Remote Eval Service |
| (Next.js)     |      | • expressLogMiddleware   |      | (auth & notifications) |
+----------------+      | • BoundedPriorityQueue   |      +-------------------+
                        | • logger.js (ESM)        |
                        +---------------------------+
```

---

## 🛠️ Logging Middleware Details

- **File:** `logging_middleware/logger.js`
- **Exports:**
  - `Log(...args)` – supports two signatures:
    1. Legacy: `Log(error, level, pkg, message)`
    2. New (remote): `Log(stack, level, pkg, message, token)`
  - `expressLogMiddleware(serviceName)` – Express middleware that:
    1. Attaches `req.log` to each request.
    2. Logs request start time.
    3. On response finish, logs status, duration, and pushes the log to the remote service **if** `process.env.ACCESS_TOKEN` is set.
- **Features:**
  - Timestamped, colour‑coded console output.
  - Writes every entry to `logging_middleware/app.log`.
  - Validates the `package` name against `ALLOWED_PACKAGES` (backend vs frontend).
  - Remote push uses `axios` with a POST to `http://<remote‑service>/log`.

---

## 📦 Backend (`notification_app_be`)

### Main Files
- `server.js` – sets up Express, loads `.env`, registers the logging middleware, and defines the two API routes.
- `priorityInbox.js` – implements the min‑heap based **BoundedPriorityQueue** and helper functions (`getTypeWeight`, `parseTimestamp`, `isHigherPriority`).
- `package.json` – declares `express`, `cors`, `dotenv` (and the logger as a module).

### How to Run
1. **Create an environment file** (copy the example):
   ```dotenv
   PORT=5000                # you can change this if the port is busy
   ACCESS_TOKEN=your_token   # token from the remote evaluation service
   ```
2. Install dependencies (once):
   ```powershell
   cd e:\2420366\notification_app_be
   npm install
   ```
3. Start the server (development mode with auto‑restart):
   ```powershell
   npm run dev
   ```
   The server will listen on `http://localhost:5000` (or the port you set). Every request is automatically logged via the middleware.

### API Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/notifications` | Accepts optional `limit`, `page`, `notification_type`. Returns raw data from the external service. |
| GET | `/api/notifications/priority` | Optional `n` (default 10) and `readIds` (comma‑separated). Returns the top‑N unread notifications sorted by type weight and recency. |

---

## 🌐 Frontend (`notification_app_fe`)

### Main Files
- `app/layout.js` – wraps the app with a custom Material‑UI **ClientThemeProvider** (dark mode) and the responsive `Header` component.
- `app/page.js` – **All Notifications** page (client component). Handles pagination, filtering, read‑status tracking, and renders each notification as a colour‑coded card.
- `app/priority/page.js` – **Priority Inbox** page. Calls `/api/notifications/priority`, displays the top‑N notifications, and lets the user mark them as read (stored in `localStorage`).
- `app/components/Header.js` – responsive AppBar with a drawer for mobile, a theme toggle button, and a badge showing the number of unread priority notifications.
- `app/components/ClientThemeProvider.js` – provides a dark‑mode Material‑UI theme (slate/indigo palette) and persists the chosen mode in `localStorage`.

### How to Run
1. **Copy the env example** (optional – only needed if you want to point the frontend to a different backend URL):
   ```dotenv
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
   Save this as `.env.local` in `e:\2420366\notification_app_fe`.
2. Install dependencies (once):
   ```powershell
   cd e:\2420366\notification_app_fe
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
   By default it will listen on **port 3000**. If that port is already in use, Next.js will automatically switch to the next free port (e.g., 3001) and print the new URL.
4. Open a browser to the printed URL (usually `http://localhost:3000`). You should see the **UniNotify** dashboard with a navigation bar, the **All Notifications** view, and a **Priority Inbox** link.

### UI Features
- **Dark‑mode** toggle (top‑right of the header).
- **Filter** dropdown – show *All*, *Placement*, *Result*, or *Event* notifications.
- **Pagination** controls at the bottom of the All Notifications page.
- **Read‑status** – clicking a card marks it as read; unread cards have a coloured left border and slightly higher opacity.
- **Priority Inbox** – automatically shows the highest‑priority unread items, with a badge indicating how many are still unread.

---

## 📋 Full Project Run‑through (Step‑by‑step)
1. **Clone / open the repository** (you already have the files on `E:\2420366`).
2. **Backend**:
   - `cd e:\2420366\notification_app_be`
   - `copy .env.example .env` and edit the `ACCESS_TOKEN` if you have a real token.
   - `npm install`
   - `npm run dev` (or `npm start` for production). The console should show `Running on http://localhost:5000`.
3. **Frontend**:
   - `cd e:\2420366\notification_app_fe`
   - `copy .env.example .env.local` (optional – just to be explicit about the backend URL).
   - `npm install`
   - `npm run dev`. Open the URL shown (usually `http://localhost:3000`).
4. **Interact**:
   - Visit **All Notifications** – you’ll see a list fetched from the backend.
   - Switch to **Priority Inbox** – the top‑N unread, high‑priority notifications appear.
   - Toggle the dark mode, filter by type, and mark items as read. All actions are logged by the backend; you can view the log file at `e:\2420366\logging_middleware\app.log`.

---

## 🔧 Environment Files

### Backend `.env` (example)
```dotenv
PORT=5000
ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # keep the token from the remote service
```

### Frontend `.env.local` (example)
```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Both files are ignored by Git (see `.gitignore`). Use the `.env.example` files as a template.

---

## 🧪 Testing the Logging Middleware
You can run the demo script to see the logger in isolation:
```powershell
cd e:\2420366\logging_middleware
node example.js
```
It will:
1. Log a few messages locally with colour output.
2. Start a tiny HTTP server on `http://localhost:3000` that logs each request.
3. Write all entries to `app.log`.

When the backend server is running, every incoming request (including API calls from the frontend) will automatically produce a log entry similar to:
```
[2026-06-03T09:14:57.542Z] [INFO] [server-init]: Server is listening on port 5000
[2026-06-03T09:15:07.560Z] [INFO] [api-gateway]: GET /api/notifications - Status: 200 - 12ms
```

---

## 🛠️ Troubleshooting Common Issues
| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| `EADDRINUSE` on port 5000 (backend) or 3000 (frontend) | Another process is already bound to that port (maybe a previous `npm run dev`). | Run `netstat -ano | findstr :5000` (or `:3000`), then `taskkill /PID <PID> /F`. Or change the port in the `.env` file. |
| Frontend cannot reach backend (CORS or 404) | `NEXT_PUBLIC_BACKEND_URL` not set or mismatched port. | Verify the `.env.local` value matches the backend URL and port. |
| Logs are not appearing in `app.log` | File permission issues or `logging_middleware` directory missing. | Ensure the directory exists and your user has write permission. |
| Material‑UI icons fail to import (`module not found`) | Incorrect import path after version change. | Use **path imports** (e.g., `import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';`). All icons have been updated in the codebase. |

---

## 📄 License & Credits
- This project is **MIT‑licensed** – feel free to reuse, modify, or distribute.
- Logging middleware was inspired by classic Node.js logger patterns and adapted for the remote evaluation service.
- UI components are built with **Material‑UI v9** and follow a dark‑mode, premium aesthetic.

---

**Happy coding!** If you have any questions about the logger, the priority queue, or deployment, just let me know.

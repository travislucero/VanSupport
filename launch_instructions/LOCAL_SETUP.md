# VanSupport - Local Setup Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (included with Node.js)
- A **Supabase** project (PostgreSQL database)
- Optional: **Azure Blob Storage** account (for file uploads)
- Optional: **OpenAI API** key (for AI-powered sequence generation)

---

## 1. Install Dependencies

Open a terminal in the project root and run:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd dashboard
npm install
cd ..
```

---

## 2. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# --- REQUIRED (server will not start without these) ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=a-strong-random-secret-string

# --- SERVER ---
PORT=3000
NODE_ENV=development

# --- OPTIONAL ---
OPENAI_API_KEY=sk-your-openai-key
AZURE_STORAGE_ACCOUNT_NAME=your-azure-account
AZURE_STORAGE_SAS_TOKEN=your-sas-token
N8N_COMMENT_NOTIFICATION_WEBHOOK=https://your-n8n-webhook-url

# --- REQUIRED IN PRODUCTION ONLY ---
# CLIENT_URL=https://your-production-domain.com
```

The server validates required variables at startup and will exit with a clear error message if any are missing.

---

## 3. Set Up the Database

Run the SQL migration files in your Supabase SQL Editor (Dashboard > SQL Editor) in this order:

1. `database/migrations/add_sequence_type_to_context.sql`
2. `database/migrations/setup_agentic_sms_routing.sql`
3. `database/migrations/setup_agentic_sequence_functions.sql`
4. `database/migrations/seed_onboarding_sequence.sql`

These create the necessary tables, functions, indexes, and seed data.

---

## 4. Start the Backend Server

```bash
npm start
```

The Express server starts on **http://localhost:3000**. You should see:

```
Server running on http://localhost:3000
```

If you see a `FATAL:` message, check that your `.env` variables are set correctly.

---

## 5. Start the Frontend Dev Server

Open a **second terminal** and run:

```bash
cd dashboard
npm run dev
```

The Vite dev server starts on **http://localhost:5173**. All `/api/*` requests are automatically proxied to the backend on port 3000.

---

## 6. Open the App

Go to **http://localhost:5173** in your browser.

You should see the login page. Use the credentials configured in your Supabase database.

---

## Quick Reference

| Component | URL | Command |
|-----------|-----|---------|
| Backend API | http://localhost:3000 | `npm start` |
| Frontend | http://localhost:5173 | `cd dashboard && npm run dev` |
| Supabase Dashboard | https://supabase.com/dashboard | (browser) |

---

## Building for Production

To create a production build of the frontend:

```bash
cd dashboard
npm run build
```

Output goes to `dashboard/dist/`. The Express server serves these static files automatically when `NODE_ENV=production`.

For production deployment, set `NODE_ENV=production` and `CLIENT_URL` to your domain in the environment.

---

## Troubleshooting

**Server exits immediately with "FATAL: ..."**
One or more required environment variables are missing. Check your `.env` file against the list in step 2.

**Frontend shows a blank page or network errors**
Make sure the backend server is running on port 3000. The Vite dev server proxies API calls to that port.

**File uploads fail**
Azure Blob Storage credentials (`AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_SAS_TOKEN`) are required for file uploads. Without them, the server starts but uploads will fail.

**AI sequence generation doesn't work**
The `OPENAI_API_KEY` environment variable is needed for the ticket-to-sequence AI feature. The rest of the app works without it.

**Database errors on startup**
Ensure all migration files from step 3 have been run in your Supabase project.

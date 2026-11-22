# Deploying Smriti (free tiers)

Three pieces: **MongoDB Atlas** (database) → **Render** (Express API) → **Vercel** (React app).

## 1. MongoDB Atlas

1. Sign in at https://cloud.mongodb.com and create a free **M0** cluster.
2. **Database Access** → add a database user with a password.
3. **Network Access** → *Allow access from anywhere* (`0.0.0.0/0`). Render's free plan has no fixed outbound IP.
4. **Connect → Drivers** → copy the connection string and add the database name `smriti`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smriti?retryWrites=true&w=majority`

## 2. Render (backend)

The service `smriti-api` already exists: https://dashboard.render.com/web/srv-dc1fq8ff3r2c73cjucj0
(build `cd backend && npm ci`, start `cd backend && npm start`, auto-deploys every push to `main`).

Open **Environment** and add:

| Key | Value |
|---|---|
| `MONGO_URI` | the Atlas string from step 1 |
| `JWT_SECRET` | any long random text |
| `GEMINI_API_KEY` | key from https://aistudio.google.com/apikey (optional; without it the chat uses offline replies) |
| `TZ` | `Asia/Kolkata` (already set) |
| `DEMO_SEED` | `daily` (already set): seeds the demo accounts on the empty database and refreshes "today's" reminders each day. **It wipes the database**, so keep it only on a demo database. |
| `NODE_ENV` | `production` (already set) |

Save; Render redeploys. In **Logs** you should see `✅ [Demo Seed] Demo data ready`.
Check: https://smriti-api-9lj6.onrender.com/ returns `{"status":"ok",…,"database":"connected"}`.

To create the service again from scratch: *New → Blueprint* on this repository uses `render.yaml`.

## 3. Vercel (frontend)

Already deployed: project `smriti-mini-project` → https://smriti-mini-project.vercel.app (also https://smriti-tamanna.vercel.app). `VITE_API_URL` is set and Vercel Authentication protects preview deployments only, so the production URL is public. To set it up again from scratch:


1. https://vercel.com/new → import `Tamanna-57/smriti`.
2. Leave **Root Directory** as the repository root: the root `vercel.json` runs
   `cd frontend && npm install && npm run build` and serves `frontend/dist` with SPA rewrites.
3. **Environment Variables** → `VITE_API_URL` = `https://smriti-api-9lj6.onrender.com/api`
   (Vite reads it at build time, so set it before the first deploy, or redeploy after adding it).
4. Deploy, then open the `*.vercel.app` URL in a private window and log in as `Ramesh Sharma` / `1234`.
5. Make sure **Deployment Protection** (Settings → Deployment Protection) does not require Vercel login for the production URL, so evaluators can open it.

## Notes

- Render free services sleep after 15 minutes idle; the first request then takes about 50 seconds. `server.js` pings itself every 14 minutes while running.
- If the backend is asleep or unreachable, the frontend logs the demo patients in with built-in offline demo data, so the evaluator still sees the app; a wrong PIN is still rejected whenever the server answers.

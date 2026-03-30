# BHS Memory Server — Claude Code Handoff Prompt

Paste this entire prompt into Claude in VS Code (or Claude Code in terminal) after opening the `bhs-memory-server` folder.

---

## PROMPT TO PASTE:

I have a Node.js webhook server that needs to be initialized as a GitHub repo and deployed to Railway. All the files are already written and ready. Here's exactly what I need you to do:

**Project:** `bhs-memory-server`
**Purpose:** Caller memory backend for a Retell AI voice agent. Two endpoints — pre-call lookup injects caller history as dynamic variables, post-call write saves caller data to SQLite.

**Files already in this folder:**
- `server.js` — Express server with `/inbound` and `/webhook` endpoints
- `db.js` — SQLite database layer using better-sqlite3
- `package.json` — dependencies: express, better-sqlite3, retell-sdk
- `.env.example` — environment variable template
- `.gitignore` — excludes node_modules, .env, callers.db
- `README.md` — deployment instructions
- `william-preprompt-updated.txt` — updated voice agent system prompt (not deployed, used separately)

**What I need you to do, in order:**

1. Run `npm install` to install dependencies
2. Initialize a git repo in this folder (`git init`)
3. Create an initial commit with all files
4. Create a new GitHub repo called `bhs-memory-server` (public or private, your call — private is fine)
5. Push to GitHub
6. Open https://railway.app in the browser and walk me through connecting this repo as a new Railway project
7. Remind me to add the `RETELL_API_KEY` environment variable in Railway
8. Remind me to add a persistent volume mounted at `/data` and set `DB_PATH=/data/callers.db`
9. Once deployed, give me the Railway public URL so I can configure it in two places in Retell:
   - **Phone Number → Inbound Webhook URL:** `https://YOUR-URL/inbound`
   - **William Agent → Webhook URL:** `https://YOUR-URL/webhook` (events: call_analyzed)
10. Finally, remind me to replace William's current system prompt in the Retell dashboard with the contents of `william-preprompt-updated.txt`

Ask me for my GitHub username if you need it. I have git installed. Let's go.

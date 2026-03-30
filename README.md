# BHS Memory Server

Caller memory backend for Beard's Home Services — William voice agent.

Two endpoints:
- `POST /inbound` — Pre-call lookup. Retell fires this before connecting. Returns caller history as dynamic variables.
- `POST /webhook` — Post-call write. Retell fires this after `call_analyzed`. Saves/updates the caller record.

---

## Deploy to Railway (5 minutes)

### 1. Push this folder to GitHub
Create a new repo called `bhs-memory-server` and push this folder to it.

### 2. Create a Railway project
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `bhs-memory-server`
4. Railway will detect Node.js and deploy automatically

### 3. Add environment variable
In Railway → your service → **Variables**:
```
RETELL_API_KEY = your_retell_api_key_here
```

### 4. Add a persistent volume (keeps your database across deploys)
In Railway → your service → **Volumes**:
- Mount path: `/data`
- Then add variable: `DB_PATH = /data/callers.db`

### 5. Get your public URL
Railway assigns a URL like `https://bhs-memory-server-production.up.railway.app`
Copy it — you'll use it in the next two steps.

---

## Configure Retell

### Pre-call (inbound) webhook
1. Go to Retell dashboard → **Phone Numbers**
2. Click your phone number
3. Set **Inbound Webhook URL** to: `https://YOUR-RAILWAY-URL/inbound`
4. Save

### Post-call webhook
1. Go to Retell dashboard → your **William** agent → **Settings**
2. Set **Webhook URL** to: `https://YOUR-RAILWAY-URL/webhook`
3. Make sure **Webhook Events** includes `call_analyzed`
4. Save

---

## Update William's Prompt

Replace the current system prompt in Retell with the contents of `william-preprompt-updated.txt`.

The key additions are at the top — the `{{returning_caller}}` and `{{caller_context}}` dynamic variable blocks that the inbound webhook injects.

---

## Test It

1. Call the Retell number from a cell phone
2. Have a full conversation (give your name, describe a job, give a callback number)
3. Wait 60–90 seconds after hanging up for `call_analyzed` to fire
4. Call again from the same number
5. William should greet you by name and skip asking for your info

**Check stored records:** `GET https://YOUR-RAILWAY-URL/callers`

---

## Local Dev

```bash
npm install
cp .env.example .env
# Fill in RETELL_API_KEY in .env
npm run dev
# Use ngrok to expose localhost:3000 for Retell webhook testing
```

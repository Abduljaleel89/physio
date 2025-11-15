# 🔴 URGENT FIX: Root Directory Not Set

## Current Error
```
Command "cd frontend && npm install" exited with 1
```

## Root Cause
**Root Directory is NOT set in your Vercel project dashboard.**

When root directory is NOT set, Vercel runs commands from the repo root and tries to `cd frontend`, which fails.

## ✅ CRITICAL FIX - Do This NOW

### For Project: `physio1` (or whichever project is failing)

1. **Go to Vercel Dashboard:**
   - Click on your project: `physio1` (or the failing project)

2. **Go to Settings:**
   - Click **"Settings"** tab at the top
   - Click **"General"** in the left sidebar

3. **Set Root Directory:**
   - Scroll down to find **"Root Directory"** section
   - You'll see a field that's probably empty or has `/` or `.`
   - **Type:** `frontend` (without quotes, just the word)
   - Click **"Save"** button

4. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** button on the latest deployment
   - OR wait for auto-deploy (usually happens immediately after saving settings)

## Expected Behavior After Fix

**Before (Wrong):**
- Root Directory: Not set or `/`
- Vercel runs: `cd frontend && npm install` ❌ Fails

**After (Correct):**
- Root Directory: `frontend`
- Vercel runs: `npm install` (already in frontend directory) ✅ Works

## Why This Happens

- When Root Directory = `frontend`, Vercel changes to that directory BEFORE running any commands
- So it runs: `npm install` (already in `frontend/`)
- NOT: `cd frontend && npm install`

## Multiple Projects Issue

You have multiple projects: `physio1`, `physio-oq62`, `physio-i999`, etc.

**⚠️ IMPORTANT:** You need to set Root Directory = `frontend` in **EACH project** settings!

---

## Quick Checklist

- [ ] Open project in Vercel
- [ ] Go to Settings → General
- [ ] Set Root Directory = `frontend`
- [ ] Click Save
- [ ] Go to Deployments tab
- [ ] Click Redeploy
- [ ] Wait for build to succeed

---

## If It Still Fails

Check the build logs to see the exact error message. Common issues:
- Missing `package.json` in `frontend/` (but we verified it exists)
- Missing dependencies
- Build script failing

Share the full build log error if it persists.


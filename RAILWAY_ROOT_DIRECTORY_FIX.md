# 🔴 CRITICAL: Set Root Directory in Railway Dashboard

## Current Error
```
Railpack could not determine how to build the app
Script start.sh not found
Only detecting: Php
```

## Root Cause
**Railway is building from the repository root, NOT from the `backend/` directory.**

Railway needs to know the root directory is `backend` **in the dashboard settings**.

## ✅ MANDATORY FIX - Do This Now

### Step-by-Step:

1. **Go to Railway Dashboard**
   - You're on the service page for `physio`

2. **Click "Settings" tab**
   - Top navigation bar, next to "Architecture", "Observability", "Logs"

3. **Scroll down to "Source" section**
   - Or look for "Repository" or "Source Code" settings

4. **Find "Root Directory" field**
   - It might be empty or show `.` or `/`
   - **Type exactly:** `backend`
   - (No leading slash, just the word `backend`)

5. **Click "Save" or "Update"**
   - Railway will ask you to confirm/redeploy

6. **Go to "Deployments" tab**

7. **Click "Redeploy" or "Deploy"**
   - Railway will now build from `backend/` directory
   - It should detect Node.js automatically

## What Should Happen After Fix

### ✅ Before (Wrong - Current):
- Railway scans repo root
- Finds no Node.js files in root
- Only detects: Php
- Error: Cannot build

### ✅ After (Correct):
- Railway scans `backend/` directory
- Finds `backend/package.json`
- Detects: Node.js
- Builds successfully

## Verify It's Set Correctly

After setting Root Directory:
- Railway should show "Root Directory: backend" in Settings
- Build logs should show Node.js detection
- Should see: "Detected Node.js" or similar
- Build should proceed with npm commands

## If You Can't Find Root Directory Setting

**Try these locations:**

1. **Settings → Source → Root Directory**
2. **Settings → Repository → Root Directory**
3. **Service Settings → Source → Root Directory**
4. **Click on service name → Configure → Root Directory**

**Alternative if still can't find:**
- Delete the service and recreate it
- When creating new service, select repo
- **On the configuration page BEFORE deploying**, you should see "Root Directory" option
- Set it to `backend` there
- Then deploy

## After Root Directory is Set

Once Railway detects Node.js:
1. Build should complete successfully
2. Set environment variables:
   - `DATABASE_URL` (from PostgreSQL service)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `FRONTEND_URL`
3. Deploy should succeed
4. Get Railway URL
5. Update frontend in Vercel

---

## Important Notes

- ✅ Code files are correct (`railway.json`, `nixpacks.toml`, `Procfile` all added)
- ❌ **Dashboard setting is missing** - Root Directory must be set in Railway UI
- 🔄 After setting, Railway will detect Node.js automatically

**The fix MUST be done in the Railway dashboard - it can't be fixed with code alone!**


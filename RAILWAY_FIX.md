# Railway Deployment Fix

## Current Error
```
Error creating build plan with Railpack
```

## Problem
Railway doesn't know that the root directory is `backend`. It's trying to build from the repository root instead of the `backend/` directory.

## Solution: Set Root Directory in Railway Dashboard

### Step-by-Step Fix:

1. **Go to Railway Dashboard**
   - You're already on the service page

2. **Click on "Settings" tab**
   - It's next to "Deployments", "Variables", "Metrics"

3. **Find "Source" section**
   - Scroll down in Settings
   - Look for "Source" or "Repository" section

4. **Set Root Directory**
   - Find "Root Directory" field
   - **Type exactly:** `backend`
   - Click **"Save"** or **"Update"**

5. **Redeploy**
   - Go to "Deployments" tab
   - Click **"Deploy"** or **"Redeploy"**
   - Railway will now build from the `backend/` directory

## Alternative: Check Service Settings

If you can't find Root Directory in Settings:

1. **Click on your service name** "physio" (in the sidebar)
2. **Or go to project level** and click on the service
3. **Look for configuration options**
4. **Find "Source" or "Root Directory" setting**

## Verify Settings

After setting Root Directory:
- Railway should detect it's a Node.js app
- It should find `backend/package.json`
- Build should proceed with correct commands

## If Still Failing

Check the build logs for specific errors:
1. Go to "Deployments" tab
2. Click on the failed deployment
3. Click "View logs"
4. Look for specific error messages
5. Share the error and I'll help fix it

## Common Issues After Setting Root Directory

### Issue 1: Missing Prisma Client
**Error:** `Cannot find module '@prisma/client'`

**Fix:** Add to Railway environment variables:
- `PRISMA_GENERATE_DATAPROXY` = `false` (optional)

Or ensure `npx prisma generate` runs in build command (already in railway.json)

### Issue 2: Database Connection
**Error:** Database connection fails

**Fix:** 
1. Add PostgreSQL database to your project
2. Railway will auto-add `DATABASE_URL` variable
3. Verify it's set in service → Variables tab

### Issue 3: Port Issues
**Error:** Port not found

**Fix:** Railway auto-assigns port via `PORT` env var (we use `process.env.PORT` in code, so it should work)

---

## Quick Checklist

- [ ] Root Directory set to `backend` in Railway service settings
- [ ] PostgreSQL database added to project
- [ ] Environment variables set:
  - [ ] `DATABASE_URL` (auto-added by Railway)
  - [ ] `JWT_SECRET` (generate with: `openssl rand -hex 32`)
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL` (your Vercel URL)
- [ ] Redeploy service
- [ ] Check build logs for errors

---

## After Successful Deployment

1. **Get your Railway URL**
   - Railway provides a URL like: `https://physio-production.up.railway.app`
   - Or click "Settings" → "Networking" → "Generate Domain"

2. **Update Frontend**
   - Go to Vercel → Your frontend project
   - Settings → Environment Variables
   - Set `NEXT_PUBLIC_API_BASE` = `https://your-railway-url.railway.app/api`
   - Redeploy frontend

3. **Run Migrations**
   - Railway CLI: `railway run npx prisma migrate deploy`
   - Or add a post-deploy script in Railway settings

4. **Test Connection**
   - Visit backend URL: `https://your-railway-url.railway.app/`
   - Should see: `{"status":"Backend running","time":"..."}`


# Fix Vercel 404 Error

## Problem
Vercel is showing a 404 error. This usually happens when:
1. Root directory is not set to `frontend`
2. Build failed or incomplete
3. Next.js configuration issue

## Solution

### Step 1: Check Vercel Project Settings

1. Go to https://vercel.com/dashboard
2. Click on your `physio` project
3. Go to **Settings** tab
4. Check **General** section:
   - **Root Directory**: Should be `frontend` ⚠️
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (or auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### Step 2: Update Root Directory (IMPORTANT!)

If Root Directory is NOT set to `frontend`:

1. Go to Project Settings → General
2. Click **Edit** next to Root Directory
3. Enter: `frontend`
4. Click **Save**
5. Vercel will automatically redeploy

### Step 3: Verify Environment Variables

1. Go to Settings → Environment Variables
2. Ensure `NEXT_PUBLIC_API_BASE` is set
3. Value should be your backend URL: `https://your-backend.railway.app/api`

### Step 4: Check Build Logs

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for any errors
4. Look for:
   - ✅ "Build Successful"
   - ❌ Any error messages

### Step 5: Force Redeploy

1. Go to **Deployments** tab
2. Click the "..." menu on latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger redeploy

## Common Issues

### Issue 1: Root Directory Wrong
**Symptom**: 404 error, build shows wrong directory
**Fix**: Set Root Directory to `frontend` in Vercel settings

### Issue 2: Build Failed
**Symptom**: Build logs show errors
**Fix**: Check build logs, fix TypeScript errors, ensure all dependencies are in package.json

### Issue 3: Missing Environment Variables
**Symptom**: App loads but API calls fail
**Fix**: Add `NEXT_PUBLIC_API_BASE` environment variable

### Issue 4: Next.js Configuration
**Symptom**: Build succeeds but routes don't work
**Fix**: Ensure `next.config.js` is correct, check `pages/_app.tsx` exists

## Quick Fix Steps

1. ✅ Verify Root Directory = `frontend`
2. ✅ Check latest deployment build logs
3. ✅ Ensure environment variables are set
4. ✅ Redeploy if needed

## If Still Having Issues

Check these files exist in your GitHub repo:
- ✅ `frontend/pages/index.tsx`
- ✅ `frontend/pages/_app.tsx`
- ✅ `frontend/package.json`
- ✅ `frontend/next.config.js`

If files are missing, verify they're pushed to GitHub and redeploy.


# Quick Fix: Network Error on Mobile/Production

## Problem
Login works on desktop but shows "Network Error" on mobile. This is because the frontend is trying to connect to `localhost:4000` instead of your production backend.

## Immediate Fix (5 minutes)

### Step 1: Get Your Render Backend URL
1. Go to https://dashboard.render.com
2. Click on your **physio-backend** service
3. Copy the URL shown at the top (e.g., `https://physio-backend-xxxx.onrender.com`)
4. **Important:** Copy WITHOUT `/api` at the end

### Step 2: Set Environment Variable in Vercel
1. Go to https://vercel.com/dashboard
2. Select your **physio** project
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key:** `NEXT_PUBLIC_API_BASE`
   - **Value:** Your Render backend URL (e.g., `https://physio-backend-xxxx.onrender.com`)
   - **Environment:** Select **Production**, **Preview**, and **Development**
6. Click **Save**

### Step 3: Redeploy Vercel
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 4: Update Render CORS (if needed)
1. Go to your Render backend service
2. Click **Environment** tab
3. Add/Update:
   - **Key:** `FRONTEND_URL`
   - **Value:** Your Vercel frontend URL (e.g., `https://your-project.vercel.app`)
4. Save and wait for auto-redeploy

## Verify It's Fixed

1. Open your Vercel frontend URL on mobile
2. Open browser console (if possible) or check Network tab
3. Try to login
4. Check that API calls go to your Render URL (not localhost)

## Still Not Working?

### Check Browser Console
Look for these errors:
- `Failed to fetch` → CORS or network issue
- `localhost:4000` in network requests → Environment variable not set
- `CORS blocked origin` → Backend CORS configuration

### Common Issues

**Issue:** Still seeing localhost in network requests
- **Fix:** Make sure you redeployed Vercel after setting the environment variable
- **Fix:** Clear browser cache and hard refresh

**Issue:** CORS errors
- **Fix:** Add your exact Vercel URL to Render's `FRONTEND_URL` environment variable
- **Fix:** The regex `/^https:\/\/.*\.vercel\.app$/` should match most Vercel URLs automatically

**Issue:** Works on desktop but not mobile
- **Fix:** Mobile browsers may cache more aggressively - try incognito/private mode
- **Fix:** Check if mobile browser is blocking mixed content (HTTP/HTTPS)

## Example Values

### Vercel Environment Variable
```
NEXT_PUBLIC_API_BASE=https://physio-backend-xxxx.onrender.com
```

### Render Environment Variable
```
FRONTEND_URL=https://your-project.vercel.app
```

## Need Help?

Check the browser console (F12) for specific error messages and share them for further debugging.


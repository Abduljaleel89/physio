# Vercel Environment Variables Setup

## Issue: Network Error on Mobile/Production

The frontend is trying to connect to `localhost:4000` instead of your production backend URL.

## Solution: Set Environment Variables on Vercel

### Step 1: Get Your Render Backend URL

1. Go to your Render dashboard: https://dashboard.render.com
2. Open your **physio-backend** service
3. Find the **URL** (e.g., `https://physio-backend-xxxx.onrender.com`)
4. Copy this URL (without `/api` at the end)

### Step 2: Set Environment Variable on Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **physio** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:

   **Variable Name:** `NEXT_PUBLIC_API_BASE`
   
   **Value:** Your Render backend URL (e.g., `https://physio-backend-xxxx.onrender.com`)
   
   **Environment:** Select all (Production, Preview, Development)
   
6. Click **Save**

### Step 3: Update Render Backend CORS

1. Go to your Render backend service
2. Go to **Environment** tab
3. Add/Update these environment variables:

   **Variable Name:** `FRONTEND_URL`
   
   **Value:** Your Vercel frontend URL (e.g., `https://your-project.vercel.app`)
   
   **Variable Name:** `NODE_ENV`
   
   **Value:** `production`

### Step 4: Redeploy Both Services

1. **Vercel:** After adding the environment variable, Vercel will automatically redeploy
   - Or manually trigger: Go to **Deployments** → Click **Redeploy**

2. **Render:** After updating environment variables, Render will automatically redeploy
   - Or manually trigger: Go to **Manual Deploy** → **Deploy latest commit**

### Step 5: Verify

1. Check browser console (F12) on your Vercel frontend
2. Look for any CORS errors or network errors
3. Try logging in with admin credentials
4. Check Render logs for any CORS warnings

## Troubleshooting

### Error: "Network Error" or "Failed to fetch"

**Cause:** `NEXT_PUBLIC_API_BASE` not set or incorrect

**Solution:**
- Verify the environment variable is set in Vercel
- Make sure it's set for the correct environment (Production)
- The value should be your Render backend URL (without `/api`)
- Redeploy after setting the variable

### Error: "CORS blocked origin"

**Cause:** Backend CORS not allowing your Vercel domain

**Solution:**
- Add your Vercel URL to Render's `FRONTEND_URL` environment variable
- Or update the CORS configuration in `backend/src/index.ts` to include your exact Vercel URL
- The regex pattern `/^https:\/\/.*\.vercel\.app$/` should match most Vercel URLs

### Error: "Connection refused" or "ECONNREFUSED"

**Cause:** Backend URL is incorrect or backend is down

**Solution:**
- Verify your Render backend is running (check Render dashboard)
- Verify the URL in `NEXT_PUBLIC_API_BASE` is correct
- Make sure the URL doesn't have `/api` at the end (it's added automatically)

### Mobile vs Desktop Difference

**Cause:** Mobile browsers may have stricter CORS or network policies

**Solution:**
- Ensure CORS is properly configured
- Check that `credentials: true` is set in CORS config
- Verify HTTPS is used (not HTTP) for production
- Check mobile browser console if possible

## Quick Checklist

- [ ] `NEXT_PUBLIC_API_BASE` set in Vercel to Render backend URL
- [ ] `FRONTEND_URL` set in Render to Vercel frontend URL
- [ ] `NODE_ENV=production` set in Render
- [ ] Both services redeployed after environment variable changes
- [ ] Backend CORS allows your Vercel domain
- [ ] Using HTTPS URLs (not HTTP) in production

## Example Environment Variables

### Vercel (Frontend)
```
NEXT_PUBLIC_API_BASE=https://physio-backend-xxxx.onrender.com
```

### Render (Backend)
```
FRONTEND_URL=https://your-project.vercel.app
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

## Testing

After setup, test by:
1. Opening your Vercel frontend URL
2. Opening browser console (F12)
3. Check Network tab for API calls
4. Verify API calls go to your Render backend URL (not localhost)
5. Try logging in with admin credentials

If you see API calls going to `localhost:4000`, the environment variable is not set correctly.


# Render Deployment - Next Steps

## ✅ Current Status
- ✅ Blueprint synced successfully
- ✅ Build and start commands updated
- ✅ Configuration is correct

## 📋 Next Steps Checklist

### Step 1: Check Service Status
1. In Render dashboard, click on "physio" blueprint
2. Click "Resources" tab (left sidebar)
3. Find "physio-backend" service
4. Check if it's building/deploying or if there are errors

### Step 2: Add PostgreSQL Database
1. In Render dashboard, click **"+ New"** (top right)
2. Select **"PostgreSQL"**
3. Configure:
   - **Name:** `physio-db`
   - **Plan:** `Free` (or paid if you prefer)
   - **Region:** Same as your service
4. Click **"Create Database"**
5. **Copy the "Internal Database URL"** (you'll need this)

### Step 3: Set Environment Variables
1. Go to your **"physio-backend"** service
2. Click **"Environment"** tab (or "Settings" → "Environment")
3. Add these variables:

   **Required:**
   ```
   DATABASE_URL=<paste_internal_database_url_from_step_2>
   JWT_SECRET=<generate_with_command_below>
   NODE_ENV=production
   FRONTEND_URL=https://physio-3s3a.vercel.app
   PUBLIC_BASE_URL=https://physio-backend.onrender.com
   ```

   **Generate JWT Secret (PowerShell):**
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   Copy the output and use it as `JWT_SECRET` value.

### Step 4: Redeploy Service
1. After setting environment variables
2. Go to "Manual Deploy" section (or "Events" tab)
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Watch the build logs

### Step 5: Run Database Migrations
After deployment succeeds:
1. Go to your service → **"Shell"** tab
2. Run:
   ```
   npx prisma migrate deploy
   ```
3. Or run locally:
   ```bash
   DATABASE_URL=<your_db_url> npx prisma migrate deploy
   ```

### Step 6: Verify Backend is Running
1. Get your service URL from Render dashboard
   - Should be: `https://physio-backend.onrender.com`
2. Test health endpoint:
   - Visit: `https://physio-backend.onrender.com/`
   - Should see: `{"status":"Backend running","time":"..."}`
3. Test API:
   - Visit: `https://physio-backend.onrender.com/api/auth/me`
   - Should get authentication error (expected - not logged in)

### Step 7: Update Frontend in Vercel
1. Go to Vercel dashboard
2. Select your frontend project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   NEXT_PUBLIC_API_BASE=https://physio-backend.onrender.com/api
   ```
5. **Save** and **Redeploy** frontend

### Step 8: Test Full Stack
1. Go to your Vercel frontend URL
2. Try logging in (use seeded account: `admin@physio.com` / `password123`)
3. Should connect to Render backend successfully!

---

## Common Issues & Fixes

### Issue: Build Still Fails
- Check build logs in service → "Logs" tab
- Look for specific error messages
- Share error and I'll help fix it

### Issue: Service Won't Start
- Check if `DATABASE_URL` is set correctly
- Verify `JWT_SECRET` is set
- Check "Events" tab for startup errors

### Issue: Database Connection Fails
- Verify `DATABASE_URL` is correct (Internal Database URL)
- Make sure database is running (check Render dashboard)
- Run migrations: `npx prisma migrate deploy`

### Issue: CORS Errors
- Verify `FRONTEND_URL` matches your Vercel URL exactly
- Check backend logs for CORS warnings
- Make sure frontend `NEXT_PUBLIC_API_BASE` is set correctly

---

## Quick Status Check

After completing steps:

✅ **Backend URL:** `https://physio-backend.onrender.com`  
✅ **Health Check:** Visit `/` - should return JSON  
✅ **Database:** Migrations run successfully  
✅ **Frontend:** Connected to backend  
✅ **Login:** Works from frontend  

---

## Current Priority

1. **Check service status** (Step 1)
2. **Add PostgreSQL database** (Step 2)
3. **Set environment variables** (Step 3)
4. **Redeploy and verify** (Steps 4-6)
5. **Connect frontend** (Steps 7-8)

Start with Step 1 - check if the service is already deploying or if there are errors!


# Render Deployment - Quick Setup Guide

## ✅ Fixed: render.yaml Now at Root

I've created `render.yaml` at the repository root with `rootDir: backend` configured.

## Next Steps:

### 1. Go Back to Render Dashboard
- You're on the "New Blueprint" page
- Click **"Retry"** button
- Render should now find `render.yaml` on the `main` branch

### 2. Review Blueprint Configuration
- **Blueprint Name:** `physio` (or change if you want)
- **Branch:** `main`
- Click **"Apply"** or **"Create Blueprint"**

### 3. Render Will Create:
- ✅ Web Service (backend)
- ✅ PostgreSQL Database (you'll need to add this)
- ✅ All environment variables from `render.yaml`

### 4. Add PostgreSQL Database
After blueprint is created:
1. Go to your Render dashboard
2. Click **"New"** → **"PostgreSQL"**
3. Name: `physio-db`
4. Plan: `Free`
5. Click **"Create Database"**
6. Copy the **"Internal Database URL"**

### 5. Set Environment Variables
1. Go to your Web Service → **"Environment"** tab
2. Add/Update these variables:

```
DATABASE_URL=<paste_internal_database_url_from_step_4>
JWT_SECRET=<generate_with: openssl rand -hex 32>
FRONTEND_URL=https://physio-3s3a.vercel.app
PUBLIC_BASE_URL=https://physio-backend.onrender.com
```

**Generate JWT Secret (Windows PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Deploy
- Render will auto-deploy from your GitHub repo
- Watch the build logs
- Should build successfully from `backend/` directory

### 7. Run Migrations
After first deployment:
- Go to service → **"Shell"** tab
- Run: `npx prisma migrate deploy`
- Or run locally:
  ```bash
  DATABASE_URL=<your_db_url> npx prisma migrate deploy
  ```

### 8. Get Your Backend URL
- Render provides a URL like: `https://physio-backend.onrender.com`
- This is your backend API URL

### 9. Update Frontend in Vercel
1. Go to Vercel → Your frontend project
2. Settings → Environment Variables
3. Add/Update: `NEXT_PUBLIC_API_BASE` = `https://physio-backend.onrender.com/api`
4. Redeploy frontend

## ✅ What's Configured in render.yaml

- ✅ **Root Directory:** `backend` (Render will build from here)
- ✅ **Build Command:** `npm install && npm run build && npx prisma generate`
- ✅ **Start Command:** `npm start`
- ✅ **Plan:** Free tier
- ✅ **Environment:** Node.js
- ✅ **Health Check:** `/` endpoint

## Troubleshooting

### If Build Fails:
- Check build logs for specific errors
- Verify `backend/package.json` exists
- Ensure all dependencies are listed

### If Database Connection Fails:
- Verify `DATABASE_URL` is set correctly
- Check database is running in Render dashboard
- Run migrations: `npx prisma migrate deploy`

### If CORS Errors:
- Verify `FRONTEND_URL` is set correctly
- Make sure it matches your Vercel URL exactly
- Check backend logs for CORS warnings

---

## After Successful Deployment

1. **Test Backend:**
   - Visit: `https://physio-backend.onrender.com/`
   - Should see: `{"status":"Backend running","time":"..."}`

2. **Test API:**
   - Visit: `https://physio-backend.onrender.com/api/auth/me`
   - Should get authentication error (expected - not logged in)

3. **Test from Frontend:**
   - Try logging in from Vercel frontend
   - Should connect to Render backend successfully!

---

## Summary

✅ `render.yaml` is now at root with `rootDir: backend`  
✅ Click **"Retry"** in Render dashboard  
✅ Render will detect the config and deploy  
✅ Add PostgreSQL database  
✅ Set environment variables  
✅ Deploy and connect to frontend!  

**Render is much simpler - the Root Directory is clearly configured in the YAML file!**


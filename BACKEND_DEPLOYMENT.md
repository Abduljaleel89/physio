# Backend Deployment Guide

## Quick Deploy Options

You have two main options for deploying the backend:

1. **Railway** (Recommended - Easy, Free tier available)
2. **Render** (Alternative - Also free tier)

## Option 1: Deploy to Railway 🚂

### Prerequisites
- GitHub account (already connected)
- Railway account: https://railway.app

### Step-by-Step

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repo: `Abduljaleel89/physio`

3. **Configure Service**
   - Railway should auto-detect it's a Node.js app
   - **Root Directory**: Set to `backend` (important!)
   - Click "Deploy"

4. **Set Environment Variables**
   - Go to your service → "Variables" tab
   - Add these variables:

   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   JWT_SECRET=your_strong_random_secret_here
   NODE_ENV=production
   PORT=4000
   FRONTEND_URL=https://physio-3s3a.vercel.app
   PUBLIC_BASE_URL=https://your-backend-url.railway.app
   ```

5. **Add PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will create a database and add `DATABASE_URL` automatically

6. **Run Migrations**
   - Go to your service → "Deployments" tab
   - Click on the latest deployment
   - Open "Deploy Logs"
   - Or use Railway CLI:
     ```bash
     railway run npx prisma migrate deploy
     ```

7. **Seed Database (Optional)**
   - Railway CLI:
     ```bash
     railway run npm run prisma:seed
     ```

8. **Get Your Backend URL**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Update `FRONTEND_URL` and `PUBLIC_BASE_URL` in env vars

9. **Update Frontend**
   - Go to Vercel → Your frontend project
   - Settings → Environment Variables
   - Add/Update: `NEXT_PUBLIC_API_BASE` = `https://your-backend.railway.app/api`

---

## Option 2: Deploy to Render 🎨

### Step-by-Step

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repo: `Abduljaleel89/physio`

3. **Configure Service**
   - **Name**: `physio-backend`
   - **Environment**: Node
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Add PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name it: `physio-db`
   - Click "Create Database"
   - Copy the "Internal Database URL"

5. **Set Environment Variables**
   - In your Web Service → "Environment" tab
   - Add these variables:

   ```env
   DATABASE_URL=<paste_internal_database_url_from_step_4>
   JWT_SECRET=your_strong_random_secret_here
   NODE_ENV=production
   PORT=4000
   FRONTEND_URL=https://physio-3s3a.vercel.app
   PUBLIC_BASE_URL=https://your-backend-url.onrender.com
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

7. **Run Migrations**
   - After first deployment, go to "Shell" tab
   - Run: `npx prisma migrate deploy`
   - Or run locally with DATABASE_URL:
     ```bash
     DATABASE_URL=<your_db_url> npx prisma migrate deploy
     ```

8. **Update Frontend**
   - Go to Vercel → Your frontend project
   - Settings → Environment Variables
   - Add/Update: `NEXT_PUBLIC_API_BASE` = `https://your-backend.onrender.com/api`

---

## Required Environment Variables

### Must Have:
- `DATABASE_URL` - PostgreSQL connection string (provided by Railway/Render)
- `JWT_SECRET` - Strong random secret for JWT tokens (generate with: `openssl rand -hex 32`)
- `NODE_ENV=production`
- `PORT=4000` (or let platform auto-assign)

### Should Have:
- `FRONTEND_URL` - Your Vercel frontend URL (for CORS)
- `PUBLIC_BASE_URL` - Your backend public URL (for file uploads/links)

### Optional (Email):
- `SMTP_HOST` - SMTP server for production emails
- `SMTP_PORT` - SMTP port (usually 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_SECURE` - true/false (for TLS)
- `SMTP_FROM` - Email sender address

---

## Generate JWT Secret

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**On Mac/Linux:**
```bash
openssl rand -hex 32
```

**Or use:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## After Deployment

1. **Test Backend Health**
   - Visit: `https://your-backend.railway.app/` (or `.onrender.com`)
   - Should see: `{"status":"Backend running","time":"..."}`

2. **Test API**
   - Try: `https://your-backend.railway.app/api/auth/me`
   - Should get authentication error (that's expected)

3. **Update Frontend**
   - Set `NEXT_PUBLIC_API_BASE` in Vercel to your backend URL
   - Redeploy frontend

4. **Test Full Flow**
   - Try logging in from frontend
   - Should connect to backend successfully

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is running (Railway/Render dashboard)
- Ensure migrations ran: `npx prisma migrate deploy`

### CORS Errors
- Update `FRONTEND_URL` in backend env vars
- Check backend logs for CORS warnings
- Verify frontend URL matches exactly (with https://)

### Build Failures
- Check build logs for specific errors
- Ensure `backend/package.json` has all dependencies
- Verify `npm run build` works locally

### Port Issues
- Railway/Render auto-assigns port via `PORT` env var
- Don't hardcode port in code (use `process.env.PORT`)

---

## Quick Start Checklist

- [ ] Create Railway/Render account
- [ ] Create new project from GitHub repo
- [ ] Set Root Directory to `backend`
- [ ] Add PostgreSQL database
- [ ] Set environment variables (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Deploy service
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Get backend URL
- [ ] Update frontend `NEXT_PUBLIC_API_BASE` in Vercel
- [ ] Test connection from frontend

---

## Which Platform to Choose?

**Railway** ✅
- Easier setup
- Better free tier
- Faster deployments
- Recommended for this project

**Render**
- Also good free tier
- Auto-scales to zero on free tier
- Slightly slower cold starts

Either will work great! Choose based on preference.


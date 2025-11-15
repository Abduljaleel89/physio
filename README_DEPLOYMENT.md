# 🚀 Deployment to Vercel - Step by Step Guide

## Overview
- **Frontend**: Deploy to Vercel (Next.js)
- **Backend**: Deploy to Railway (Express.js) - Recommended
- **Database**: Use Neon PostgreSQL (Free tier available)

## Step 1: Prepare Repository (5 minutes)

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```

2. **Push to GitHub**:
   ```bash
   git push origin main
   ```

3. **Verify files are pushed**: Check your GitHub repository

## Step 2: Set Up Database - Neon (5 minutes)

1. Go to https://neon.tech
2. Sign up (free tier available)
3. Click "Create Project"
4. Choose:
   - Name: `physio-production`
   - Region: Choose closest to you
   - PostgreSQL version: 15
5. After creation, click "Connection Details"
6. Copy the connection string (looks like: `postgresql://user:pass@host/db`)
7. **Save this for Step 3**

## Step 3: Deploy Backend to Railway (10 minutes)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Select your `physio` repository
4. **Configure Service**:
   - Railway will detect the repo
   - Click on the service
   - Go to **Settings** tab
   - Set **Root Directory**: `backend`
   - Go back to **Variables** tab
5. **Add Environment Variables**:
   Click "New Variable" for each:
   - `DATABASE_URL` = `postgresql://...` (from Step 2)
   - `JWT_SECRET` = Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `NODE_ENV` = `production`
   - `PORT` = `4000` (Railway sets this automatically, but good to have)
6. **Deploy**:
   - Railway will auto-deploy when you push to GitHub
   - Or click "Deploy" button
   - Wait for deployment to complete (~2-3 minutes)
7. **Get Backend URL**:
   - After deployment, go to **Settings** > **Domains**
   - Copy the Railway-provided domain (e.g., `physio-backend.up.railway.app`)
   - **Save this URL** for Step 4
8. **Run Database Migrations**:
   - In Railway dashboard, click on your service
   - Click **"Deployments"** tab
   - Click the latest deployment
   - Click **"View Logs"** or use **"Connect"** button
   - Or use Railway CLI:
     ```bash
     # Install Railway CLI first
     npm i -g @railway/cli
     railway login
     railway link  # Link to your project
     railway run npx prisma migrate deploy
     railway run npx prisma generate
     railway run npm run prisma:seed  # Optional: seed data
     ```

## Step 4: Update Backend CORS (2 minutes)

1. **Edit** `backend/src/index.ts`
2. **Find** the `allowedOrigins` array
3. **Replace** `'https://your-app-name.vercel.app'` with your actual Vercel URL (you'll get this in Step 5)
4. **Or** add `FRONTEND_URL` environment variable in Railway with your Vercel URL
5. **Commit and push**:
   ```bash
   git add backend/src/index.ts
   git commit -m "Update CORS for production"
   git push
   ```

## Step 5: Deploy Frontend to Vercel (5 minutes)

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   - Follow prompts:
     - Set up and deploy? **Yes**
     - Which scope? Select your account
     - Link to existing project? **No**
     - Project name: `physio-platform` (or your choice)
     - Directory: `./`
     - Override settings? **No**

5. **Add Environment Variable**:
   ```bash
   vercel env add NEXT_PUBLIC_API_BASE production
   ```
   - When prompted, enter: `https://your-backend-url.railway.app/api`
   - Replace `your-backend-url.railway.app` with your actual Railway URL from Step 3

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

7. **Get Your Vercel URL**:
   - After deployment, Vercel will show your URL
   - Example: `https://physio-platform.vercel.app`
   - **Save this URL**

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. **Configure Project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: **`frontend`** (important!)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)
6. **Environment Variables**:
   - Click "Environment Variables"
   - Add:
     - Key: `NEXT_PUBLIC_API_BASE`
     - Value: `https://your-backend-url.railway.app/api`
     - Environment: Production, Preview, Development
7. Click **"Deploy"**
8. Wait for deployment (~2-3 minutes)
9. **Copy your Vercel URL** from the dashboard

## Step 6: Update Backend CORS with Vercel URL (2 minutes)

1. **Go back to Railway**
2. **Add Environment Variable**:
   - Variable: `FRONTEND_URL`
   - Value: `https://your-vercel-url.vercel.app`
3. **Redeploy backend** (or it will auto-redeploy)
4. **Or** update `backend/src/index.ts` directly:
   - Replace `'https://your-app-name.vercel.app'` with your actual Vercel URL
   - Commit and push

## Step 7: Test Production Deployment (5 minutes)

1. **Visit your Vercel URL**: `https://your-app.vercel.app`
2. **Test Login**:
   - Email: `admin@physio.com`
   - Password: `password123`
3. **Test Features**:
   - Create a user (Admin dashboard)
   - Create an exercise with video
   - View therapy plans
4. **Check Browser Console**: Look for any API errors

## Step 8: Set Up Custom Domain (Optional)

### Vercel:
1. Go to Vercel Dashboard > Project Settings > Domains
2. Add your custom domain
3. Follow DNS instructions

### Railway:
1. Go to Railway Dashboard > Settings > Domains
2. Add custom domain
3. Update CORS in backend with new domain

## 🔧 Troubleshooting

### Backend Issues

**Problem**: Backend won't start
- **Solution**: Check Railway logs, verify DATABASE_URL is correct

**Problem**: Database connection failed
- **Solution**: Check DATABASE_URL format, ensure database is accessible

**Problem**: Prisma errors
- **Solution**: Run migrations manually via Railway CLI or dashboard shell

### Frontend Issues

**Problem**: Can't connect to API
- **Solution**: Verify `NEXT_PUBLIC_API_BASE` is set correctly in Vercel

**Problem**: CORS errors
- **Solution**: Update backend CORS with your Vercel URL

**Problem**: Build fails
- **Solution**: Check Vercel build logs, ensure all dependencies are in package.json

### Database Issues

**Problem**: Migrations won't run
- **Solution**: Use Railway CLI: `railway run npx prisma migrate deploy`

## 📝 Quick Checklist

Before deploying:
- [ ] Code is committed and pushed to GitHub
- [ ] All environment variables are documented
- [ ] JWT_SECRET is generated and secure

Backend:
- [ ] Neon database created
- [ ] Railway project created
- [ ] Backend deployed to Railway
- [ ] Database migrations run
- [ ] Backend URL copied

Frontend:
- [ ] Vercel project created
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] Vercel URL copied

Final:
- [ ] Backend CORS updated with Vercel URL
- [ ] Test login works
- [ ] Test API calls work
- [ ] Test video upload works

## 🎯 Quick Commands Reference

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Railway CLI commands
railway login
railway link
railway run npx prisma migrate deploy
railway run npm run prisma:seed

# Vercel CLI commands
vercel login
vercel
vercel env add NEXT_PUBLIC_API_BASE production
vercel --prod
```

## 📚 Next Steps

After successful deployment:
1. Set up monitoring (Vercel Analytics, Railway Metrics)
2. Configure email service (if needed)
3. Set up automated backups for database
4. Consider cloud storage for videos (S3/Cloudinary)
5. Set up CI/CD pipelines

## 💡 Tips

- **Keep secrets safe**: Never commit `.env` files
- **Test locally first**: Always test with production-like setup locally
- **Monitor logs**: Check Railway and Vercel logs regularly
- **Backup database**: Set up regular backups for production database
- **File uploads**: Consider migrating to S3/Cloudinary for scalability


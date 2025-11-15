# Deployment Guide - Physio Platform

This guide covers deploying the Physio Platform to production.

## Architecture Overview

- **Frontend (Next.js)**: Deploy to Vercel ✅
- **Backend (Express + TypeScript)**: Deploy to Railway, Render, or Fly.io
- **Database (PostgreSQL)**: Use Neon, Supabase, or Railway PostgreSQL
- **File Storage**: Local storage (for production, consider S3/Cloudinary)

## Step 1: Set Up Cloud Database

### Option A: Neon (Recommended - Free tier available)
1. Go to https://neon.tech
2. Sign up and create a new project
3. Copy the connection string (DATABASE_URL)
4. Save it for backend deployment

### Option B: Supabase
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string

### Option C: Railway PostgreSQL
1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Copy the DATABASE_URL

## Step 2: Deploy Backend

### Option A: Railway (Recommended)
1. Go to https://railway.app
2. Sign up/login
3. Click "New Project" > "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your repository
6. Set root directory to `backend`
7. Add environment variables:
   ```
   DATABASE_URL=<your-database-url>
   JWT_SECRET=<generate-a-strong-random-secret>
   NODE_ENV=production
   PORT=4000
   PUBLIC_BASE_URL=https://your-backend-url.railway.app
   ```
8. Railway will auto-detect Node.js and deploy
9. After deployment, note the backend URL

**Important**: Run Prisma migrations after first deployment:
```bash
# SSH into Railway or use Railway CLI
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed  # Optional: seed initial data
```

### Option B: Render
1. Go to https://render.com
2. Create new "Web Service"
3. Connect GitHub repository
4. Set root directory to `backend`
5. Build command: `npm install && npm run build && npx prisma generate`
6. Start command: `npm start`
7. Add environment variables (same as Railway)
8. Deploy

### Option C: Fly.io
1. Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. In `backend` directory:
   ```bash
   fly launch
   ```
3. Follow prompts, set up app
4. Add secrets:
   ```bash
   fly secrets set DATABASE_URL=<your-database-url>
   fly secrets set JWT_SECRET=<your-secret>
   fly secrets set NODE_ENV=production
   ```
5. Deploy: `fly deploy`

## Step 3: Deploy Frontend to Vercel

### Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Have your backend URL ready

### Deploy via CLI
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. When prompted:
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - Project name: `physio-platform` (or your choice)
   - Directory: `./` (current directory)
   - Override settings? **No**

5. Set environment variable:
   ```bash
   vercel env add NEXT_PUBLIC_API_BASE production
   # Enter your backend URL: https://your-backend-url.com/api
   ```

6. Redeploy with environment variable:
   ```bash
   vercel --prod
   ```

### Deploy via Vercel Dashboard
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_BASE`
   - Value: `https://your-backend-url.com/api`
6. Click "Deploy"

## Step 4: Update Environment Variables

### Backend Environment Variables (Required)
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=<generate-strong-random-secret>
NODE_ENV=production
PORT=4000
PUBLIC_BASE_URL=https://your-backend-url.com
```

### Frontend Environment Variables (Required)
```
NEXT_PUBLIC_API_BASE=https://your-backend-url.com/api
```

## Step 5: Run Database Migrations

After backend is deployed, run Prisma migrations:

```bash
# Option 1: SSH into your hosting platform
cd backend
npx prisma migrate deploy
npx prisma generate

# Option 2: Use Railway CLI
railway run npx prisma migrate deploy

# Option 3: Add to Railway/Render build command
```

## Step 6: Seed Database (Optional)

```bash
# On your backend hosting platform
npm run prisma:seed
```

## Step 7: File Upload Storage

For production, consider:
- **AWS S3**: Most scalable
- **Cloudinary**: Easy image/video handling
- **Railway Volumes**: For Railway deployments
- **Render Disks**: For Render deployments

Update `backend/src/lib/storage.ts` to use cloud storage adapter.

## Step 8: CORS Configuration

Ensure backend allows frontend domain:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

## Step 9: Testing Production

1. Visit your Vercel URL
2. Test login with seeded accounts
3. Test video upload functionality
4. Verify API connections

## Troubleshooting

### Backend Issues
- Check logs in Railway/Render dashboard
- Verify DATABASE_URL is correct
- Ensure Prisma migrations ran successfully
- Check PORT environment variable

### Frontend Issues
- Verify NEXT_PUBLIC_API_BASE is set correctly
- Check browser console for API errors
- Ensure CORS is configured on backend
- Verify environment variables are set in Vercel

### Database Issues
- Test connection string locally
- Ensure database is accessible from hosting IP
- Check database credentials
- Run `npx prisma migrate status` to check migrations

## Quick Deploy Checklist

- [ ] Cloud database created (Neon/Supabase/Railway)
- [ ] Backend deployed (Railway/Render/Fly.io)
- [ ] Database migrations run
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Test login functionality
- [ ] Test video upload (if using cloud storage)

## Notes

- **Free tiers available**: Neon (free), Railway (free credits), Vercel (free)
- **Video uploads**: Large files (>20MB) may timeout on free tiers
- **Database**: Free tiers have connection limits
- **HTTPS**: All platforms provide HTTPS automatically


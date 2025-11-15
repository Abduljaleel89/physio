# Quick Start Deployment Guide

## 🚀 Fastest Path to Production

### Step 1: Set Up Database (5 minutes)
1. Go to https://neon.tech (free tier)
2. Sign up → Create Project → Copy `DATABASE_URL`

### Step 2: Deploy Backend (10 minutes)

**Using Railway (Easiest)**:
1. Go to https://railway.app
2. Sign up → New Project → Deploy from GitHub
3. Select your repo → Set root directory: `backend`
4. Add environment variables:
   - `DATABASE_URL` = (from Step 1)
   - `JWT_SECRET` = (generate random string)
   - `NODE_ENV` = `production`
   - `PUBLIC_BASE_URL` = `https://your-app.railway.app`
5. Deploy → Copy the backend URL

**Run migrations after deployment**:
```bash
# In Railway dashboard, open shell or use CLI
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed  # Optional
```

### Step 3: Deploy Frontend to Vercel (5 minutes)

1. **Via CLI**:
   ```bash
   cd frontend
   npm i -g vercel
   vercel login
   vercel
   vercel env add NEXT_PUBLIC_API_BASE production
   # Enter: https://your-backend-url.com/api
   vercel --prod
   ```

2. **Via Dashboard**:
   - Go to https://vercel.com
   - Import GitHub repo
   - Root Directory: `frontend`
   - Add env var: `NEXT_PUBLIC_API_BASE` = `https://your-backend-url.com/api`
   - Deploy

### Step 4: Update Backend CORS
Update `backend/src/index.ts` with your Vercel URL in the `allowedOrigins` array.

### Step 5: Test!
Visit your Vercel URL and log in with:
- Email: `admin@physio.com`
- Password: `password123`

## 🔑 Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📝 Environment Variables Checklist

**Backend (Railway/Render)**:
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `NODE_ENV=production`
- [ ] `PUBLIC_BASE_URL`

**Frontend (Vercel)**:
- [ ] `NEXT_PUBLIC_API_BASE`

## ⚠️ Important Notes

1. **Database**: Run migrations after first deployment
2. **File Uploads**: Currently uses local storage. For production, consider S3/Cloudinary
3. **HTTPS**: All platforms provide HTTPS automatically
4. **CORS**: Update allowed origins in backend

## 🆘 Common Issues

**Backend won't start**: Check DATABASE_URL format
**Frontend can't connect**: Verify NEXT_PUBLIC_API_BASE and CORS settings
**Migrations failed**: Ensure DATABASE_URL is correct and accessible

## 📚 Full Guide
See `DEPLOYMENT.md` for detailed instructions and alternatives.


# Deployment Notes

## Backend (Render)
- **Status:** ✅ Live
- **URL:** `https://physio-backend-g8vj.onrender.com`
- **Service ID:** `srv-d4cfg8idbo4c73d7smq0`
- **Repository:** `Abduljaleel89/physio` (branch: `main`)

### Environment Variables Needed on Render:
1. `DATABASE_URL` - Your PostgreSQL connection string (from Neon or other provider)
2. `JWT_SECRET` - A strong random secret for JWT tokens
3. `NODE_ENV` - Set to `production`
4. `PUBLIC_BASE_URL` - `https://physio-backend-g8vj.onrender.com`

### Next Steps for Backend:
1. **Set up Database:**
   - Go to Render Dashboard → Your backend service
   - Navigate to "Environment" tab
   - Add `DATABASE_URL` from your Neon database (or other PostgreSQL provider)
   - Add `JWT_SECRET` (generate a strong random string)
   - Add `NODE_ENV=production`
   - Add `PUBLIC_BASE_URL=https://physio-backend-g8vj.onrender.com`

2. **Run Database Migrations:**
   - You'll need to connect to your database and run Prisma migrations
   - You can do this via Render's Shell or set up a migration script

3. **Seed Database (Optional):**
   - Run the seed script to populate initial data

## Frontend (Vercel)
- **Status:** ⚠️ Needs environment variable update
- **Repository:** `Abduljaleel89/physio` (branch: `main`)

### Environment Variables Needed on Vercel:
1. **NEXT_PUBLIC_API_BASE** = `https://physio-backend-g8vj.onrender.com/api`

### Steps to Update Frontend:
1. Go to Vercel Dashboard → Your frontend project
2. Navigate to Settings → Environment Variables
3. Add/Update: `NEXT_PUBLIC_API_BASE` = `https://physio-backend-g8vj.onrender.com/api`
4. Redeploy the frontend

### Local Development:
- Use `.env.local` file in `frontend/` directory
- Already configured to use Render backend URL
- To use local backend, change `NEXT_PUBLIC_API_BASE` to `http://localhost:4000/api`

## Testing the Deployment:
1. Test backend API: `https://physio-backend-g8vj.onrender.com/api/auth/me` (should return 401 without token)
2. Test frontend: After updating Vercel env vars, test login and API calls
3. Check logs on both Render and Vercel for any errors

## Important Notes:
- Render free tier instances spin down after inactivity (50+ second delay on first request)
- Consider upgrading for production use
- Database connection must be configured before backend will work properly
- CORS settings may need adjustment if frontend domain differs


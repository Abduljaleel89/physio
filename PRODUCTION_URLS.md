# Production URLs and Environment Variables

## Your Deployed Services

### Backend (Render)
**URL:** `https://physio-backend-g8vj.onrender.com`

**Status:** ✅ Live and running

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (⚠️ NOT SET YET)
- `JWT_SECRET` - Secret key for JWT tokens (⚠️ NOT SET YET)
- `NODE_ENV` - Should be `production`
- `FRONTEND_URL` - Your Vercel frontend URL (optional, for CORS)

### Frontend (Vercel)
**URL:** Your Vercel project URL

**Required Environment Variables:**
- `NEXT_PUBLIC_API_BASE` - Should be `https://physio-backend-g8vj.onrender.com` (⚠️ NOT SET YET)

---

## Quick Setup Checklist

### Render Backend Setup

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New + → PostgreSQL
   - Name: `physio-db`
   - Database: `physio_prod`
   - Copy the "Internal Database URL"

2. **Set Environment Variables:**
   ```
   DATABASE_URL=postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/physio_prod
   JWT_SECRET=<generate with: openssl rand -base64 32>
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-url.vercel.app
   ```

3. **Run Migrations:**
   - After DATABASE_URL is set, go to Render Shell
   - Run: `npx prisma migrate deploy`

### Vercel Frontend Setup

1. **Set Environment Variable:**
   ```
   NEXT_PUBLIC_API_BASE=https://physio-backend-g8vj.onrender.com
   ```

2. **Redeploy:**
   - After setting the variable, redeploy the frontend

---

## Testing

After setup:
1. Open your Vercel frontend URL
2. Check browser console (F12) - should see API calls to Render backend
3. Try logging in with admin credentials
4. Verify no "localhost" in network requests

---

## Current Status

✅ Backend deployed and running  
⚠️ DATABASE_URL not set - database operations will fail  
⚠️ NEXT_PUBLIC_API_BASE not set in Vercel - frontend using localhost  
⚠️ JWT_SECRET not set - authentication may fail  

---

## Next Steps

1. Set DATABASE_URL in Render
2. Set JWT_SECRET in Render  
3. Set NEXT_PUBLIC_API_BASE in Vercel
4. Run database migrations
5. Test login functionality


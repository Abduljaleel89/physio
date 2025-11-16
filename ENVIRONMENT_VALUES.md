# Environment Variables Values for Render

## ✅ Generated Values:

### 1. JWT_SECRET
```
32bbbd3516004ad0299b98b63faa82ed48266a8a1cea427c28e9485165db0125
```
**Copy this exactly** - It's a secure random 64-character hex string.

---

### 2. DATABASE_URL
**You need to create a PostgreSQL database first!**

#### Option A: Use Render PostgreSQL (Recommended - Easy Setup)
1. Go to Render Dashboard → Click "+ New" → Select "PostgreSQL"
2. Fill in:
   - **Name:** `physio-db` (or any name)
   - **Database:** `physio_prod`
   - **User:** Will be auto-generated
   - **Region:** Choose closest to your backend
   - **PostgreSQL Version:** Latest
   - **Plan:** Free tier (or paid if needed)
3. Click "Create Database"
4. Wait for it to be created (1-2 minutes)
5. Once created, go to the database dashboard
6. Copy the **"Internal Database URL"** (for Render services) or **"External Database URL"**
7. Use the **Internal Database URL** if backend is on Render (format: `postgresql://user:password@hostname:5432/database_name`)

#### Option B: Use Neon (Free Tier - Alternative)
1. Go to: https://neon.tech
2. Sign up (free tier available)
3. Create a new project
4. Copy the connection string (it will look like: `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
5. Use this as your DATABASE_URL

#### Option C: Use Supabase (Free Tier - Alternative)
1. Go to: https://supabase.com
2. Sign up and create a project
3. Go to Settings → Database
4. Copy the connection string
5. Use this as your DATABASE_URL

---

## 📋 Complete Environment Variables for Render:

Once you have your DATABASE_URL, add these 4 variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `[Your PostgreSQL connection string from above]` |
| `JWT_SECRET` | `32bbbd3516004ad0299b98b63faa82ed48266a8a1cea427c28e9485165db0125` |
| `NODE_ENV` | `production` |
| `PUBLIC_BASE_URL` | `https://physio-backend-g8vj.onrender.com` |

---

## 🚀 Quick Setup Steps:

1. **Create Database** (if you don't have one):
   - Go to Render → "+ New" → "PostgreSQL"
   - Or use Neon/Supabase (links above)

2. **Get DATABASE_URL**:
   - Copy the connection string from your database provider

3. **Add Variables to Render**:
   - Go to: https://dashboard.render.com/web/srv-d4cfg8idbo4c73d7smq0/env
   - Click "+ Add Environment Variable" for each
   - Paste the values above

4. **Save and Wait**:
   - Render will automatically redeploy after you add variables
   - Check logs to verify it's working

---

## ⚠️ Important Notes:

- **Internal vs External URL**: If using Render PostgreSQL, use the **Internal Database URL** for better performance and security
- **Free Tier**: Render PostgreSQL free tier spins down after inactivity (like the backend)
- **SSL**: Make sure your connection string includes `?sslmode=require` if using external database
- **Keep JWT_SECRET Secret**: Never commit this to Git or share it publicly


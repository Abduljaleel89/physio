# Render Environment Variables Setup

## Required Environment Variables

Based on your backend deployment, you need to add these environment variables in Render:

### 1. DATABASE_URL (REQUIRED) ⚠️

**Status:** ❌ NOT SET - This is causing database operations to fail

**How to get it:**
1. In Render, go to your PostgreSQL database service (physio-db)
2. Go to the **Connections** or **Info** tab
3. Find the **Internal Database URL** (for services in the same Render account)
4. It looks like: `postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/physio_prod`

**In Render Environment Variables:**
- **Key:** `DATABASE_URL`
- **Value:** (paste the connection string from above)
- **Type:** Plain Text or Secret (both work)

---

### 2. JWT_SECRET (REQUIRED) ⚠️

**Status:** ❌ NOT SET - Authentication will fail without this

**How to generate:**
Run this command locally or use an online generator:
```bash
openssl rand -base64 32
```

Or visit: https://www.grc.com/passwords.htm (use 64-character random password)

**In Render Environment Variables:**
- **Key:** `JWT_SECRET`
- **Value:** (your generated secret - min 32 characters)
- **Type:** Secret (recommended)

**Example:** `aB3dEf9gHiJkLmNoPqRsTuVwXyZ1aB3dEf9gHiJkLmNoPqRsTuVwXyZ1234`

---

### 3. FRONTEND_URL (RECOMMENDED)

**Status:** ⚠️ NOT SET - CORS may block requests without this

**How to get it:**
Your Vercel frontend URL (e.g., `https://your-project.vercel.app`)

**In Render Environment Variables:**
- **Key:** `FRONTEND_URL`
- **Value:** (your Vercel frontend URL)
- **Type:** Plain Text

---

## Already Set (You Have These)

✅ `NODE_ENV` - Set to `production`
✅ `PORT` - Set to `4000` (default, Render handles this automatically)
✅ `physio-db` - This might be a database reference (check if it's the DATABASE_URL)

---

## Quick Setup Steps

1. **Click "Edit" button** on the Environment Variables page
2. **Add DATABASE_URL:**
   - Click "+ Add Environment Variable"
   - Key: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Type: Secret (recommended)
   - Click "Save"

3. **Add JWT_SECRET:**
   - Click "+ Add Environment Variable"
   - Key: `JWT_SECRET`
   - Value: Generated secret (64 characters)
   - Type: Secret
   - Click "Save"

4. **Add FRONTEND_URL:**
   - Click "+ Add Environment Variable"
   - Key: `FRONTEND_URL`
   - Value: Your Vercel frontend URL
   - Type: Plain Text
   - Click "Save"

5. **After adding variables:**
   - Render will automatically redeploy
   - Wait for deployment to complete
   - Check logs to verify DATABASE_URL is now set

---

## Verify Setup

After adding environment variables, check the logs:
- Should see: `✅ Database connection established`
- Should NOT see: `❌ DATABASE_URL environment variable is not set!`

---

## Important Notes

1. **DATABASE_URL format:** Should NOT include `/api` at the end
   - ✅ Correct: `postgresql://user:pass@host:5432/dbname`
   - ❌ Wrong: `postgresql://user:pass@host:5432/dbname/api`

2. **JWT_SECRET:** Must be at least 32 characters. Longer is better for security.

3. **FRONTEND_URL:** Include `https://` and the full domain
   - ✅ Correct: `https://your-project.vercel.app`
   - ❌ Wrong: `your-project.vercel.app` (missing https://)

4. **Render will redeploy** automatically after adding environment variables. Wait for it to complete before testing.

---

## After Setup

Once all variables are set:
1. Backend will connect to database
2. Authentication will work
3. All features will be available

Then proceed to:
1. Run database migrations: `npx prisma migrate deploy` (in Render Shell)
2. Set `NEXT_PUBLIC_API_BASE` in Vercel to `https://physio-backend-g8vj.onrender.com`


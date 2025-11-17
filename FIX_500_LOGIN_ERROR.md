# Fix: 500 Error on Login

## Common Causes

### 1. Database Migrations Not Run ⚠️ (Most Likely)

**Problem:** Database tables don't exist yet.

**Solution:**
1. Go to Render Dashboard → Your backend service
2. Click **Shell** tab
3. Run: `npx prisma migrate deploy`
4. Wait for migrations to complete
5. Try login again

---

### 2. DATABASE_URL Not Set or Incorrect

**Problem:** Backend can't connect to database.

**Check:**
1. Go to Render → Your backend service → Environment tab
2. Verify `DATABASE_URL` is set
3. The URL should look like: `postgresql://user:pass@host:5432/dbname`

**Solution:**
- If missing, add it from your PostgreSQL database service
- Make sure it's the **Internal Database URL** (for same Render account)

---

### 3. Database Tables Don't Exist

**Check:**
1. Go to Render Shell
2. Run: `npx prisma db pull` (to check if tables exist)
3. Or run: `npx prisma studio` (to view database)

**Solution:**
- Run migrations: `npx prisma migrate deploy`
- Or reset and migrate: `npx prisma migrate reset` (⚠️ deletes all data)

---

### 4. Prisma Client Not Generated

**Problem:** Prisma Client is out of sync with schema.

**Solution:**
1. Go to Render Shell
2. Run: `npx prisma generate`
3. Restart the service

---

## Step-by-Step Fix

### Step 1: Check Database Connection

1. Go to your Render backend service
2. Click **Logs** tab
3. Look for:
   - ✅ `Database connection established` = Good
   - ❌ `DATABASE_URL not set` = Need to set it
   - ❌ `Can't reach database server` = Wrong URL or database down

### Step 2: Run Database Migrations

1. Go to **Shell** tab in Render
2. Run:
   ```bash
   npx prisma migrate deploy
   ```
3. This will create all required tables (User, Patient, Doctor, etc.)

### Step 3: Verify Tables Exist

1. In Render Shell, run:
   ```bash
   npx prisma db pull
   ```
2. Or check logs for migration success messages

### Step 4: Test Health Endpoint

1. Visit: `https://physio-backend-g8vj.onrender.com/health`
2. Should return:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "..."
   }
   ```
3. If it shows "unhealthy", database connection is the issue

### Step 5: Check Login Endpoint

1. Try login again
2. Check Render logs for specific error messages
3. The improved error handling will show more details

---

## Quick Diagnostic Commands

Run these in Render Shell:

```bash
# Check database connection
npx prisma db pull

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Check if User table exists
npx prisma studio
```

---

## Expected Database Tables

After migrations, you should have:
- `User`
- `Patient`
- `Doctor`
- `TherapyPlan`
- `Exercise`
- `CompletionEvent`
- `Appointment`
- `Notification`
- `VerificationToken`
- And more...

---

## Still Getting 500 Error?

1. **Check Render Logs:**
   - Go to **Logs** tab
   - Look for error messages around login time
   - Copy the full error message

2. **Check Health Endpoint:**
   - Visit: `https://physio-backend-g8vj.onrender.com/health`
   - If unhealthy, database is the issue

3. **Verify Environment Variables:**
   - `DATABASE_URL` is set
   - `JWT_SECRET` is set
   - `NODE_ENV` is `production`

4. **Test Database Directly:**
   - In Render Shell: `npx prisma studio`
   - Should open database viewer
   - Check if `User` table exists

---

## Most Common Solution

**90% of the time, the issue is:**

1. Database migrations not run
2. Solution: Run `npx prisma migrate deploy` in Render Shell

This creates all the tables needed for the app to work.


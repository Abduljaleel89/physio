# Render Database Setup Guide

## Issue: Database Connection Failed

The backend is failing to connect because the `DATABASE_URL` environment variable is not configured.

## Solution: Set Up PostgreSQL Database on Render

### Step 1: Create a PostgreSQL Database

1. Go to your Render dashboard: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `physio-db` (or your preferred name)
   - **Database:** `physio_prod` (or your preferred name)
   - **User:** (auto-generated)
   - **Region:** Choose closest to your backend
   - **Plan:** Free tier is fine for testing
4. Click **"Create Database"**

### Step 2: Get the Database Connection String

1. Once the database is created, go to its dashboard
2. Find the **"Internal Database URL"** or **"Connection Pooling URL"** section
3. Copy the connection string. It looks like:
   ```
   postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/physio_prod
   ```

### Step 3: Add DATABASE_URL to Backend Service

1. Go to your **physio-backend** service on Render
2. Click on **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add:
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the connection string from Step 2
5. Click **"Save Changes"**

### Step 4: Add Other Required Environment Variables

Also add these environment variables to your backend service:

1. **JWT_SECRET** (required for authentication)
   - Generate a random secret: `openssl rand -base64 32`
   - Or use an online generator
   - Example: `your-super-secret-jwt-key-here-min-32-chars`

2. **NODE_ENV** (should already be set)
   - Value: `production`

3. **FRONTEND_URL** (optional, for CORS)
   - Value: Your frontend URL (e.g., `https://your-frontend.onrender.com`)

### Step 5: Run Database Migrations

After setting up the database and environment variables:

1. Go to your backend service on Render
2. Open the **"Shell"** tab (or use the manual deploy command)
3. Run:
   ```bash
   npx prisma migrate deploy
   ```
4. Or add a post-deploy script to your `render.yaml`:
   ```yaml
   postDeployCommand: npx prisma migrate deploy
   ```

### Step 6: Redeploy the Backend

1. Go to your backend service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for the deployment to complete
4. Check the logs - you should see: `✅ Database connection established`

## Alternative: Using render.yaml

You can also link the database in `render.yaml`:

```yaml
services:
  - type: web
    name: physio-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npx prisma generate && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
      # Add DATABASE_URL here if you know it, or use Render's database linking
    healthCheckPath: /
  
  - type: pspg (PostgreSQL)
    name: physio-db
    plan: free
    databaseName: physio_prod
    user: physio_user
```

Then link them in the Render dashboard.

## Troubleshooting

### Error: "Database not reachable"

- **Check:** Is DATABASE_URL set correctly?
- **Check:** Is the database service running on Render?
- **Check:** Are you using the internal database URL (not external)?
- **Solution:** The backend will now start even if DB isn't ready, but DB operations may fail

### Error: "Connection timeout"

- **Check:** Is the database in the same region as your backend?
- **Check:** Are you using connection pooling URL?
- **Solution:** Use Render's internal database URL for better performance

### Error: "Relation does not exist"

- **Cause:** Database migrations haven't been run
- **Solution:** Run `npx prisma migrate deploy` in the Render shell

## Environment Variables Checklist

Make sure these are set in your Render backend service:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Usually 4000 (auto-set by Render)
- [ ] `FRONTEND_URL` - Your frontend URL (optional, for CORS)

## Quick Start Commands

After setting up the database:

```bash
# In Render Shell or locally with DATABASE_URL set:
cd backend
npx prisma migrate deploy
npx prisma generate
npm start
```

## Notes

- The backend will now start even if the database isn't immediately available
- It will retry connection for 30 attempts (60 seconds total)
- If database connection fails, the server still starts but database operations will fail
- Check logs for connection status messages


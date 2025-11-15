# Vercel Environment Variables Setup

## Fix for: "Environment Variable 'NEXT_PUBLIC_API_BASE' references Secret 'next_public_api_base', which does not exist"

### Problem
The environment variable `NEXT_PUBLIC_API_BASE` is configured to reference a secret that doesn't exist.

### Solution
Since `NEXT_PUBLIC_API_BASE` is a **public** variable (it will be exposed to the browser), it should NOT be stored as a secret. Instead, set it as a regular environment variable.

### Steps to Fix:

1. **Go to Vercel Dashboard:**
   - Navigate to your project: `physio` (or `physio-3s3a`)
   - Click on **Settings** → **Environment Variables**

2. **Find `NEXT_PUBLIC_API_BASE`:**
   - Look for the variable `NEXT_PUBLIC_API_BASE`
   - Click **Edit** or **Remove** it

3. **Set it correctly:**
   - **Option A:** Remove it entirely (recommended for now)
     - The code has a fallback: `process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api'`
     - This will work for local development
   
   - **Option B:** Set it as a direct value (for production)
     - Click **Add New** → Environment Variable
     - **Key:** `NEXT_PUBLIC_API_BASE`
     - **Value:** Your backend API URL (e.g., `https://your-backend.railway.app/api` or `https://your-backend-url.com/api`)
     - **Environment:** Select all (Production, Preview, Development)
     - **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger auto-deployment

### Important Notes:

- `NEXT_PUBLIC_*` variables are **public** and will be included in the client-side bundle
- They should NOT be stored as secrets
- Set them as regular environment variables instead
- Make sure the backend URL is accessible from the frontend (CORS enabled)

### Example Values:

- **Local Development:** `http://localhost:4000/api` (default fallback)
- **Production:** `https://your-backend-domain.com/api` (your deployed backend URL)


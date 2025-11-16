# Vercel Frontend Configuration

## ✅ Step 1: Add Environment Variable

**URL:** https://vercel.com/[your-username]/[project-name]/settings/environment-variables

### Add This Variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_BASE` | `https://physio-backend-g8vj.onrender.com/api` |

### Steps:
1. Go to your Vercel project
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in left sidebar
4. Click **"Add New"** button
5. Enter:
   - **Key:** `NEXT_PUBLIC_API_BASE`
   - **Value:** `https://physio-backend-g8vj.onrender.com/api`
   - **Environments:** Check all three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
6. Click **"Save"**

---

## ✅ Step 2: Redeploy Frontend

After adding the environment variable, you need to redeploy:

### Option A: Manual Redeploy (Fastest)
1. Go to **"Deployments"** tab in Vercel
2. Find your latest deployment
3. Click the **three dots (⋯)** menu
4. Click **"Redeploy"**
5. Wait for deployment to complete (~2-3 minutes)

### Option B: Auto Redeploy (via Git)
1. Make a small change (like adding a space)
2. Commit and push to GitHub
3. Vercel will automatically redeploy

---

## ✅ Step 3: Test Everything

### Test Backend:
Visit: `https://physio-backend-g8vj.onrender.com/api/auth/me`
- Should return: `{"success":false,"error":"No token provided"}` (401) ✅

### Test Frontend:
1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Try to login with:
   - Email: `admin@physio.com`
   - Password: `password123`
3. Should redirect to dashboard ✅
4. Check browser console (F12) for any errors

---

## 🎉 Complete Setup Summary:

### Render Backend (✅ Done):
- ✅ `DATABASE_URL` = Your PostgreSQL connection string
- ✅ `JWT_SECRET` = `32bbbd3516004ad0299b98b63faa82ed48266a8a1cea427c28e9485165db0125`
- ✅ `NODE_ENV` = `production`
- ✅ `PUBLIC_BASE_URL` = `https://physio-backend-g8vj.onrender.com`

### Vercel Frontend (In Progress):
- ⏳ `NEXT_PUBLIC_API_BASE` = `https://physio-backend-g8vj.onrender.com/api` ← **Add this now**
- ⏳ Redeploy frontend after adding variable

---

## 🚨 Troubleshooting:

**Frontend can't connect to backend?**
- Verify `NEXT_PUBLIC_API_BASE` is correct in Vercel
- Check browser console (F12) for errors
- Ensure backend is running (check Render logs)
- Check CORS settings on backend

**CORS Errors?**
- Backend may need CORS configuration for your Vercel domain
- Add your Vercel domain to backend CORS allowed origins

**401 Unauthorized?**
- This is expected for `/api/auth/me` without a token
- If login fails, check backend logs on Render


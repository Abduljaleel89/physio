# Environment Variables Setup Guide

## Render Backend Environment Variables

**URL:** https://dashboard.render.com/web/srv-d4cfg8idbo4c73d7smq0/settings/environment

### Required Variables:

1. **DATABASE_URL**
   - Format: `postgresql://user:password@host:port/database?sslmode=require`
   - Get from: Neon dashboard or your PostgreSQL provider

2. **JWT_SECRET**
   - Generate at: https://randomkeygen.com/ (use CodeIgniter Encryption Keys - 256 bits)
   - Or generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

3. **NODE_ENV**
   - Value: `production`

4. **PUBLIC_BASE_URL**
   - Value: `https://physio-backend-g8vj.onrender.com`

### Steps:
1. Click "Add Environment Variable"
2. Enter Key and Value
3. Click "Save Changes"
4. Repeat for each variable
5. Service will auto-restart with new variables

---

## Vercel Frontend Environment Variables

**URL:** https://vercel.com/[your-username]/[project-name]/settings/environment-variables

### Required Variables:

1. **NEXT_PUBLIC_API_BASE**
   - Value: `https://physio-backend-g8vj.onrender.com/api`
   - Make sure it's available to "Production", "Preview", and "Development"

### Steps:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Click "Add New"
4. Enter Key: `NEXT_PUBLIC_API_BASE`
5. Enter Value: `https://physio-backend-g8vj.onrender.com/api`
6. Select environments (Production, Preview, Development)
7. Click "Save"
8. Redeploy your frontend (or wait for auto-deploy on next commit)

---

## Quick Checklist:

- [ ] Render: DATABASE_URL added
- [ ] Render: JWT_SECRET added
- [ ] Render: NODE_ENV set to production
- [ ] Render: PUBLIC_BASE_URL added
- [ ] Vercel: NEXT_PUBLIC_API_BASE added
- [ ] Vercel: Frontend redeployed
- [ ] Test backend: Visit https://physio-backend-g8vj.onrender.com/api/auth/me
- [ ] Test frontend: Login and test API calls

---

## Troubleshooting:

**Backend not responding?**
- Check Render logs: https://dashboard.render.com/web/srv-d4cfg8idbo4c73d7smq0/logs
- Verify DATABASE_URL is correct
- Check if database allows connections from Render IPs

**Frontend can't connect to backend?**
- Verify NEXT_PUBLIC_API_BASE is correct
- Check browser console for CORS errors
- Ensure backend has CORS configured for your Vercel domain

**CORS Issues?**
- Backend may need CORS configuration
- Add your Vercel domain to allowed origins in backend CORS settings


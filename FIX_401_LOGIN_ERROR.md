# Fix: 401 Unauthorized Error on Login

## Problem
After running migrations, you're getting a **401 Unauthorized** error. This means:
- ✅ Database is connected
- ✅ Tables are created
- ❌ **Admin user doesn't exist yet**

## Solution: Run Database Seed

The database needs to be seeded with initial users (admin, doctor, patient, etc.).

### Step 1: Run Seed Script in Render Shell

1. Go to **Render Dashboard** → Your `physio-backend` service
2. Click **Shell** tab
3. Run this command:
   ```bash
   npx prisma db seed
   ```
   
   Or alternatively:
   ```bash
   npm run prisma:seed
   ```

4. Wait for it to complete - you should see:
   ```
   🌱 Starting database seeding...
   ✅ Created admin user
   ✅ Created doctor user
   ✅ Created patient user
   ...
   🎉 Seeding completed successfully!
   ```

### Step 2: Verify Users Were Created

In Render Shell, you can verify:
```bash
npx prisma studio
```

This opens a database viewer where you can see all users.

### Step 3: Try Login Again

After seeding, use these credentials:

**Admin:**
- Email: `admin@physio.com`
- Password: `password123`

**Doctor:**
- Email: `doctor@physio.com`
- Password: `password123`

**Patient:**
- Email: `patient@physio.com`
- Password: `password123`

---

## What the Seed Script Creates

The seed script creates:
- ✅ Admin user (`admin@physio.com`)
- ✅ Doctor user (`doctor@physio.com`)
- ✅ Patient user (`patient@physio.com`)
- ✅ Receptionist user
- ✅ Assistant user
- ✅ Sample therapy plans
- ✅ Sample exercises
- ✅ Sample appointments

**All users have password:** `password123`

---

## Alternative: Create Admin User Manually

If the seed script doesn't work, you can create the admin user manually:

1. In Render Shell, run:
   ```bash
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const bcrypt = require('bcryptjs');
   const prisma = new PrismaClient();
   
   (async () => {
     const hashedPassword = await bcrypt.hash('password123', 10);
     const user = await prisma.user.create({
       data: {
         email: 'admin@physio.com',
         password: hashedPassword,
         role: 'ADMIN'
       }
     });
     console.log('✅ Admin user created:', user);
     await prisma.\$disconnect();
   })();
   "
   ```

---

## Troubleshooting

### Error: "Cannot find module 'ts-node'"

**Solution:** Run:
```bash
npm install -g ts-node
npx prisma db seed
```

### Error: "Seed script not found"

**Solution:** Check if `prisma/seed.ts` exists, then run:
```bash
npx ts-node prisma/seed.ts
```

### Still Getting 401 After Seeding

1. **Check if user exists:**
   ```bash
   npx prisma studio
   ```
   Look for `admin@physio.com` in the User table

2. **Verify password hash:**
   - The seed script uses `bcrypt.hash("password123", 10)`
   - Make sure JWT_SECRET is set in environment variables

3. **Check Render logs:**
   - Look for any errors during login
   - The improved error handling should show specific issues

---

## Quick Checklist

- [ ] Run `npx prisma db seed` in Render Shell
- [ ] Verify seed completed successfully
- [ ] Try login with `admin@physio.com` / `password123`
- [ ] Check Render logs if still getting 401
- [ ] Verify JWT_SECRET is set in environment variables

---

## Expected Result

After seeding:
1. ✅ Database has admin user
2. ✅ Login with `admin@physio.com` / `password123` works
3. ✅ You can access the admin dashboard
4. ✅ All features are available

The 401 error should be resolved once the admin user exists in the database!


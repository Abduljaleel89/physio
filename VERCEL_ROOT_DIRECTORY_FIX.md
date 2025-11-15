# Fix: rootDirectory in vercel.json

## Error Message
```
The 'vercel.json' schema validation failed with the following message: 
should NOT have additional property `rootDirectory`
```

## Problem
`rootDirectory` is **NOT** a valid property in `vercel.json` file.

## Solution

### ✅ Code Fix (Done)
Removed `rootDirectory` from `vercel.json`. The file now only contains:
```json
{
  "framework": "nextjs"
}
```

### ⚠️ IMPORTANT: Set Root Directory in Vercel Dashboard

You **MUST** set the root directory in Vercel project settings:

1. Go to your Vercel project: `physio-oq62`
2. Click **"Settings"** tab
3. Click **"General"** in the left sidebar
4. Scroll down to **"Root Directory"**
5. Set it to: `frontend`
6. Click **"Save"**

### Alternative: Set During Project Import

If creating a new project:
1. Go to **"Add New..."** → **"Project"**
2. Select your GitHub repo
3. In the import settings, look for **"Root Directory"**
4. Type: `frontend`
5. Click **"Deploy"**

## Why This Matters

- ✅ `vercel.json` - For build commands, rewrites, headers, etc.
- ✅ Project Settings - For root directory, framework detection, etc.

These are separate configurations!

---

## Current Status

✅ **vercel.json fixed** - Removed invalid property
⚠️ **Set rootDirectory in dashboard** - Manual action required
🔄 **Redeploy after setting** - Should work then


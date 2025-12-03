# Production Deployment Guide - MinRisk

**Last Updated:** 2025-12-03
**Status:** Ready for Production Deployment

---

## Current State

### ✅ Already in Production
- **Database:** Supabase (qrxwgjjgaekalvaqzpuf.supabase.co)
- **Backend API:** Supabase REST API + RLS policies
- **Edge Functions:** Deployed to Supabase
- **Database Migrations:** All applied successfully
- **Backend Features:** 100% deployed

### ⏳ Pending Deployment
- **Frontend Application:** Currently on localhost:3000
- **Static Assets:** Need hosting platform

---

## Recommended Deployment Platform: Vercel

**Why Vercel?**
- ✅ **Free tier** for production apps
- ✅ **Zero-config** Vite + React deployment
- ✅ **Automatic HTTPS** and SSL certificates
- ✅ **Global CDN** for fast performance
- ✅ **Git integration** (auto-deploy on push)
- ✅ **Environment variables** support
- ✅ **Custom domains** supported

**Alternatives:** Netlify, Cloudflare Pages, AWS Amplify (all work similarly)

---

## Deployment Steps

### Option 1: Deploy to Vercel (Recommended - 10 minutes)

#### Step 1: Install Vercel CLI (One-time)
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```
- Follow prompts to authenticate
- Choose email or GitHub/GitLab

#### Step 3: Deploy from Project Directory
```bash
# Make sure you're in NEW-MINRISK directory
cd /Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/NEW-MINRISK

# Deploy to production
vercel --prod
```

#### Step 4: Configure During Deployment
Vercel will ask:
1. **Set up and deploy?** → YES
2. **Which scope?** → Your account/team
3. **Link to existing project?** → NO (first time) or YES (subsequent)
4. **What's your project's name?** → `minrisk-production` (or your choice)
5. **In which directory is your code located?** → `./` (current directory)
6. **Want to modify settings?** → YES

Configure:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### Step 5: Set Environment Variables
**Option A: Via Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Click your project: `minrisk-production`
3. Go to: Settings → Environment Variables
4. Add these variables:

```
VITE_SUPABASE_URL=https://qrxwgjjgaekalvaqzpuf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyeHdnampnYWVrYWx2YXF6cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTQ4OTUsImV4cCI6MjA3OTAzMDg5NX0.VHfgfzbzyGEHnpaDrmOEitJyMD882LCCZhzNGZYGG7I
VITE_ANTHROPIC_API_KEY=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
```

**Option B: Via CLI**
```bash
vercel env add VITE_SUPABASE_URL production
# Paste value when prompted

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste value when prompted

vercel env add VITE_ANTHROPIC_API_KEY production
# Paste value when prompted
```

#### Step 6: Redeploy After Adding Variables
```bash
vercel --prod
```

#### Step 7: Get Your Production URL
Vercel will output:
```
✅ Production: https://minrisk-production.vercel.app
```

**Your app is now live!** 🎉

---

### Option 2: Deploy to Netlify (Alternative)

#### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### Step 2: Login to Netlify
```bash
netlify login
```

#### Step 3: Deploy
```bash
# In NEW-MINRISK directory
netlify deploy --prod

# Build your site? YES
# Build command: npm run build
# Directory to deploy: dist
```

#### Step 4: Set Environment Variables
```bash
netlify env:set VITE_SUPABASE_URL "https://qrxwgjjgaekalvaqzpuf.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set VITE_ANTHROPIC_API_KEY "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"
```

---

## Post-Deployment Checklist

### Immediate Testing (Critical)
- [ ] Navigate to production URL
- [ ] Login as admin user
- [ ] Test all main features:
  - [ ] Dashboard loads
  - [ ] Risk Register displays
  - [ ] Incidents tab works
  - [ ] Void incident functionality
  - [ ] Voided Incidents (Audit) tab
  - [ ] Risk mapping works
  - [ ] KRI monitoring
  - [ ] Analytics charts render

### Security Verification
- [ ] HTTPS enabled (green padlock in browser)
- [ ] RLS policies working (users see only their org data)
- [ ] Admin features visible only to admin users
- [ ] API keys not exposed in browser (check DevTools → Network)

### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] No console errors (F12 → Console)
- [ ] Images/assets loading correctly
- [ ] Mobile responsive design works

### Supabase Configuration
- [ ] Update Supabase allowed domains:
  1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/auth/url-configuration
  2. Add production URL to "Site URL"
  3. Add production URL to "Redirect URLs"
  4. Save changes

---

## Continuous Deployment (Auto-Deploy on Git Push)

### Vercel + GitHub Integration

#### Step 1: Push to GitHub
```bash
# If you haven't already, initialize git remote
git remote add origin https://github.com/YOUR_USERNAME/minrisk.git
git push -u origin main
```

#### Step 2: Connect Vercel to GitHub
1. Go to: https://vercel.com/dashboard
2. Click: "Add New..." → "Project"
3. Import from GitHub
4. Select your MinRisk repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables (same as before)
7. Click: "Deploy"

#### Step 3: Enable Auto-Deploy
- ✅ **Automatic:** Vercel watches your GitHub repo
- ✅ **On every push to main:** Auto-deploy triggered
- ✅ **Preview deployments:** Auto-created for PRs

**Now, every time you push to GitHub, Vercel auto-deploys!**

---

## Custom Domain Setup (Optional)

### Add Your Own Domain

#### If using Vercel:
1. Go to: Project Settings → Domains
2. Add domain: `minrisk.yourdomain.com`
3. Update DNS records (Vercel provides instructions):
   ```
   Type: CNAME
   Name: minrisk
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (5-60 minutes)
5. ✅ Your app is now at: `https://minrisk.yourdomain.com`

---

## Environment Management

### Recommended Setup

**Three Environments:**
1. **Development:** localhost:3000 (local dev)
2. **Staging:** minrisk-staging.vercel.app (testing)
3. **Production:** minrisk.yourdomain.com (live users)

**How to Set Up:**

**Development:**
```bash
# Uses .env.development (already configured)
npm run dev
```

**Staging:**
```bash
# Deploy to staging
vercel
# (without --prod flag)
```

**Production:**
```bash
# Deploy to production
vercel --prod
```

---

## Monitoring & Maintenance

### Vercel Analytics (Built-in, Free)
- **Page Views:** Track usage
- **Performance:** Core Web Vitals
- **Errors:** Runtime errors logged

**Enable:**
1. Project Settings → Analytics
2. Toggle: "Enable Web Analytics"
3. View: https://vercel.com/dashboard/analytics

### Supabase Monitoring
- **Database:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/database/tables
- **Edge Functions Logs:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions
- **Auth Logs:** https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/auth/users

---

## Rollback Strategy

### If Production Breaks

**Option 1: Revert to Previous Deployment (Vercel)**
1. Go to: Vercel Dashboard → Deployments
2. Find last working deployment
3. Click: "..." → "Promote to Production"
4. ✅ Instant rollback

**Option 2: Revert Git Commit**
```bash
# Find last good commit
git log --oneline

# Revert to specific commit
git reset --hard <commit-hash>

# Force push (if already deployed)
git push --force

# Vercel will auto-deploy the reverted version
```

---

## Cost Breakdown

### Free Tier Limits

**Vercel Free:**
- ✅ Unlimited projects
- ✅ Unlimited bandwidth
- ✅ 100 GB-hours compute/month
- ✅ SSL certificates
- ✅ Global CDN
- ✅ Automatic HTTPS

**Supabase Free (Current):**
- ✅ 500 MB database storage
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth/month
- ✅ 500K Edge Function invocations/month

**Total Monthly Cost:** $0 (Free tier)

**When to Upgrade:**
- Database > 500 MB → Supabase Pro ($25/month)
- High traffic > 100 GB-hours → Vercel Pro ($20/month)

---

## Security Best Practices

### Before Going Live

- [x] ✅ RLS policies enabled (already done)
- [x] ✅ Environment variables secured (never committed)
- [x] ✅ HTTPS enforced (automatic with Vercel)
- [ ] ⏳ Add rate limiting (Supabase settings)
- [ ] ⏳ Enable 2FA for admin accounts
- [ ] ⏳ Set up monitoring alerts

### Supabase Security Settings
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/api
2. Rate Limiting:
   - **Anonymous requests:** 100/minute
   - **Authenticated requests:** 200/minute
3. CORS Settings:
   - Add production URL to allowed origins
4. JWT Settings:
   - Token expiry: 3600 seconds (1 hour)

---

## Final Decision Point

### Ready to Deploy?

**Pre-Flight Checklist:**
- ✅ All features tested on localhost:3000
- ✅ No console errors
- ✅ Database migrations deployed
- ✅ Git committed and up to date
- ✅ .env.development contains correct keys
- ✅ User acceptance testing passed

**If all checked, you're ready to deploy!**

### Recommended Timeline

**Today (2025-12-03):**
- [ ] Test void system thoroughly on localhost
- [ ] Deploy to Vercel production

**This Week:**
- [ ] Monitor for any issues
- [ ] Get user feedback
- [ ] Set up custom domain (if needed)

**Next Week:**
- [ ] Enable continuous deployment (GitHub → Vercel)
- [ ] Set up staging environment
- [ ] Configure monitoring alerts

---

## Quick Deploy Command (TL;DR)

```bash
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy to production
vercel --prod

# 4. Follow prompts, set env variables in dashboard
# 5. Done! Your app is live.
```

**Estimated Time:** 10-15 minutes

---

## Support & Resources

**Vercel Documentation:**
- https://vercel.com/docs

**Supabase Documentation:**
- https://supabase.com/docs

**Vite Deployment:**
- https://vitejs.dev/guide/static-deploy.html

**Need Help?**
- Vercel Support: https://vercel.com/support
- Supabase Discord: https://discord.supabase.com

---

**Last Updated:** 2025-12-03
**Next Review:** After first production deployment

# MinRisk Client Deployment Guide

This guide walks through deploying MinRisk to a new client environment.

---

## Deployment Options

### Option 1: Multi-Tenant (Shared Infrastructure)
All clients share one deployment; data isolated via organizations.

| Best for | Requirements |
|----------|--------------|
| Cost-sensitive deployments | Create new organization + users |
| Rapid onboarding | Client uses your main URL |
| Small-medium clients | RLS provides data isolation |

### Option 2: Dedicated Instance (Recommended for Enterprise)
Each client gets their own Supabase project and frontend deployment.

| Best for | Requirements |
|----------|--------------|
| Enterprise clients | Separate Supabase project |
| Custom branding needs | Dedicated frontend hosting |
| Regulatory requirements | Independent scaling |

---

## Dedicated Instance Deployment Steps

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Access to hosting platform (Render, Vercel, etc.)
- [ ] Anthropic API key for AI features

---

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configure:
   - **Name**: `minrisk-[client-name]`
   - **Database Password**: Generate and save securely
   - **Region**: Choose closest to client
4. Wait for project to provision (~2 minutes)
5. **Record these values** from Settings → API:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

### Step 2: Run Database Migrations

**Option A: Via Supabase CLI**
```bash
# Link to new project
npx supabase login
npx supabase link --project-ref [PROJECT_REF]

# Push all migrations
npx supabase db push
```

**Option B: Via SQL Editor (Manual)**
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order from `supabase/migrations/`:
   ```
   20241231_restore_base_schema.sql
   20251126000021_residual_risk_calculation.sql
   20251126000024_control_dependencies.sql
   ... (all files in sequence)
   20250101_continuous_risk_architecture.sql
   ```

> [!IMPORTANT]
> Run migrations **in chronological order** based on filename timestamps.

---

### Step 3: Deploy Edge Functions

```bash
# Login to Supabase CLI
npx supabase login

# Link to client project
npx supabase link --project-ref [PROJECT_REF]

# Set required secrets
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy all functions
npx supabase functions deploy --all
```

**Required Secrets:**
| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Claude AI API key for Risk Intelligence |

---

### Step 4: Configure Frontend Environment

Create `.env.production` for the client deployment:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]

# AI Features
VITE_AI_DEMO_MODE=false

# Environment
NODE_ENV=production
```

> [!CAUTION]
> Never include `SERVICE_ROLE_KEY` in frontend environment variables.

---

### Step 5: Deploy Frontend

#### Option A: Render (Current Setup)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `minrisk-[client-name]`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: (leave blank for static)
   - **Publish Directory**: `dist`
4. Add environment variables from Step 4
5. Deploy

#### Option B: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option C: Self-Hosted (Client's Infrastructure)

```bash
# Build production bundle
npm run build

# Output is in ./dist folder
# Serve with any static host (nginx, Apache, etc.)
```

---

### Step 6: Create Initial Admin User

**Option A: Self-Registration**
1. Navigate to deployed URL
2. Click "Sign Up"
3. First user becomes `primary_admin`

**Option B: SQL Seed (Recommended)**
Run in Supabase SQL Editor:

```sql
-- 1. Create organization
INSERT INTO organizations (id, name, created_at)
VALUES (
  gen_random_uuid(),
  'Client Organization Name',
  NOW()
);

-- 2. Create admin user via Supabase Auth Dashboard
-- Go to Authentication → Users → Add User

-- 3. Link user to organization (after auth user created)
INSERT INTO user_profiles (id, organization_id, full_name, role)
VALUES (
  '[AUTH_USER_ID]',
  '[ORG_ID from step 1]',
  'Admin Name',
  'primary_admin'
);
```

---

### Step 7: Initial Configuration

After first login, configure:

1. **Risk Taxonomy** (Admin → Risk Taxonomy)
   - Add risk categories and subcategories
   - Or import from Excel template

2. **Risk Configuration** (Admin → Risk Configuration)
   - Set likelihood/impact labels
   - Configure risk level thresholds

3. **Appetite & Tolerance** (Admin → Appetite & Tolerance)
   - Define risk appetite per category
   - Set tolerance thresholds

4. **Period Management** (Admin → Period Management)
   - Set initial active period

---

## Custom Branding (Optional)

### Logo & App Name
Edit `src/components/layout/Header.tsx`:
```tsx
// Change logo/name
<span className="text-xl font-bold">Client Name</span>
```

### Colors
Edit `src/index.css` or `tailwind.config.ts`:
```css
:root {
  --primary: [client-brand-color];
}
```

### Custom Domain
Configure in hosting platform (Render/Vercel) → Custom Domains

---

## Post-Deployment Checklist

- [ ] All migrations applied successfully
- [ ] Edge functions deployed and working
- [ ] Admin user can login
- [ ] AI features functional (test AI Risk Generator)
- [ ] Risk Intelligence RSS scanning works
- [ ] Email notifications configured (if needed)
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Backup strategy in place

---

## Troubleshooting

### "Unauthorized" on Edge Functions
→ Check `SUPABASE_ANON_KEY` is correct in frontend `.env`

### AI Features Not Working
→ Verify `ANTHROPIC_API_KEY` is set in Supabase secrets

### Migrations Fail
→ Run in sequence; check for missing dependencies

### RLS Blocking Queries
→ User may not have `organization_id` linked in `user_profiles`

---

## Support

For deployment assistance, contact the development team.

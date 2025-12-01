# Deploying Expanded Global Libraries

## Overview

The `seed-expanded-global-libraries.sql` file contains:
- **70 Root Causes** across 8 domains
- **45 Impacts** across 8 categories

## Deployment Options

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/sql/new
2. Copy the entire contents of `seed-expanded-global-libraries.sql`
3. Paste into the SQL editor
4. Click **"Run"**
5. Verify results in the bottom panel

**Advantages:**
- Visual feedback
- Can see results immediately
- No command line required

### Option 2: Supabase CLI

```bash
npx supabase db execute --project-ref qrxwgjjgaekalvaqzpuf --file database/seed-expanded-global-libraries.sql
```

### Option 3: Direct PostgreSQL Connection

If you have the database password:

```bash
psql "postgresql://postgres.qrxwgjjgaekalvaqzpuf:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f database/seed-expanded-global-libraries.sql
```

## What Will Happen

The SQL file uses `ON CONFLICT ... DO UPDATE` which means:
- **If records exist:** They will be updated with new descriptions
- **If records don't exist:** They will be inserted as new
- **No data loss:** Existing org-specific libraries remain untouched

## Verification

After deployment, the SQL file runs verification queries showing:

1. **Root Causes by Category:**
   - Operational: 15
   - Strategic: 12
   - Financial: 10
   - Compliance: 8
   - Cybersecurity: 10
   - People: 7
   - Environmental: 4
   - Geopolitical: 4

2. **Impacts by Category:**
   - Financial: 12
   - Operational: 10
   - People: 5
   - Strategic: 6
   - Reputational: 4
   - Legal/Regulatory: 4
   - Environmental: 2
   - Systemic: 2

## Testing After Deployment

1. Go to: http://localhost:3000/
2. Click **"Add New Risk"**
3. Open **Root Cause** dropdown
4. **Expected:** You should see 70 root causes organized by domain
5. Open **Impact** dropdown
6. **Expected:** You should see 45 impacts organized by category

## Coverage Summary

### Root Cause Domains:
✅ Operational (process, infrastructure, supply chain)
✅ Strategic (market disruption, competition, M&A)
✅ Financial (liquidity, credit, market risk)
✅ Compliance (regulatory, legal, contracts)
✅ Cybersecurity & Technology (attacks, vulnerabilities, cloud)
✅ People & Culture (leadership, talent, safety)
✅ Environmental & ESG (climate, carbon, compliance)
✅ Geopolitical (conflicts, trade, health crises)

### Impact Categories:
✅ Financial Quantifiable (revenue, costs, credit rating)
✅ Operational (downtime, disruption, delays)
✅ People (injuries, turnover, morale)
✅ Strategic (market share, innovation, partnerships)
✅ Reputational (brand, trust, media)
✅ Legal/Regulatory (fines, litigation, licenses)
✅ Environmental (damage, carbon costs)
✅ Systemic (contagion, market-wide effects)

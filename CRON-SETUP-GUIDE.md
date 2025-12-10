# RSS Scanner Cron Job Setup Guide

**Phase 1 Completion - Day 1 Task**

This guide explains how to configure automated daily RSS scanning for the Risk Intelligence system.

---

## Option 1: GitHub Actions (Recommended) ✅

**Advantages:**
- Free for public/private repos
- Reliable execution
- Built-in failure notifications
- Easy to monitor via GitHub UI
- No external dependencies

### Setup Instructions

#### 1. Configure GitHub Secrets

Go to your GitHub repository:
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these two secrets:

**Secret 1: SUPABASE_URL**
- Name: `SUPABASE_URL`
- Value: `https://qrxwgjjgaekalvaqzpuf.supabase.co`

**Secret 2: SUPABASE_SERVICE_ROLE_KEY**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Get from `.env.development` → `VITE_SUPABASE_SERVICE_ROLE_KEY`
  - Or from Supabase Dashboard: Project Settings → API → service_role key

#### 2. Commit and Push the Workflow

The workflow file has been created at:
```
.github/workflows/rss-scanner-cron.yml
```

Commit and push to GitHub:
```bash
git add .github/workflows/rss-scanner-cron.yml
git commit -m "Add automated RSS scanner cron job"
git push origin main
```

#### 3. Verify Workflow is Active

1. Go to GitHub repository → Actions tab
2. You should see "RSS Intelligence Scanner (Daily)" workflow
3. Click "Run workflow" to test manually (don't wait for scheduled run)

#### 4. Monitor Execution

**Check workflow runs:**
- GitHub → Actions tab → Click on workflow run
- View logs to see RSS scanner output

**Check Edge Function logs:**
- Supabase Dashboard → Edge Functions → scan-rss-feeds → Logs
- Look for execution around 2:00 AM UTC daily

**Check database for new events:**
```sql
SELECT COUNT(*), MAX(created_at)
FROM external_events
WHERE created_at > NOW() - INTERVAL '1 day';
```

#### 5. Schedule

- **Current:** Daily at 2:00 AM UTC
- **To change:** Edit `.github/workflows/rss-scanner-cron.yml` line 5
  - Format: `cron: 'minute hour day month weekday'`
  - Example: `cron: '0 14 * * *'` = 2:00 PM UTC daily
  - Use https://crontab.guru/ to generate cron expressions

---

## Option 2: Supabase pg_cron (Alternative)

If you have Supabase Pro plan, you can use built-in pg_cron:

### Setup via SQL Editor

```sql
-- Enable pg_cron extension (Supabase Pro only)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily RSS scan at 2 AM UTC
SELECT cron.schedule(
  'daily-rss-intelligence-scan',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/scan-rss-feeds',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{"trigger": "scheduled"}'::jsonb
  );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule (if needed)
SELECT cron.unschedule('daily-rss-intelligence-scan');
```

**Note:** Replace `YOUR_SERVICE_ROLE_KEY` with actual service role key.

---

## Option 3: External Cron Service

If GitHub Actions doesn't work, use an external service:

### Recommended Services:
- **cron-job.org** (Free, reliable)
- **EasyCron** (Free tier available)
- **UptimeRobot** (monitors + triggers)

### Configuration

**URL to call:**
```
https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/scan-rss-feeds
```

**Method:** POST

**Headers:**
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
Content-Type: application/json
```

**Body:**
```json
{"trigger": "scheduled"}
```

**Schedule:** Daily at 2:00 AM UTC (cron: `0 2 * * *`)

---

## Testing the Scanner

Before setting up automation, test manually:

### Manual Test Script

Run this to test the RSS scanner:
```bash
bash test-rss-manual.sh
```

Or manually:
```bash
# Load environment variables
source .env.development

# Call Edge Function
curl -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/scan-rss-feeds" \
  -H "Authorization: Bearer ${VITE_SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual"}'
```

Expected output:
```json
{
  "success": true,
  "feedsScanned": 9,
  "eventsCreated": 15,
  "alertsCreated": 3,
  "processingTime": "45s"
}
```

---

## Monitoring & Troubleshooting

### Check if Cron is Running

**GitHub Actions:**
- Go to repository → Actions tab
- See workflow runs and logs

**Supabase pg_cron:**
```sql
SELECT jobname, schedule, last_run, next_run
FROM cron.job_run_details;
```

### Check RSS Scanner Logs

1. Supabase Dashboard
2. Edge Functions → scan-rss-feeds → Logs
3. Filter by date/time to see scheduled runs

### Verify Events Created

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as events,
  COUNT(DISTINCT source) as sources
FROM external_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Verify Alerts Created

```sql
SELECT
  DATE(ia.created_at) as date,
  COUNT(*) as alerts,
  AVG(ia.confidence_score) as avg_confidence
FROM intelligence_alerts ia
WHERE ia.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(ia.created_at)
ORDER BY date DESC;
```

---

## Expected Behavior

After successful setup:

**Daily at 2:00 AM UTC:**
1. Cron job triggers RSS scanner
2. Scanner fetches from 9 RSS feeds
3. ~500-1000 articles fetched
4. ~97% filtered by keywords (only 15-50 remain)
5. Remaining events analyzed by Claude AI
6. High-confidence alerts created (typically 2-10 per day)
7. Users see new alerts in Intelligence Dashboard

**Database impact:**
- ~15-50 new `external_events` per day
- ~2-10 new `intelligence_alerts` per day
- Duplicates automatically prevented (7-day window)

---

## Success Checklist

- ✅ GitHub secrets configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- ✅ Workflow file committed and pushed
- ✅ Manual test run successful
- ✅ First scheduled run completed
- ✅ Events appearing in database
- ✅ Alerts created from high-confidence matches
- ✅ No errors in Edge Function logs

---

## Next Steps

After cron is working:
1. Monitor for 3-7 days to verify consistency
2. Adjust schedule if needed (different time zone)
3. Tune MIN_CONFIDENCE threshold if too many/few alerts
4. Add monitoring alerts for failures

---

## Support

**Errors in GitHub Actions:**
- Check Actions tab → Failed workflow → View logs
- Common issue: Missing secrets

**No events created:**
- Check RSS feeds are accessible
- Verify ANTHROPIC_API_KEY is set in Edge Function secrets
- Check Supabase Edge Function logs for errors

**Too many/few alerts:**
- Adjust MIN_CONFIDENCE in `scan-rss-feeds/index.ts` (currently 0.6)
- Lower = more alerts (0.5 = 50% confidence minimum)
- Higher = fewer alerts (0.8 = 80% confidence minimum)

---

**Created:** 2025-12-09
**Phase 1 Completion Sprint - Day 1**

# AI Risk Mapping Edge Function - Deployment Guide

## Overview

The `analyze-incident-for-risk-mapping` Edge Function provides AI-powered incident-to-risk mapping using Claude AI. It:

- Analyzes incidents against your organization's risk register
- Uses historical pattern matching for context
- Generates risk mapping suggestions with confidence scores (70-100%)
- Tracks keywords, reasoning, and similar incident counts for audit trails
- Automatically inserts suggestions into `incident_risk_ai_suggestions` table

## Prerequisites

Before deploying, ensure these secrets are configured in Supabase:

1. **ANTHROPIC_API_KEY** - Claude AI API key
2. **SUPABASE_URL** - Your Supabase project URL (auto-configured)
3. **SUPABASE_SERVICE_ROLE_KEY** - Service role key (auto-configured)

### Set ANTHROPIC_API_KEY Secret

The Edge Function requires access to Claude AI. Set the secret using one of these methods:

#### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/settings/functions
2. Click **"Secrets"** tab
3. Click **"Add Secret"**
4. Enter:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `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`
5. Click **"Save"**

#### Option 2: Supabase CLI
```bash
npx supabase secrets set ANTHROPIC_API_KEY="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" --project-ref qrxwgjjgaekalvaqzpuf
```

## Deployment Methods

### Method 1: Manual Deployment via Dashboard (Easiest)

1. **Navigate to Edge Functions**
   - Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions

2. **Create New Function**
   - Click **"Create a new function"**
   - Function name: `analyze-incident-for-risk-mapping`
   - Click **"Create function"**

3. **Copy Function Code**
   - Open: `/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/NEW-MINRISK/supabase/functions/analyze-incident-for-risk-mapping/index.ts`
   - Copy entire file contents
   - Paste into the Supabase editor
   - Click **"Deploy"**

### Method 2: Supabase CLI Deployment

If you have Supabase CLI authenticated:

```bash
cd "/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/NEW-MINRISK"

# Deploy function
npx supabase functions deploy analyze-incident-for-risk-mapping --project-ref qrxwgjjgaekalvaqzpuf
```

If not authenticated, run:
```bash
npx supabase login
```

## Testing the Edge Function

After deployment, test it using curl or the dashboard:

### Test via Dashboard
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions
2. Click on `analyze-incident-for-risk-mapping`
3. Click **"Test"** tab
4. Use this payload:

```json
{
  "incident_id": "your-incident-uuid-here"
}
```

5. Click **"Send Request"**

### Test via curl
```bash
curl -X POST 'https://qrxwgjjgaekalvaqzpuf.supabase.co/functions/v1/analyze-incident-for-risk-mapping' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"incident_id": "your-incident-uuid-here"}'
```

### Expected Response

**Success:**
```json
{
  "success": true,
  "incident_id": "uuid",
  "suggestions_count": 2,
  "suggestions": [
    {
      "risk_code": "FIN-OPS-001",
      "risk_title": "Transaction Processing Errors",
      "confidence_score": 85,
      "keywords_matched": ["transaction", "error", "processing"]
    }
  ],
  "historical_context": {
    "similar_count": 3,
    "most_common_risk": "FIN-OPS-001",
    "confidence": 67
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here",
  "technical_details": "Stack trace..."
}
```

## Integration with Application

### Call from Frontend

```typescript
// src/lib/incidents.ts

export async function analyzeIncidentForRiskMapping(incidentId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-incident-for-risk-mapping`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ incident_id: incidentId })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Analysis failed')
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing incident:', error)
    throw error
  }
}
```

### Trigger Automatically on Incident Creation

```typescript
// In your incident creation flow
const { data: incident, error } = await createIncident(incidentData)

if (!error && incident) {
  // Trigger AI analysis asynchronously (don't block user)
  analyzeIncidentForRiskMapping(incident.id)
    .then(result => console.log('AI analysis complete:', result))
    .catch(error => console.warn('AI analysis failed:', error))
}
```

## Monitoring & Debugging

### View Logs
1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions
2. Click on `analyze-incident-for-risk-mapping`
3. Click **"Logs"** tab
4. Filter by time period or search for specific errors

### Common Issues

#### 1. "Missing ANTHROPIC_API_KEY"
**Solution:** Set the secret using Method from Prerequisites section above

#### 2. "Incident not found"
**Solution:** Verify the incident_id exists in the incidents table

#### 3. "No active risks found"
**Solution:** Ensure organization has risks with status='OPEN' or 'MONITORING'

#### 4. "AI analysis timeout"
**Solution:**
- Check if Claude API is accessible
- Verify API key is valid
- Check if request is too large (reduce risk count if needed)

#### 5. "Failed to save AI suggestions"
**Solution:**
- Verify `incident_risk_ai_suggestions` table exists
- Check RLS policies allow service role inserts
- Ensure no unique constraint violations

## Performance Considerations

- **Response Time:** 5-15 seconds typical (depends on risk count)
- **Timeout:** 30 seconds maximum
- **Rate Limiting:** Claude API: 50 requests/minute
- **Cost:** ~$0.01-0.03 per analysis (Claude Sonnet pricing)

## Security

- Edge Function uses **service role** to bypass RLS for inserts
- Only authenticated users can call the function
- All suggestions marked with `ai_model_version` for audit trail
- Reasoning and keywords preserved for transparency

## Next Steps

After deployment:
1. ✅ Test with a real incident
2. ✅ Verify suggestions appear in database
3. ✅ Build ADMIN review dashboard to show suggestions
4. ✅ Implement accept/reject workflow

---

**Documentation Version:** 1.0
**Last Updated:** 2025-12-03
**Edge Function:** analyze-incident-for-risk-mapping
**AI Model:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

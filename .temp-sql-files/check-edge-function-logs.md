# Check Edge Function Logs

The Edge Function is returning 502 errors, which means it's crashing.

## How to Check Logs

1. Go to: https://supabase.com/dashboard/project/qrxwgjjgaekalvaqzpuf/functions/analyze-intelligence/details
2. Click on **"Logs"** tab
3. Look for the most recent entries (last 5-10 minutes)
4. Look for red error messages or stack traces

## What to Look For

**Possible errors:**
- ❌ TypeError: Cannot read property 'X' of undefined
- ❌ Database constraint violation
- ❌ Invalid JSON parsing
- ❌ Missing required field

## Expected vs Actual

**Expected:** Function completes successfully and creates alerts

**Actual:** Function crashes with 502 error

Please copy the error messages from the logs and share them here.

# Phase 1 Deployment Guide: Event Notification System

## Overview
This guide covers the deployment of automated event reminder emails (24h and 1h before events).

---

## Prerequisites
- Supabase CLI installed and configured
- Access to Supabase project
- SendGrid API key configured in Supabase secrets

---

## Step 1: Apply Database Migration

```bash
# Navigate to project root
cd c:\Users\ander\source\repos\frontend_doxologos

# Apply migration
supabase db push
```

**What this does:**
- Adds `reminder_24h_sent_at` and `reminder_1h_sent_at` columns to `inscricoes_eventos`
- Creates index for efficient querying

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inscricoes_eventos' 
AND column_name LIKE 'reminder%';
```

---

## Step 2: Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy event-send-reminders --no-verify-jwt

# Expected output:
# ✓ Deployed Function event-send-reminders
```

**Note:** `--no-verify-jwt` allows the function to be called by external cron services without JWT authentication.

---

## Step 3: Test the Function Manually

### Option A: Using curl
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/event-send-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Option B: Using Supabase Dashboard
1. Go to **Edge Functions** in Supabase Dashboard
2. Select `event-send-reminders`
3. Click **Invoke Function**
4. Check logs for output

### Option C: Using test SQL script
1. Run the SQL in `test.sql` to create test events
2. Invoke the function
3. Check your email for reminders

---

## Step 4: Configure Scheduled Execution

### Option A: Using cron-job.org (Recommended for simplicity)

1. Go to [cron-job.org](https://cron-job.org)
2. Create account and new cron job
3. Configure:
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/event-send-reminders`
   - **Schedule**: Every 30 minutes (`*/30 * * * *`)
   - **HTTP Method**: POST
   - **Headers**: 
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`

### Option B: Using GitHub Actions (For projects on GitHub)

Create `.github/workflows/event-reminders.yml`:

```yaml
name: Event Reminders
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Event Reminders
        run: |
          curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/event-send-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Option C: Using Supabase Cron (When available)

```sql
-- This will be available in future Supabase versions
SELECT cron.schedule(
  'event-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/event-send-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Step 5: Monitor and Verify

### Check Function Logs
```bash
# View recent logs
supabase functions logs event-send-reminders --tail
```

### Check Database
```sql
-- Verify reminders are being sent
SELECT 
    ie.patient_email,
    ie.reminder_24h_sent_at,
    ie.reminder_1h_sent_at,
    e.titulo,
    e.data_inicio
FROM inscricoes_eventos ie
JOIN eventos e ON e.id = ie.evento_id
WHERE ie.status = 'confirmed'
AND (ie.reminder_24h_sent_at IS NOT NULL OR ie.reminder_1h_sent_at IS NOT NULL)
ORDER BY ie.reminder_24h_sent_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: No emails being sent
**Check:**
1. SendGrid API key is configured: `supabase secrets list`
2. Function logs for errors: `supabase functions logs event-send-reminders`
3. Email address is valid in test data

### Issue: Reminders sent multiple times
**Check:**
1. Cron job is not running too frequently
2. Database timestamps are being updated correctly
3. Only one cron service is configured

### Issue: Function timeout
**Check:**
1. Number of pending reminders (should process in batches if needed)
2. SendGrid API response time
3. Increase function timeout in Supabase settings if needed

---

## Rollback Plan

If issues occur:

```bash
# 1. Disable cron job immediately

# 2. Revert migration
supabase db reset

# 3. Undeploy function (optional)
# Note: Supabase doesn't have direct undeploy, just stop calling it
```

---

## Success Criteria

✅ Migration applied successfully  
✅ Function deploys without errors  
✅ Test reminder email received  
✅ Cron job configured and running  
✅ Database timestamps updating correctly  
✅ No duplicate emails sent  

---

## Next Steps

After successful deployment:
1. Monitor for 24-48 hours
2. Collect user feedback
3. Proceed to **Phase 2: Financial Splits**

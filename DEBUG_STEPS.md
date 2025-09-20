# 🐛 Debug Steps: Message Counting Issues

## Step 1: Check Backend Logs

1. **Start your backend** and watch the console:
   ```bash
   cd scripts
   python fastapi_backend.py
   ```

2. **Look for debug messages** like:
   ```
   DEBUG: Checking limit for user@email.com: 0/2 - Can send: True
   DEBUG: Incrementing message count for user@email.com: 0 -> 1
   DEBUG: Successfully updated message count to 1
   ```

## Step 2: Test Backend Directly

1. **Check current status**:
   ```bash
   curl http://localhost:8000/debug/user-status/your-email@gmail.com
   ```

2. **Reset messages**:
   ```bash
   curl -X POST http://localhost:8000/test/reset-messages/your-email@gmail.com
   ```

3. **Set to 1 message**:
   ```bash
   curl -X POST http://localhost:8000/test/set-messages/your-email@gmail.com/1
   ```

## Step 3: Test Frontend

1. **Open browser console** (F12)
2. **Record a thought** and watch for:
   ```
   DEBUG: Recording thought, current message count: 0
   DEBUG: Refreshing session...
   DEBUG: Session refreshed, new message count: 1
   ```

## Step 4: Check Database

If you have access to your Supabase database, check the `user_tiers` table:

```sql
SELECT * FROM user_tiers WHERE user_email = 'your-email@gmail.com';
```

## Common Issues & Solutions

### Issue 1: Backend not incrementing
**Symptoms**: No debug logs showing increment
**Solution**: Check if backend is running and accessible

### Issue 2: Session not refreshing
**Symptoms**: Frontend shows old count
**Solution**: Check browser console for session refresh errors

### Issue 3: Database not updating
**Symptoms**: Backend logs show success but database unchanged
**Solution**: Check Supabase connection and permissions

### Issue 4: CORS issues
**Symptoms**: Frontend can't reach backend
**Solution**: Check CORS settings in backend

## Quick Test Commands

```bash
# Check if backend is running
curl http://localhost:8000/

# Check user status
curl http://localhost:8000/debug/user-status/your-email@gmail.com

# Reset messages
curl -X POST http://localhost:8000/test/reset-messages/your-email@gmail.com

# Test record thought
curl -X POST http://localhost:8000/record-thought \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"your-email@gmail.com","journalEntry":"test","goal":"test"}'
```

## What to Look For

1. **Backend logs** showing message count changes
2. **Frontend console** showing session refresh
3. **Database** showing updated message counts
4. **UI** showing updated message counter

Run these steps and let me know what you see in the logs!

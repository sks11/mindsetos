# 🧪 Testing Guide: Message Limits with 2-Message Test Configuration

## 🚀 Quick Setup

### 1. **Database Setup**
```bash
# Run the database migration
psql -h your-supabase-host -U postgres -d postgres -f scripts/create_user_tiers_schema.sql
```

### 2. **Start the Backend**
```bash
cd scripts
python fastapi_backend.py
# Backend will run on http://localhost:8000
```

### 3. **Start the Frontend**
```bash
pnpm dev
# Frontend will run on http://localhost:3000
```

## 🧪 Testing Scenarios

### **Test Configuration**
- **Free Tier**: 2 messages per month
- **Premium Tier**: 5 messages per month
- **Easy Testing**: Use admin panel to manipulate message counts

### **Scenario 1: Test Free Tier Limit (2 messages)**

1. **Login** to your app
2. **Click "Admin"** button in the header
3. **Set to Free Tier**: Click "Set Free (2/month)"
4. **Reset Messages**: Click "Reset to 0"
5. **Test Journal Analysis**:
   - Write a journal entry
   - Click "Analyze" → Should work (1/2 messages used)
   - Write another journal entry
   - Click "Analyze" → Should work (2/2 messages used)
   - Write a third journal entry
   - Click "Analyze" → Should show limit exceeded error and upgrade prompt

### **Scenario 2: Test Premium Tier (5 messages)**

1. **Switch to Premium**: Click "Set Premium (5/month)"
2. **Reset Messages**: Click "Reset to 0"
3. **Test Multiple Analyses**: You should be able to do 5 analyses before hitting the limit

### **Scenario 3: Test Edge Cases**

1. **Set to Limit**: Click "Set to 2 (Limit)" while on Free tier
2. **Try Analysis**: Should immediately show limit exceeded
3. **Reset and Test**: Click "Reset to 0" and try again

### **Scenario 4: Test Monthly Reset Logic**

1. **Set Messages to 2**: Click "Set to 2 (Limit)"
2. **Verify Limit**: Try analysis → should fail
3. **Simulate Month Change**: 
   - Go to your database
   - Update `current_month_year` to next month (e.g., if current is "2024-01", change to "2024-02")
   - Refresh the page
   - Try analysis → should work (count reset to 0)

## 🔧 Admin Panel Features

### **Tier Management**
- **Set Free (2/month)**: Switch to free tier with 2-message limit
- **Set Premium (5/month)**: Switch to premium tier with 5-message limit

### **Message Count Testing**
- **Reset to 0**: Set message count to 0
- **Set to 1**: Set message count to 1 (1 message remaining on free tier)
- **Set to 2 (Limit)**: Set message count to 2 (at limit for free tier)

## 📊 What to Look For

### **UI Indicators**
- **Message Counter**: Shows "X/2 messages this month" in the header
- **Tier Badge**: Shows "Free" or "Premium" badge
- **Error Messages**: Clear messages about monthly limits
- **Upgrade Prompt**: Beautiful modal when limit is reached

### **Backend Behavior**
- **Automatic Counting**: Each successful analysis increments the counter
- **Limit Enforcement**: 429 status code when limit exceeded
- **Monthly Reset**: Automatic reset when month changes

## 🐛 Troubleshooting

### **Common Issues**

1. **"Admin" button not visible**
   - Make sure you're logged in
   - Check browser console for errors

2. **Message count not updating**
   - Refresh the page after admin actions
   - Check backend logs for errors

3. **Database connection issues**
   - Verify Supabase credentials in `.env`
   - Check if backend is running on port 8000

### **Debug Commands**

```bash
# Check backend logs
tail -f scripts/fastapi_backend.py

# Test backend endpoints directly
curl -X GET http://localhost:8000/user-tier/your-email@example.com
curl -X POST http://localhost:8000/test/reset-messages/your-email@example.com
```

## 🎯 Expected Results

### **Free Tier (2 messages)**
- ✅ First analysis: Works, shows "1/2 messages this month"
- ✅ Second analysis: Works, shows "2/2 messages this month"
- ❌ Third analysis: Shows error "You've reached your free tier limit of 2 messages this month"

### **Premium Tier (5 messages)**
- ✅ First 5 analyses: All work
- ❌ Sixth analysis: Shows error "You've reached your premium tier limit of 5 messages this month"

### **Monthly Reset**
- ✅ After month change: Counter resets to 0
- ✅ New analyses work normally

## 🔄 Production Configuration

When ready for production, change these values in `scripts/fastapi_backend.py`:

```python
# Change from:
messages_limit = 2 if request.tier == "free" else 5

# To:
messages_limit = 50 if request.tier == "free" else 500
```

And update the default limits in the `get_or_create_user_tier` function.

## 📝 Test Checklist

- [ ] Free tier allows exactly 2 analyses
- [ ] Premium tier allows exactly 5 analyses  
- [ ] Limit exceeded shows proper error message
- [ ] Upgrade prompt appears when limit reached
- [ ] Message counter updates in real-time
- [ ] Admin panel can reset and set message counts
- [ ] Monthly reset logic works (simulated)
- [ ] UI shows correct tier and usage information

Happy testing! 🎉

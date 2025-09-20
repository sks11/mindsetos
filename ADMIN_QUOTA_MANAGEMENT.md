# 🔧 Admin Quota Management Guide

## ✅ **Current Admin Features**

### **1. Tier Management**
- **Set Free Tier**: 2 messages per month
- **Set Premium Tier**: 5 messages per month (for testing)
- **Switch between tiers** for any user

### **2. Message Count Management**
- **Reset to 0**: Clear user's monthly usage
- **Set to 1**: Set user to 1 message used
- **Set to 2**: Set user to limit (2 messages for free tier)

### **3. Real-time Monitoring**
- **Current Usage Display**: Shows "X/2 messages this month"
- **Tier Status**: Shows current tier (Free/Premium)
- **User Email**: Shows which user is being managed

## 🎯 **How to Reset Anyone's Quota**

### **Method 1: Admin Panel (Current User)**
1. **Login as admin** (your email in `lib/admin.ts`)
2. **Click "Admin" button** in header
3. **Click "Reset to 0"** button
4. **User can now use messages again**

### **Method 2: Direct API Call (Any User)**
```bash
# Reset specific user's quota
curl -X POST http://localhost:8000/test/reset-messages/user@example.com

# Set specific user to any count
curl -X POST http://localhost:8000/test/set-messages/user@example.com/0
```

### **Method 3: Database Direct (Advanced)**
```sql
-- Reset any user's monthly usage
UPDATE user_tiers 
SET messages_used_this_month = 0 
WHERE user_email = 'user@example.com';

-- Set any user to specific count
UPDATE user_tiers 
SET messages_used_this_month = 1 
WHERE user_email = 'user@example.com';
```

## 🚀 **Admin Workflow Examples**

### **Scenario 1: User Hit Limit, Needs Reset**
1. **User complains** they can't use the app
2. **Admin logs in** and clicks "Admin" button
3. **Admin clicks "Reset to 0"**
4. **User can now use messages again**

### **Scenario 2: Upgrade User to Premium**
1. **User requests premium upgrade**
2. **Admin clicks "Set Premium (5/month)"**
3. **Admin clicks "Reset to 0"** (optional, to give fresh start)
4. **User now has 5 messages per month**

### **Scenario 3: Test User Experience**
1. **Admin clicks "Set to 2 (Limit)"**
2. **User tries to use app** → sees quota exceeded message
3. **Admin clicks "Reset to 0"**
4. **User can use app again**

## 🔧 **Available Admin Endpoints**

### **Tier Management**
- `POST /update-tier` - Change user's subscription tier
- `GET /user-tier/{email}` - Get user's current tier and usage

### **Message Count Management**
- `POST /test/reset-messages/{email}` - Reset user's count to 0
- `POST /test/set-messages/{email}/{count}` - Set user's count to specific number

### **Debug & Monitoring**
- `GET /debug/user-status/{email}` - Get detailed user status
- `GET /user-history/{email}` - Get user's journal history

## 🎯 **Quick Admin Commands**

```bash
# Check user status
curl http://localhost:8000/debug/user-status/user@example.com

# Reset user quota
curl -X POST http://localhost:8000/test/reset-messages/user@example.com

# Upgrade user to premium
curl -X POST http://localhost:8000/update-tier \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"user@example.com","tier":"premium"}'

# Set user to 1 message remaining
curl -X POST http://localhost:8000/test/set-messages/user@example.com/1
```

## 🔐 **Security Notes**

- **Admin access** is controlled by email whitelist in `lib/admin.ts`
- **Only whitelisted emails** can see the admin panel
- **All admin actions** are logged in backend console
- **Database changes** are tracked with timestamps

## 📊 **Monitoring User Usage**

### **Check User Status**
```bash
curl http://localhost:8000/debug/user-status/user@example.com
```

**Response:**
```json
{
  "user_email": "user@example.com",
  "tier_info": {
    "tier": "free",
    "messages_used_this_month": 2,
    "messages_limit": 2,
    "current_month_year": "2024-01"
  },
  "can_send": false
}
```

## 🎉 **Summary**

**Yes, admins have full quota management capabilities:**

✅ **Reset any user's quota to 0**  
✅ **Set any user's message count**  
✅ **Change user tiers** (Free ↔ Premium)  
✅ **Monitor real-time usage**  
✅ **Access via UI or API**  
✅ **Secure email-based access control**  

The admin system is fully functional for quota management! 🚀

# 🔐 Admin Setup Guide

## How to Configure Admin Access

### 1. **Add Your Email to Admin List**

Edit `lib/admin.ts` and add your email to the `ADMIN_EMAILS` array:

```typescript
export const ADMIN_EMAILS = [
  'your-email@gmail.com',        // Replace with your actual email
  'admin@mindsetos.com',         // Add more admin emails as needed
  'another-admin@example.com',   // Additional admins
]
```

### 2. **Admin Access Levels**

#### **Development Mode** (Default)
- Admin panel is enabled for development
- Only users in `ADMIN_EMAILS` can see the admin button
- Perfect for testing

#### **Production Mode**
- Admin panel is only enabled if `ADMIN_EMAILS` has entries
- Only whitelisted emails can access admin features
- Secure for production use

### 3. **How to Test Admin Access**

1. **Add your email** to `ADMIN_EMAILS` in `lib/admin.ts`
2. **Login** with that email address
3. **Look for "Admin" button** in the header (only visible to admins)
4. **Click "Admin"** to access the testing panel

### 4. **Admin Features**

The admin panel allows you to:
- **Switch user tiers**: Free (2/month) ↔ Premium (5/month)
- **Manipulate message counts**: Reset to 0, Set to 1, Set to 2 (limit)
- **Test limit enforcement**: Easily test the 2-message limit
- **Monitor usage**: See current tier and message usage

### 5. **Security Notes**

- **Email-based authentication**: Only users with whitelisted emails can access admin features
- **No database changes needed**: Admin status is determined by email whitelist
- **Easy to manage**: Just add/remove emails from the array
- **Development safe**: Admin panel only shows for authorized users

### 6. **Adding More Admins**

To add more admin users:

1. **Get their email address**
2. **Add to `ADMIN_EMAILS` array** in `lib/admin.ts`
3. **Deploy the changes**
4. **They can now access admin features**

### 7. **Removing Admin Access**

To remove admin access:

1. **Remove their email** from `ADMIN_EMAILS` array
2. **Deploy the changes**
3. **They will no longer see the admin button**

## 🧪 Testing Admin Access

### **Test 1: Admin User**
1. Add your email to `ADMIN_EMAILS`
2. Login with that email
3. Should see "Admin" button in header
4. Click to access admin panel

### **Test 2: Non-Admin User**
1. Login with an email NOT in `ADMIN_EMAILS`
2. Should NOT see "Admin" button
3. No admin panel access

### **Test 3: Development vs Production**
- **Development**: Admin panel enabled by default
- **Production**: Admin panel only enabled if `ADMIN_EMAILS` has entries

## 🔧 Quick Setup for Testing

1. **Edit `lib/admin.ts`**:
   ```typescript
   export const ADMIN_EMAILS = [
     'your-actual-email@gmail.com',  // Replace with your real email
   ]
   ```

2. **Restart your development server**:
   ```bash
   pnpm dev
   ```

3. **Login with that email** and look for the "Admin" button!

## 🚀 Production Deployment

For production, make sure to:
1. **Add only necessary admin emails** to the whitelist
2. **Remove any test emails** before going live
3. **Keep the admin list minimal** for security
4. **Document who has admin access** for your team

That's it! Now only authorized users can access the admin panel. 🔐

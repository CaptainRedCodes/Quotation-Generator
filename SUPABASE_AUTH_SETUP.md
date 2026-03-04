# Supabase Auth Setup Guide

This application uses **Supabase Auth** for user authentication instead of managing passwords in the database. This provides better security, scalability, and user management.

## Benefits of Supabase Auth

✅ **Security**: Passwords are hashed and managed by Supabase  
✅ **Scalability**: Built-in user management and session handling  
✅ **Built-in Features**: Email verification, password reset, multi-factor authentication ready  
✅ **No Database Table**: User credentials aren't stored in your PostgreSQL database  

## Setup Instructions

### 1. Verify Environment Variables

Check that your `.env` file has these Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://vfjvqtjhkmpfvrkamqdc.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_7aEdQqQ49BgKeq443aEUKg_lsJkqYo4"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# PostgreSQL Database
DATABASE_URL="postgresql://postgres:Kayambody2002@db.vfjvqtjhkmpfvrkamqdc.supabase.co:5432/postgres?sslmode=require"
```

> ⚠️ **Important**: Never commit `SUPABASE_SERVICE_ROLE_KEY` to version control. It's already in `.gitignore`.

### 2. Create Database Tables

Run the Prisma migrations to create application tables (but NOT the User table):

```bash
npm run db:push
```

This creates:
- `CompanySettings` - Store company information
- `Product` - Product catalog
- `ProductComponent` - Components of products
- `Quotation` - Quotation records
- `QuotationItem` - Items in quotations

### 3. Seed Supabase Auth with Initial User

Run the seed script to create the first admin user:

```bash
npm run db:seed
```

This creates a user in Supabase Auth with:
- **Email**: `admin@arinox.com`
- **Password**: `admin123`

The seed script also creates sample company settings and products.

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/login` and login with:
- Email: `admin@arinox.com`
- Password: `admin123`

## How Authentication Works

### Login Flow

1. User enters email and password on the login page
2. `/lib/auth.ts` calls Supabase Auth API: `POST /auth/v1/token?grant_type=password`
3. Supabase verifies credentials and returns user info with JWT token
4. NextAuth creates a session with the user's ID and role
5. Session is encrypted in cookies

### Password Change Flow

1. User goes to Settings → Account → Change Password
2. Form sends new password to `POST /api/settings`
3. API uses `SUPABASE_SERVICE_ROLE_KEY` to call Supabase Admin API
4. Supabase updates the user's password securely
5. User sees success message

### Session Management

- Sessions are JWT-based and expire after 8 hours
- Middleware (`middleware.ts`) protects the `/dashboard` routes
- Sessions are stored in encrypted cookies (via NextAuth)

## Creating New Users

To create additional users, use the Supabase Admin API directly or Supabase Dashboard:

### Option 1: Via Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Click "Authentication" in the sidebar
3. Click "Create new user"
4. Enter email and password
5. Click "Create user"

### Option 2: Via API (from your backend)

```typescript
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'secure-password',
    email_confirm: true,
    user_metadata: {
      name: 'User Name',
      role: 'admin'
    }
  })
})
```

## Key Files

- **`lib/auth.ts`** - NextAuth configuration with Supabase Auth provider
- **`app/api/auth/[...nextauth]/route.ts`** - NextAuth route handler
- **`app/login/page.tsx`** - Login page with email/password form
- **`middleware.ts`** - Protected routes middleware
- **`prisma/seed.ts`** - Database seeding script (creates users in Supabase Auth)
- **`app/api/settings/route.ts`** - Password change endpoint (uses Supabase Admin API)

## Troubleshooting

### Login fails with "CredentialsSignin" error

**Cause**: User doesn't exist in Supabase Auth or password is incorrect

**Solution**:
1. Check email and password are correct
2. Create the user via Supabase Dashboard or `npm run db:seed`
3. Check `SUPABASE_SERVICE_ROLE_KEY` is valid in `.env`

### "Failed to change password" error

**Cause**: `SUPABASE_SERVICE_ROLE_KEY` is invalid or expired

**Solution**:
1. Go to your Supabase project → Project Settings → API
2. Copy the service role key (keep it secret!)
3. Update `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Session expires too quickly

**Cause**: NextAuth session timeout is set to 8 hours by default

**Solution**: Modify the session duration in `lib/auth.ts`:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60  // 24 hours instead of 8
}
```

## Next Steps

1. **Add more users** - Use Supabase Dashboard or create an admin user management page
2. **Customize roles** - Store user roles in `user_metadata` and check them in your app
3. **Add email verification** - Configure email templates in Supabase Auth settings
4. **Enable password reset** - Users can request password reset emails via Supabase
5. **Multi-factor authentication** - Supabase Auth supports TOTP and SMS

## Security Best Practices

- 🔐 Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser
- 🔐 Only use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for client-side operations
- 🔐 Validate all user inputs on the backend
- 🔐 Use HTTPS in production
- 🔐 Rotate `NEXTAUTH_SECRET` in production
- 🔐 Keep passwords secure (minimum 8 characters enforced)

## Supabase Resources

- 📖 [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- 📖 [Supabase Auth API Reference](https://supabase.com/docs/reference/auth/api)
- 📖 [NextAuth.js Documentation](https://next-auth.js.org/)

---

**Last Updated**: Session 3 (Supabase Auth Integration)

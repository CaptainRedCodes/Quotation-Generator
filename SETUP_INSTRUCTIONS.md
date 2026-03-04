# Setup Instructions - Fix the Prisma Error

## Problem Fixed
The error `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions` was caused by a **missing DATABASE_URL configuration in the Prisma schema**.

## What Was Wrong
The `prisma/schema.prisma` file had:
```prisma
datasource db {
  provider = "postgresql"
}
```

It was **missing the `url` field** that tells Prisma where to connect.

## What Was Fixed
Changed to:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Steps to Complete Setup

### 1. Verify .env File
Your `.env` file already has the DATABASE_URL set up. Check it contains:
```
DATABASE_URL=postgresql://postgres:[password]@db.gzcseefvrmmqymugtfjv.supabase.co:5432/postgres
```

### 2. Install Dependencies (if not already done)
```bash
npm install
```

### 3. Push Schema to Database (REQUIRED - Do This First!)
**This step is REQUIRED before running the app!**

Run this command to create all the database tables:
```bash
npm run db:push
```

This will:
- Connect to your PostgreSQL database using DATABASE_URL
- Create all the tables (User, CompanySettings, Product, etc.)
- Set up relationships between tables
- Make your database ready to use

**If `npm run db:push` doesn't work**, you can manually run the SQL in your Supabase dashboard:
1. Go to https://supabase.com and login to your project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the contents of `prisma/migrations/init/migration.sql`
5. Paste it into the SQL editor
6. Click "Run"

### 4. (Optional) Seed Database with Initial Data
```bash
npm run db:seed
```

This will:
- Create a default admin user (can use for testing)
- Create initial company settings
- Create sample products with components

**Default user created by seed:**
- Email: `admin@arinox.com`
- Password: `admin123`

### 5. Start Development Server
```bash
npm run dev
```

The app should now run without errors!

## Troubleshooting

### If you get "Connection refused" error:
- Check that your DATABASE_URL is correct
- Verify the Supabase project is active
- Make sure the password in DATABASE_URL is correct

### If tables already exist:
- You may need to run migrations instead: `npx prisma migrate deploy`
- Or reset the database: `npx prisma db push --force-reset` (WARNING: deletes all data)

### If you still get Prisma errors:
1. Clear the Prisma cache: `rm -rf node_modules/.prisma`
2. Regenerate: `npx prisma generate`
3. Try again: `npm run dev`

## Database Structure Created

The following tables will be created:

| Table | Purpose |
|-------|---------|
| `User` | Admin users who can login |
| `CompanySettings` | Your company info (name, GST, address) |
| `Product` | Product definitions |
| `ProductComponent` | Components that make up a product |
| `Quotation` | Quotation documents |
| `QuotationItem` | Line items in quotations |

## Next Steps After Setup

1. ✅ Run `npm run dev` and verify no errors
2. ✅ Open http://localhost:3000 in browser
3. ✅ Login with default user (from seed)
4. ✅ Test creating a quotation
5. ✅ Test sending an email with PDF

## Notes

- Your DATABASE_URL contains credentials - keep it secret!
- In production, use a secure environment variable system
- Never commit .env to git (it's in .gitignore)

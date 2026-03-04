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

### 3. Push Schema to Database
```bash
npx prisma db push
```

This will:
- Connect to your PostgreSQL database using DATABASE_URL
- Create all the tables (User, CompanySettings, Product, etc.)
- Set up relationships between tables

### 4. (Optional) Seed Database with Initial Data
```bash
npx prisma db seed
```

This will:
- Create a default admin user
- Create initial company settings
- Create sample products with components

### 5. Generate Prisma Client
```bash
npx prisma generate
```

This regenerates the TypeScript types based on your schema.

### 6. Start Development Server
```bash
npm run dev
```

The app should now run without the Prisma error!

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

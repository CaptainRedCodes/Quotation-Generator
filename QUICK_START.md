# Quick Start Guide - Arinox Quote Generator

## 🚀 TL;DR - Get Running in 2 Steps

### Step 1: Create Database Tables
```bash
npm run db:push
```

**OR if that doesn't work:**
1. Go to your Supabase project dashboard
2. Open "SQL Editor"
3. Click "New Query"
4. Paste contents of `prisma/migrations/init/migration.sql`
5. Click "Run"

### Step 2: Start the App
```bash
npm run dev
```

Then open http://localhost:3000 in your browser

---

## 📋 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Create/update database tables |
| `npm run db:seed` | Add initial test data |
| `npm run lint` | Run ESLint |

---

## 🔑 Default Login Credentials

After running `npm run db:seed`:
- **Email**: `admin@arinox.com`
- **Password**: `admin123`

---

## 🗂️ Project Structure

```
arinox-quote-generator/
├── app/
│   ├── api/                 # API routes (backend)
│   ├── dashboard/           # Dashboard pages (frontend)
│   ├── login/              # Login page
│   ├── error.tsx           # Error page
│   └── not-found.tsx       # 404 page
├── components/             # Reusable React components
├── lib/                    # Utilities and configurations
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Seed data for testing
├── public/                # Static files
└── .env                   # Environment variables
```

---

## ⚙️ Environment Variables

Your `.env` file contains:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Authentication URL
- `NEXTAUTH_SECRET` - Session encryption secret
- `RESEND_API_KEY` - (Optional) Email service API key

---

## 🎯 Features Implemented

- ✅ User authentication with NextAuth
- ✅ Quotation management (create, edit, delete)
- ✅ Product management with components
- ✅ PDF generation and download
- ✅ Email sending with PDF attachments
- ✅ Dashboard with search/filter
- ✅ Settings page with password change
- ✅ Error handling and validation
- ✅ Role-based access control

---

## 🐛 Troubleshooting

### Database Connection Error
- ✅ Check `.env` has `DATABASE_URL`
- ✅ Verify Supabase project is active
- ✅ Ensure password in URL is correct

### Prisma Error on Startup
- ✅ Run `npm run db:push` to create tables
- ✅ Or manually paste `prisma/migrations/init/migration.sql` in Supabase

### Port Already in Use
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Clear Cache and Rebuild
```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📚 Documentation

- `SETUP_INSTRUCTIONS.md` - Detailed setup guide
- `IMPLEMENTATION_SUMMARY.md` - Features and changes
- `prisma/schema.prisma` - Database structure

---

## 🚀 Ready to Deploy?

Before deploying to production:
1. ✅ Change `NEXTAUTH_SECRET` to a secure random string
2. ✅ Add `RESEND_API_KEY` for email functionality
3. ✅ Update company settings in the app
4. ✅ Test all features thoroughly
5. ✅ Run `npm run build` to verify no errors

---

**Need help?** Check the troubleshooting section or review the setup instructions.

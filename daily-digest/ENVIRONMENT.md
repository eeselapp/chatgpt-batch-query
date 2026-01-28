# Environment Setup Guide

Complete guide to setting up all environment variables and external services.

---

## 📋 Environment Variables Overview

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Twitter API
TWITTER_API_KEY="your-twitter-api-key"
TWITTER_API_BASE_URL="https://api.twitterapi.io"

# OpenAI
OPENAI_API_KEY="sk-proj-..."

# Cron Security
CRON_SECRET="generate-with-openssl"
```

---

## 🔐 Generate Secrets

### NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Add to `.env.local`:
```env
NEXTAUTH_SECRET="your-generated-secret"
```

### CRON_SECRET
```bash
openssl rand -base64 32
```
Add to `.env.local`:
```env
CRON_SECRET="your-generated-secret"
```

---

## 🗄️ Database Setup

### Option 1: Vercel Postgres (Recommended for Vercel deployment)

**Step 1**: Install Vercel CLI
```bash
npm i -g vercel
```

**Step 2**: Link to Vercel project
```bash
vercel link
```

**Step 3**: Create Postgres database
```bash
vercel postgres create
```

**Step 4**: Pull environment variables
```bash
vercel env pull .env.local
```

This automatically sets `DATABASE_URL` in `.env.local`.

**Step 5**: Run migrations
```bash
npx prisma migrate dev --name init
```

---

### Option 2: Supabase (Free tier available)

**Step 1**: Sign up at [supabase.com](https://supabase.com/)

**Step 2**: Create new project
- Choose region closest to your users
- Set database password (save it!)

**Step 3**: Get connection string
1. Go to Project Settings → Database
2. Copy "Connection string" → "URI"
3. Replace `[YOUR-PASSWORD]` with your actual password

**Step 4**: Add to `.env.local`
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

**Step 5**: Run migrations
```bash
npx prisma migrate dev --name init
```

---

### Option 3: Local PostgreSQL

**Step 1**: Install PostgreSQL
- macOS: `brew install postgresql`
- Ubuntu: `sudo apt-get install postgresql`
- Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

**Step 2**: Create database
```bash
createdb daily_digest
```

**Step 3**: Add to `.env.local`
```env
DATABASE_URL="postgresql://localhost:5432/daily_digest"
```

**Step 4**: Run migrations
```bash
npx prisma migrate dev --name init
```

---

## 🔑 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `daily-digest` (or your preferred name)
4. Click "Create"

### Step 2: Enable APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Gmail API**
   - **Google+ API** (for user profile)

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in:
   - **App name**: Daily Digest
   - **User support email**: your email
   - **Developer contact**: your email
4. Click "Save and Continue"
5. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/gmail.send`
6. Click "Save and Continue"
7. Add test users (your email)
8. Click "Save and Continue"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `daily-digest-web`
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google` (add after deployment)
6. Click "Create"
7. Copy **Client ID** and **Client Secret**

### Step 5: Add to `.env.local`

```env
GOOGLE_CLIENT_ID="1234567890-xxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
```

---

## 🐦 Twitter API

You'll need a Twitter API key to fetch tweets. Contact the project maintainer for access or get your own from a Twitter API provider.

**No action needed** - these are managed server-side.

If you need your own API key:
1. Sign up at [twitterapi.io](https://twitterapi.io/)
2. Get your API key
3. Replace `TWITTER_API_KEY` in `.env.local`

---

## 🤖 OpenAI API

You'll need an OpenAI API key for AI-powered filtering:
1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Go to API Keys
3. Create new key
4. Replace `OPENAI_API_KEY` in `.env.local`

---

## 🌐 NextAuth Configuration

### Development
```env
NEXTAUTH_URL="http://localhost:3000"
```

### Production (after deployment)
```env
NEXTAUTH_URL="https://your-domain.vercel.app"
```

**Important**: Update this in Vercel environment variables after deployment!

---

## ✅ Environment Checklist

### For Local Development

- [ ] `.env.local` created (copied from `.env.example`)
- [ ] `DATABASE_URL` configured
- [ ] `NEXTAUTH_SECRET` generated
- [ ] `NEXTAUTH_URL` set to `http://localhost:3000`
- [ ] `GOOGLE_CLIENT_ID` from Google Cloud
- [ ] `GOOGLE_CLIENT_SECRET` from Google Cloud
- [ ] `TWITTER_API_KEY` (pre-configured)
- [ ] `OPENAI_API_KEY` (pre-configured)
- [ ] `CRON_SECRET` generated
- [ ] Database migrations run: `npx prisma migrate dev`

### For Production (Vercel)

- [ ] All environment variables added to Vercel
- [ ] `NEXTAUTH_URL` updated to production URL
- [ ] Google OAuth redirect URI added for production URL
- [ ] Database migrations deployed: `npx prisma migrate deploy`
- [ ] `CRON_SECRET` set in Vercel

---

## 🧪 Test Configuration

### Test Database Connection
```bash
npx prisma db pull
```
Should succeed without errors.

### Test Environment Variables
```bash
# Create a test file
cat > test-env.js << 'EOF'
require('dotenv').config({ path: '.env.local' })
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing')
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing')
EOF

node test-env.js
rm test-env.js
```

### Test OAuth Flow
1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Sign in with Google"
4. Should redirect to Google OAuth
5. After authorization, should redirect back to dashboard

---

## 🔄 Environment Variable Priority

Next.js loads environment variables in this order (last one wins):

1. `.env` (committed to repo, base values)
2. `.env.local` (ignored by git, local overrides)
3. `.env.production` (production-specific, optional)
4. System environment variables (highest priority)

**For development**: Use `.env.local`
**For production (Vercel)**: Use Vercel dashboard

---

## 🚨 Security Notes

### Never commit these files:
- `.env.local`
- `.env.production.local`

### Always commit:
- `.env.example` (template with dummy values)

### Keep secrets safe:
- Don't share `.env.local` via Slack/Discord
- Don't log environment variables
- Rotate secrets if accidentally exposed

---

## 📤 Deploying to Vercel

### Add Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - Variable name (e.g., `DATABASE_URL`)
   - Value
   - Environment: Select Production, Preview, Development
5. Click "Save"

### Update for Production

Make sure to update these for production:
- `NEXTAUTH_URL` → your production URL
- `DATABASE_URL` → production database
- Generate new `NEXTAUTH_SECRET` for production

### Pull Variables Locally

To sync Vercel variables to local:
```bash
vercel env pull .env.local
```

---

## 🆘 Troubleshooting

### "Invalid redirect URI"
- Add redirect URI in Google Cloud Console
- Format: `https://your-domain.vercel.app/api/auth/callback/google`

### "Database connection failed"
- Check `DATABASE_URL` format
- Test with: `npx prisma db pull`

### "Missing environment variable"
- Check `.env.local` exists
- Verify variable names (case-sensitive)
- Restart dev server after changes

---

## ✨ You're Done!

If all checks pass, you're ready to:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start building! 🚀



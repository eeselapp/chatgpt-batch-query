# Deployment Checklist

## Pre-Deployment

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] App runs locally without errors
- [ ] Google OAuth tested locally
- [ ] Test digest sent successfully

## Google Cloud Console Setup

- [ ] Project created
- [ ] Gmail API enabled
- [ ] Google+ API enabled
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URIs added (local + production)
- [ ] OAuth consent screen configured
- [ ] Client ID and Secret saved

## Vercel Setup

- [ ] GitHub repository created
- [ ] Repository pushed to GitHub
- [ ] Vercel project created
- [ ] Repository imported to Vercel
- [ ] Environment variables added:
  - [ ] `DATABASE_URL`
  - [ ] `NEXTAUTH_URL` (production URL)
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `TWITTER_API_KEY`
  - [ ] `TWITTER_API_BASE_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `CRON_SECRET`
- [ ] Database migrations deployed: `npx prisma migrate deploy`
- [ ] First deployment successful

## Post-Deployment

- [ ] Production URL accessible
- [ ] Google OAuth works in production
- [ ] Test digest sent from production
- [ ] Cron job scheduled (check Vercel dashboard)
- [ ] Error tracking setup (optional: Sentry)
- [ ] Monitor first automated digest execution

## Environment Variables Reference

```env
# Production
DATABASE_URL="your-production-db-url"
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="generate-new-secret-for-production"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
TWITTER_API_KEY="your-twitter-api-key"
TWITTER_API_BASE_URL="https://api.twitterapi.io"
OPENAI_API_KEY="your-openai-api-key"
CRON_SECRET="generate-new-secret-for-cron"
```

## Generate Secrets

```bash
# For NEXTAUTH_SECRET
openssl rand -base64 32

# For CRON_SECRET
openssl rand -base64 32
```

## Vercel Commands

```bash
# Link local to Vercel project
vercel link

# Pull environment variables
vercel env pull

# Deploy manually
vercel --prod

# View logs
vercel logs

# View deployment status
vercel ls
```



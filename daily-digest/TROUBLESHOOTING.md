# Troubleshooting Guide

## Common Issues and Solutions

---

## 🔴 Installation Issues

### Problem: `npm install` fails with dependency conflicts

**Solution 1**: Use legacy peer deps
```bash
npm install --legacy-peer-deps
```

**Solution 2**: Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

---

## 🔴 Database Issues

### Problem: `Prisma Client is not generated`

**Solution**:
```bash
npx prisma generate
```

### Problem: `Can't reach database server`

**Checklist**:
- ✅ Check `DATABASE_URL` format is correct
- ✅ Database server is running
- ✅ Network access allowed (check firewall/security groups)
- ✅ SSL mode configured correctly

**For Vercel Postgres**:
```bash
vercel env pull
# This should update DATABASE_URL automatically
```

### Problem: `Migration failed`

**Solution**:
```bash
# Reset database (⚠️ WARNING: This deletes all data)
npx prisma migrate reset

# Or apply migrations
npx prisma migrate deploy
```

---

## 🔴 Authentication Issues

### Problem: `Error: [next-auth][error][OAUTH_CALLBACK_ERROR]`

**Possible causes**:
1. **Redirect URI not configured**
   - Go to Google Cloud Console
   - Add: `http://localhost:3000/api/auth/callback/google`
   - Add: `https://your-domain.vercel.app/api/auth/callback/google`

2. **Client ID/Secret incorrect**
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Make sure no trailing spaces

3. **NEXTAUTH_SECRET not set**
   ```bash
   openssl rand -base64 32
   # Add to .env.local as NEXTAUTH_SECRET
   ```

### Problem: `Session not persisting`

**Solution**:
- Check `NEXTAUTH_URL` matches your actual URL
- Clear browser cookies
- Make sure database is connected (sessions stored in DB)

---

## 🔴 Gmail Issues

### Problem: `No Google access token`

**Causes & Solutions**:

1. **Gmail API not enabled**
   - Go to Google Cloud Console
   - Enable "Gmail API"

2. **Missing gmail.send scope**
   - Check `auth.ts` has correct scopes
   - Sign out and sign in again to re-authorize

3. **Token expired**
   - NextAuth should auto-refresh
   - If not working, sign out and sign in again

### Problem: `Email not sending`

**Checklist**:
- ✅ Gmail API enabled in Google Cloud Console
- ✅ User granted `gmail.send` permission during OAuth
- ✅ `recipientEmail` is set correctly
- ✅ Check Vercel logs for error messages

**Debug**:
```typescript
// Check if access_token exists in database
// Run in Prisma Studio or database directly
SELECT * FROM "Account" WHERE provider = 'google';
```

---

## 🔴 Twitter API Issues

### Problem: `No tweets returned`

**Possible causes**:
1. **Username incorrect**
   - Use username without `@`
   - Case-sensitive
   - Example: `elonmusk` not `@elonmusk`

2. **Account has no recent tweets**
   - Try a different username
   - Check Twitter directly

3. **Wrong API configuration**
   - Endpoint must be: `/twitter/user/last_tweets`
   - Parameter must be: `userName` (camelCase)
   - See [FIX_API_CONFIG.md](./FIX_API_CONFIG.md)

4. **API key expired or invalid**
   - Check API key in `.env.local`
   - Contact project maintainer for valid key

### Problem: `"User is suspended"` error (but user is not suspended)

### Problem: `API rate limit exceeded`

**Solution**:
- Wait for rate limit to reset
- Reduce number of usernames
- Contact API provider for higher limits

---

## 🔴 LLM/OpenAI Issues

### Problem: `OpenAI API error: 429 (Rate limit)`

**Solutions**:
1. **Upgrade OpenAI plan**
2. **Add retry logic** (implement in `llm-service.ts`)
3. **Reduce frequency** of digest executions

### Problem: `OpenAI API error: 401 (Invalid API key)`

**Solution**:
- Verify `OPENAI_API_KEY` is correct
- Check if key is active in OpenAI dashboard
- Regenerate key if needed

### Problem: `Digest format is broken/invalid JSON`

**Cause**: LLM output sometimes includes markdown
**Solution**: Already handled in `llm-service.ts` with regex cleanup

---

## 🔴 Cron Job Issues

### Problem: `Cron job not running`

**Checklist**:
- ✅ `vercel.json` exists in root directory
- ✅ `CRON_SECRET` environment variable is set in Vercel
- ✅ Digest `scheduleHour` matches current hour (UTC timezone)
- ✅ Digest `isActive` is `true`

**Debug in Vercel**:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Cron" tab
4. Check logs for errors

### Problem: `Cron returns 401 Unauthorized`

**Solution**:
- Verify `CRON_SECRET` matches in:
  - Vercel environment variables
  - Cron job configuration (Vercel auto-injects this)

---

## 🔴 Deployment Issues

### Problem: `Build failed on Vercel`

**Common causes**:
1. **TypeScript errors**
   ```bash
   npm run build
   # Fix any TypeScript errors locally first
   ```

2. **Missing environment variables**
   - Add all variables from `.env.local` to Vercel

3. **Prisma not generating**
   - Check `postinstall` script in `package.json`
   - Should be: `"postinstall": "prisma generate"`

### Problem: `Database connection failed in production`

**Solution**:
1. Make sure `DATABASE_URL` is set in Vercel environment variables
2. Run migrations:
   ```bash
   vercel env pull
   npx prisma migrate deploy
   ```

---

## 🔴 Performance Issues

### Problem: `Digest taking too long (timeout)`

**Optimizations**:
1. **Reduce Twitter usernames** (fewer API calls)
2. **Reduce time window** (fewer tweets to process)
3. **Upgrade Vercel plan** (more execution time)
4. **Use GPT-4o-mini for both stages** (faster, cheaper)

### Problem: `High OpenAI costs`

**Solutions**:
1. Use `gpt-4o-mini` for both filtering and formatting
2. Reduce number of tweets before sending to LLM
3. Implement caching for similar tweets
4. Reduce frequency of digests

---

## 🔴 UI/UX Issues

### Problem: `Toast notifications not showing`

**Solution**:
- Check `<Toaster />` is in root layout
- Check browser console for errors

### Problem: `Form not submitting`

**Debug**:
1. Open browser DevTools → Network tab
2. Try submitting form
3. Check for 4xx/5xx errors
4. Check console for JavaScript errors

---

## 📊 Monitoring & Debugging

### View Application Logs

**Vercel**:
```bash
vercel logs
```

**Or in Vercel Dashboard**: Project → Logs

### View Database Data

```bash
npx prisma studio
```

This opens a GUI at http://localhost:5555

### Test API Endpoints Manually

```bash
# Test cron endpoint
curl -X GET http://localhost:3000/api/cron/digest \
  -H "Authorization: Bearer your-cron-secret"

# Test digest update
curl -X PUT http://localhost:3000/api/digest \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"name":"Test","twitterUsernames":["elonmusk"],...}'
```

---

## 🆘 Getting Help

### Check logs in order:
1. **Browser Console** (F12) → Console tab
2. **Network Tab** → Check API responses
3. **Vercel Logs** → Runtime errors
4. **Prisma Studio** → Check database state

### Useful Commands:

```bash
# Reset database (⚠️ deletes data)
npx prisma migrate reset

# View database in GUI
npx prisma studio

# Check TypeScript errors
npm run build

# View Vercel logs
vercel logs

# Pull environment variables
vercel env pull

# Test locally
npm run dev
```

---

## 🔍 Quick Diagnostics

Run these checks if something isn't working:

```bash
# 1. Check environment variables
cat .env.local

# 2. Check database connection
npx prisma db pull

# 3. Check Prisma client is generated
ls node_modules/@prisma/client

# 4. Test build
npm run build

# 5. Test development server
npm run dev
```

---

## 📞 Still Stuck?

1. Check [README.md](./README.md) for detailed documentation
2. Check [API.md](./API.md) for API reference
3. Search GitHub issues (if open-source)
4. Check Vercel documentation for deployment issues
5. Check Google Cloud Console for OAuth issues


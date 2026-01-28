# Deployment Guide

## Backend Deployment (Koyeb)

### Prerequisites
- GitHub repository dengan kode backend
- Akun Koyeb

### Steps

1. **Prepare Dockerfile**
   - Dockerfile sudah tersedia di `backend/Dockerfile`
   - Pastikan semua dependencies sudah ada di `package.json`

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Deploy di Koyeb**
   - Login ke [Koyeb Dashboard](https://app.koyeb.com)
   - Klik "Create App"
   - Pilih "GitHub" sebagai source
   - Pilih repository Anda
   - Koyeb akan otomatis detect Dockerfile
   - Set working directory ke `backend`

4. **Environment Variables**
   Set di Koyeb dashboard:
   ```
   PORT=3001
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   NODE_ENV=production
   ```

5. **Deploy**
   - Klik "Deploy"
   - Tunggu build selesai
   - Copy URL backend (contoh: `https://your-app.koyeb.app`)

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub repository dengan kode frontend
- Akun Vercel

### Steps

1. **Push to GitHub**
   ```bash
   cd frontend
   git add .
   git commit -m "Frontend ready"
   git push origin main
   ```

2. **Deploy di Vercel**
   - Login ke [Vercel Dashboard](https://vercel.com)
   - Klik "Add New Project"
   - Import repository GitHub Anda
   - Set root directory ke `frontend`

3. **Environment Variables**
   Set di Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-app.koyeb.app
   ```

4. **Deploy**
   - Klik "Deploy"
   - Tunggu build selesai
   - Copy URL frontend (contoh: `https://your-app.vercel.app`)

5. **Update Backend CORS**
   - Kembali ke Koyeb dashboard
   - Update `CORS_ORIGIN` dengan URL frontend Vercel Anda
   - Restart service

## Catatan Penting

⚠️ **Login ChatGPT:**
- Untuk production, user perlu login ke ChatGPT terlebih dahulu
- Browser akan dibuka dalam mode headless
- Jika login diperlukan, error akan muncul dengan pesan yang jelas
- Untuk hasil terbaik, gunakan email baru untuk login

⚠️ **Resource Requirements:**
- Backend memerlukan minimal 1GB RAM untuk Puppeteer
- Pastikan Koyeb plan Anda mencukupi
- Monitor resource usage di dashboard

⚠️ **Rate Limiting:**
- Aplikasi tidak memiliki rate limiting built-in
- Pertimbangkan menambahkan rate limiting jika diperlukan
- Koyeb memiliki built-in DDoS protection

## Troubleshooting

### Backend tidak bisa start
- Pastikan semua environment variables sudah di-set
- Check logs di Koyeb dashboard
- Pastikan Dockerfile sudah benar

### Frontend tidak bisa connect ke backend
- Pastikan `NEXT_PUBLIC_API_URL` sudah benar
- Pastikan CORS_ORIGIN di backend sudah sesuai dengan frontend URL
- Check network tab di browser untuk error details

### Scraping gagal
- Pastikan ChatGPT tidak memblokir request
- Check logs untuk detail error
- Pastikan browser/Chrome sudah terinstall dengan benar di container


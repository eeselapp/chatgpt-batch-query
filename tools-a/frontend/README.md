# ChatGPT Scraper Frontend

Frontend aplikasi ChatGPT Batch Scraper menggunakan Next.js 14 dengan TypeScript, Tailwind CSS, dan Shadcn UI.

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.local.example` ke `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## Build

```bash
npm run build
npm start
```

## Deployment (Vercel)

1. Push code ke GitHub
2. Import project di Vercel
3. Set environment variable `NEXT_PUBLIC_API_URL`
4. Deploy

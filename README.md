# ChatGPT Batch Scraper

Aplikasi web fullstack untuk melakukan batch scraping dari ChatGPT dengan fitur export ke CSV.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Node.js, Express, Puppeteer (dengan `puppeteer-extra` dan `stealth`), Multer
- **Deployment:** 
  - Backend: Koyeb (Docker)
  - Frontend: Vercel

## Fitur

1. **Input Multiple Questions:**
   - Manual input (satu per baris)
   - Upload file CSV/Excel (kolom pertama berisi pertanyaan)
   - Deteksi header otomatis untuk CSV

2. **Scraping dengan Isolation Mode:**
   - Setiap pertanyaan membuka browser baru (isolasi penuh)
   - Menggunakan Puppeteer dengan stealth plugin
   - Support login ChatGPT untuk hasil yang lebih akurat

3. **Output:**
   - JSON response dengan format: `{ question, answer, sources }`
   - Export otomatis ke CSV
   - Field `sources` berisi URL yang ditemukan (comma separated)

## Setup Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env sesuai kebutuhan
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL jika backend di URL berbeda
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

### Backend (Koyeb)

1. Build Docker image:
```bash
cd backend
docker build -t chatgpt-scraper-backend .
```

2. Deploy ke Koyeb:
   - Push code ke GitHub
   - Connect repository di Koyeb
   - Koyeb akan otomatis detect Dockerfile dan deploy

3. Set environment variables di Koyeb dashboard:
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
   - `NODE_ENV=production`

### Frontend (Vercel)

1. Push code ke GitHub
2. Import project di Vercel
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-domain.koyeb.app`
4. Deploy

## Catatan Penting

⚠️ **Login ChatGPT:** Untuk mendapatkan hasil yang akurat dengan sources, disarankan login ke ChatGPT dengan email baru. Browser akan dibuka untuk proses login sebelum scraping dimulai.

⚠️ **Error Handling:** Jika satu pertanyaan gagal, proses akan berhenti dan menampilkan error message.

## Format File Upload

### CSV
- Kolom pertama berisi pertanyaan
- Pilih checkbox "File has header row" jika file memiliki header
- Format: `question1,other_data\nquestion2,other_data`

### Excel (.xlsx, .xls)
- Sheet pertama akan digunakan
- Kolom pertama berisi pertanyaan
- Header akan otomatis di-skip jika terdeteksi

## API Endpoints

### POST `/api/scrape`
Scrape multiple questions dari ChatGPT.

**Request:**
```json
{
  "questions": ["question1", "question2"],
  "userDataDir": "optional/path/to/user/data"
}
```

**Response:**
```json
{
  "results": [
    {
      "question": "question1",
      "answer": "Answer text...",
      "sources": "url1, url2, url3"
    }
  ]
}
```

### POST `/api/upload`
Upload dan parse file CSV/Excel.

**Request:** Form data dengan field `file` dan `hasHeader` (true/false)

**Response:**
```json
{
  "questions": ["question1", "question2"],
  "count": 2
}
```

## License

ISC


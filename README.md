# ChatGPT Batch Scraper

A full-stack web application for batch scraping ChatGPT conversations with CSV export functionality.

## 🚀 Features

- **Multiple Input Methods:**
  - Manual input (one question per line)
  - CSV/Excel file upload (first column contains questions)
  - Automatic header detection for CSV files

- **Advanced Scraping:**
  - Isolation mode: Each question opens a new browser instance (full isolation)
  - Uses Puppeteer with stealth plugin to avoid detection
  - Supports ChatGPT login for more accurate results
  - Real-time progress tracking with Server-Sent Events (SSE)

- **Output:**
  - JSON response with format: `{ question, answer, sources }`
  - Automatic CSV export
  - `sources` field contains discovered URLs (comma-separated)

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Node.js, Express, Puppeteer (with `puppeteer-extra` and `stealth` plugin), Multer
- **Deployment:** 
  - Backend: Docker (Koyeb compatible)
  - Frontend: Vercel or Docker

## 📋 Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git
- Chrome/Chromium browser (for Puppeteer)

> **⚠️ Important:** Before running `npm run dev`, make sure to install dependencies first by running `npm install` in both `backend/` and `frontend/` directories.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script to automatically configure the project:

```bash
git clone https://github.com/your-username/chatgpt-scrapper.git
cd chatgpt-scrapper
./setup.sh
```

Then start the services:

**Terminal 1 - Backend:**
```bash
cd backend
npm install  # Install dependencies first
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install  # Install dependencies first
npm run dev
```

Open `http://localhost:3000` in your browser.

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

Backend will run at `http://localhost:3001`

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if backend is on a different URL
npm run dev
```

Frontend will run at `http://localhost:3000`

### Option 3: Docker Compose

Run both services with Docker Compose:

```bash
docker-compose up
```

This will start:
- Backend at `http://localhost:3001`
- Frontend at `http://localhost:3000`

## ⚙️ Environment Variables

### Backend (.env)

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
HEADLESS=true
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `HEADLESS` | Run browser in headless mode | `true` |

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

## 📁 Project Structure

```
chatgpt-scrapper/
├── backend/
│   ├── server.js          # Express server with Puppeteer
│   ├── Dockerfile         # Docker configuration
│   ├── package.json
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   ├── Dockerfile         # Docker configuration
│   ├── package.json
│   └── .env.local.example # Environment variables template
├── docker-compose.yml     # Docker Compose configuration
├── setup.sh              # Automated setup script
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # ISC License
└── README.md             # This file
```

## 📝 File Upload Format

### CSV Files
- First column contains questions
- Check "File has header row" if your file has a header
- Format: `question1,other_data\nquestion2,other_data`

### Excel Files (.xlsx, .xls)
- First sheet will be used
- First column contains questions
- Header will be automatically skipped if detected

## 🔌 API Endpoints

### POST `/api/scrape`

Scrape multiple questions from ChatGPT.

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

Upload and parse CSV/Excel file.

**Request:** Form data with field `file` and `hasHeader` (true/false)

**Response:**
```json
{
  "questions": ["question1", "question2"],
  "count": 2
}
```

### GET `/api/progress/:sessionId`

Get real-time scraping progress via Server-Sent Events (SSE).

## 🐳 Docker Deployment

### Backend Only

```bash
cd backend
docker build -t chatgpt-scraper-backend .
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e NODE_ENV=production \
  -e HEADLESS=true \
  chatgpt-scraper-backend
```

### Full Stack with Docker Compose

```bash
docker-compose up -d
```

## ☁️ Cloud Deployment

### Backend (Koyeb)

1. Build Docker image:
   ```bash
   cd backend
   docker build -t chatgpt-scraper-backend .
   ```

2. Deploy to Koyeb:
   - Push code to GitHub
   - Connect repository in Koyeb
   - Koyeb will automatically detect Dockerfile and deploy

3. Set environment variables in Koyeb dashboard:
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
   - `NODE_ENV=production`
   - `HEADLESS=true`

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-domain.koyeb.app`
4. Deploy

## ⚠️ Important Notes

- **ChatGPT Login:** For accurate results with sources, it's recommended to log in to ChatGPT with a new email. The browser will open for the login process before scraping begins.

- **Error Handling:** If one question fails, the process will stop and display an error message.

- **Resource Requirements:** 
  - Backend requires at least 1GB RAM for Puppeteer
  - Ensure your deployment plan has sufficient resources

- **Rate Limiting:** The application does not have built-in rate limiting. Consider adding rate limiting if needed for production use.

## 🐛 Troubleshooting

### Puppeteer cannot install Chromium

**Linux:**
```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

**macOS:**
```bash
brew install chromium
```

**Alternative:** Set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and install Chrome manually.

### Port already in use

- Change `PORT` in `.env` (backend) or use a different port
- Frontend default: 3000, Backend default: 3001

### Backend cannot connect to frontend

- Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- Check that `NEXT_PUBLIC_API_URL` in frontend `.env.local` matches your backend URL

### Scraping fails

- Ensure ChatGPT is not blocking requests
- Check logs for detailed error messages
- Verify browser/Chrome is installed correctly
- Try setting `HEADLESS=false` to see what's happening

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [Next.js](https://nextjs.org/) - React framework
- [Shadcn UI](https://ui.shadcn.com/) - UI components

## 📧 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues and discussions
- Review the documentation

---

Made with ❤️ by the open source community

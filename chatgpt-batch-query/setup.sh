#!/bin/bash

# ChatGPT Batch Scraper - Setup Script
# This script helps you set up the development environment

set -e  # Exit on error

echo "🚀 Setting up ChatGPT Batch Scraper..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}📦 Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 20 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠️  Node.js version 20 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Setup Backend
echo -e "${BLUE}📦 Setting up backend...${NC}"
cd backend

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created backend/.env from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example not found. Creating basic .env file...${NC}"
        cat > .env << EOF
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
HEADLESS=true
EOF
        echo -e "${GREEN}✅ Created backend/.env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  backend/.env already exists. Skipping...${NC}"
fi

echo "Installing backend dependencies..."
npm install
echo -e "${GREEN}✅ Backend setup complete!${NC}"
cd ..
echo ""

# Setup Frontend
echo -e "${BLUE}📦 Setting up frontend...${NC}"
cd frontend

if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ Created frontend/.env.local from .env.local.example${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local.example not found. Creating basic .env.local file...${NC}"
        cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
        echo -e "${GREEN}✅ Created frontend/.env.local${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  frontend/.env.local already exists. Skipping...${NC}"
fi

echo "Installing frontend dependencies..."
npm install
echo -e "${GREEN}✅ Frontend setup complete!${NC}"
cd ..
echo ""

# Summary
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo ""
echo "To start the backend:"
echo -e "  ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "To start the frontend (in a new terminal):"
echo -e "  ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo -e "${BLUE}💡 Tip: You can also use Docker Compose to run both services:${NC}"
echo -e "  ${YELLOW}docker-compose up${NC}"


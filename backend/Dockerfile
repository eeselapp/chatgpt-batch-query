FROM node:20-slim

# Install minimal dependencies for Puppeteer bundled Chromium (much faster than installing Chrome)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies (Puppeteer will download bundled Chromium automatically)
# Set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false to ensure Chromium is downloaded
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

RUN npm install --only=production --prefer-offline --no-audit && npm cache clean --force

# Copy only necessary application files
COPY server.js ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]


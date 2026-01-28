FROM node:20-slim

# Install minimal dependencies for Puppeteer bundled Chromium
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

# Skip Chromium download during npm install to speed up build significantly
# Chromium will be downloaded automatically on first Puppeteer launch (slower first request, but faster build)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# Install dependencies without Chromium download (saves 3-5 minutes)
RUN npm install --only=production --prefer-offline --no-audit --progress=false && npm cache clean --force

# Copy only necessary application files
COPY server.js ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]


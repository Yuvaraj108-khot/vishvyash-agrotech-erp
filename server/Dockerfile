FROM node:22-bookworm-slim

# Set environment variable to skip Puppeteer downloading its own Chromium during npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Chromium and system fonts required for PDF generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Generate prisma client
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Start server
CMD ["npm", "start"]

FROM node:18-slim

# Install necessary libraries for Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libxshmfence1 \
    libgbm1 \
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

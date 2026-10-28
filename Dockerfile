# Commentator — production image.
# ffmpeg comes from the ffmpeg-static npm package, so no apt install needed.
FROM node:20-slim

WORKDIR /app

# Install deps first (better layer caching). Needs dev-free runtime deps only.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# App source
COPY . .

# Runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# Health: platforms can hit /api/health
CMD ["npm", "start"]

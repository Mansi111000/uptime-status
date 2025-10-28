# 1) deps
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
# Do NOT omit dev deps here – Tailwind needs to run at build time
RUN --mount=type=cache,id=npm-cache,target=/root/.npm npm ci

# ---------- build stage ----------
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Bring in deps (node_modules) just for building
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next app (standalone output)
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Copy only the minimal runtime produced by standalone build
# This contains the server and the subset of node_modules Next needs
COPY --from=build /app/.next/standalone ./.next/standalone
COPY --from=build /app/.next/static ./.next/static
# If you have any public assets
COPY --from=build /app/public ./public

# Optional: health check route if you have one
# HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", ".next/standalone/server.js"]

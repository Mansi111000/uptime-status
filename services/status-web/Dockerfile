# services/status-web/Dockerfile
# --- deps stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# use npm install so we don't require a perfectly synced lock inside the container
RUN npm install

# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]

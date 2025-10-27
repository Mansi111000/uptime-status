# services/status-web/Dockerfile

# --- deps stage: install node_modules with cache ---
FROM node:20-bullseye-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
# Cache npm folder between builds (BuildKit required; Docker Desktop has it)
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

# --- build stage: copy source and build Next ---
FROM node:20-bullseye-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ensure public dir exists (avoids COPY warnings later)
RUN mkdir -p public
RUN npm run build

# --- runtime stage: only what we need to run Next ---
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# copy the output and minimal files for runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=deps  /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]

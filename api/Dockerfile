# syntax=docker/dockerfile:1

# ---- Build stage: install all deps + compile Strapi admin/server ----
FROM node:22-bookworm-slim AS build
WORKDIR /opt/app
ENV NODE_ENV=production
# build-essential + python3: only needed if a native prebuild is missing
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=optional
COPY . .
RUN npm run build

# ---- Runtime stage: prod deps only ----
FROM node:22-bookworm-slim AS runner
WORKDIR /opt/app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1338
# tini: forwards SIGTERM so Strapi shuts down gracefully
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --include=optional
COPY --from=build /opt/app/dist ./dist
COPY config ./config
COPY public ./public
COPY src ./src
EXPOSE 1338
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "./dist/server.js"]

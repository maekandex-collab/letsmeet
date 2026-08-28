# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG LETSMEET_API_BASE_URL=https://mtn.lenhub.net
ARG NEXT_PUBLIC_LETSMEET_BASE_URL=https://mtn.lenhub.net
ARG NEXT_PUBLIC_SITE_URL=https://letsmeet.viaspark.site
ARG NEXT_PUBLIC_LETSMEET_WS_BASE_URL=wss://mtn.lenhub.net
ENV LETSMEET_API_BASE_URL=$LETSMEET_API_BASE_URL
ENV NEXT_PUBLIC_LETSMEET_BASE_URL=$NEXT_PUBLIC_LETSMEET_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_LETSMEET_WS_BASE_URL=$NEXT_PUBLIC_LETSMEET_WS_BASE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/.cache/letsmeet-media \
  && chown -R nextjs:nodejs /app/.cache

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
# Optional persistent volume: mount at /app/.cache/letsmeet-media
CMD ["node", "server.js"]

# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

COPY . .
# The public site URL is baked into the build (canonical / hreflang links, sitemap):
# nuxt.config.ts reads it for `site.url` and `i18n.baseUrl`.
ARG NUXT_PUBLIC_SITE_URL=https://www.topaicollection.com
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
RUN npm run build

# ---- Production stage ----
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

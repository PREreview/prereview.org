FROM node:20.13.1-alpine3.18 AS node
ENV NODE_OPTIONS="--unhandled-rejections=strict --enable-source-maps"
WORKDIR /app

#
# Stage: NPM environment
#
FROM node AS npm
COPY .npmrc \
  package.json \
  package-lock.json \
  ./

#
# Stage: intlc environment
#
FROM debian:12.6-slim AS intlc
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
WORKDIR /app

ADD https://github.com/unsplash/intlc/releases/download/v0.8.3/intlc-v0.8.3-linux-x86_64 /usr/local/bin/intlc

RUN chmod +x /usr/local/bin/intlc

#
# Stage: Development NPM install
#
FROM npm AS npm-dev
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm ci --ignore-scripts

#
# Stage: Production NPM install
#
FROM npm AS npm-prod

RUN npm ci --ignore-scripts --production

#
# Stage: Intlc build
#
FROM intlc AS build-intlc

COPY scripts/ scripts/
COPY locales/ locales/

RUN scripts/intlc.sh

#
# Stage: Production build
#
FROM npm AS build-prod
ENV NODE_ENV=production

COPY --from=npm-dev /app/node_modules/ node_modules/
COPY tsconfig.build.json \
  tsconfig.json \
  webpack.config.cjs \
  ./
COPY src/ src/
COPY assets/ assets/
COPY --from=build-intlc /app/assets/locales/ assets/locales/
COPY --from=build-intlc /app/src/locales/ src/locales/

RUN npx run-p build:assets build:app

#
# Stage: Integration test environment
#
FROM mcr.microsoft.com/playwright:v1.45.2-jammy AS test-integration
WORKDIR /app

COPY --from=npm-dev /app/ .
COPY --from=build-prod /app/dist/assets/ dist/assets/
COPY --from=build-prod /app/src/ src/
COPY integration/ integration/
COPY visual-regression/ visual-regression/
COPY playwright.config.ts .

ENTRYPOINT ["npx", "playwright", "test"]

#
# Stage: Production environment
#
FROM node AS prod
ENV NODE_ENV=production

RUN mkdir data && chown node:node data
COPY --from=npm-prod /app/node_modules/ node_modules/
COPY --from=build-prod /app/dist/ dist/

HEALTHCHECK --interval=5s --timeout=1s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
USER node

CMD ["node", "dist/index.js"]

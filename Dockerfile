FROM node:24.10.0-bookworm-slim AS node
ENV NODE_OPTIONS="--unhandled-rejections=strict --enable-source-maps"
WORKDIR /app

#
# Stage: NPM environment
#
FROM node AS npm
RUN apt-get update && apt-get install --yes \
  build-essential \
  python3 \
  && rm --recursive --force /var/lib/apt/lists/*
COPY .npmrc ./
RUN npm install --global pnpm@10
COPY package.json \
  pnpm-lock.yaml \
  ./

#
# Stage: intlc environment
#
FROM --platform=linux/amd64 debian:13.3-slim AS intlc
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
WORKDIR /app

ADD https://github.com/unsplash/intlc/releases/download/v0.8.3/intlc-v0.8.3-linux-x86_64 /usr/local/bin/intlc
COPY --from=ghcr.io/tests-always-included/mo:3.0.5 /usr/local/bin/mo /usr/local/bin/mo

RUN chmod +x /usr/local/bin/intlc

#
# Stage: Development NPM install
#
FROM npm AS npm-dev
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN pnpm install --frozen-lockfile \
  && rm --recursive --force node_modules/cld/deps/*

#
# Stage: Production NPM install
#
FROM npm AS npm-prod

RUN pnpm install --frozen-lockfile --prod \
  && rm --recursive --force node_modules/cld/deps/*

#
# Stage: Intlc build
#
FROM intlc AS build-intlc

COPY .dev/ .dev/
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
  webpack.config.mjs \
  ./
COPY src/ src/
COPY assets/ assets/
COPY --from=build-intlc /app/assets/locales/ assets/locales/
COPY --from=build-intlc /app/src/locales/ src/locales/

RUN npm run build:assets && npm run build:app

#
# Stage: Integration test environment
#
FROM mcr.microsoft.com/playwright:v1.58.2-jammy AS test-integration
WORKDIR /app

COPY --from=npm-dev /app/ .
COPY --from=build-prod /app/dist/assets/ dist/assets/
COPY --from=build-prod /app/src/ src/
COPY integration/ integration/
COPY visual-regression/ visual-regression/
COPY playwright.config.ts .

ENTRYPOINT ["npx", "playwright", "test"]

#
# Stage: Build hivemind
#
FROM golang AS hivemind
RUN go install github.com/DarthSim/hivemind@v1.1.0

#
# Stage: Build Redis
#
FROM redis:8.4.0 AS redis

#
# Stage: Production environment
#
FROM node AS prod
ENV NODE_ENV=production

RUN apt-get update && apt-get install --yes \
  wget \
  && rm --recursive --force /var/lib/apt/lists/*
COPY --from=hivemind /go/bin/hivemind /app/

RUN mkdir data && chown node:node data && echo '{"type": "module"}' > /app/package.json
COPY --from=npm-prod /app/node_modules/ node_modules/
COPY --from=build-prod /app/dist/ dist/
COPY .dev/Procfile /app/
COPY --from=redis /usr/local/bin/redis-server /app/

HEALTHCHECK --interval=5s --timeout=1s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
USER node

CMD [ "./hivemind", "--no-prefix" ]

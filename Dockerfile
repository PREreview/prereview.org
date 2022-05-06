FROM node:16.15.0-alpine3.15 AS node
ENV NODE_OPTIONS --unhandled-rejections=strict --enable-source-maps
WORKDIR /app

COPY .npmrc \
  package.json \
  package-lock.json \
  ./

#
# Stage: Production NPM install
#
FROM node AS npm-prod

RUN npm ci --production

#
# Stage: Production environment
#
FROM node AS prod
ENV NODE_ENV=production

COPY --from=npm-prod /app/ .
COPY src/ src/

EXPOSE 3000

CMD ["npm", "start"]

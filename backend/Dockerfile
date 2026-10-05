FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma

# Prisma evaluates datasource configuration while generating the client.
# The real DATABASE_URL is supplied by docker-compose at runtime.
# This build-time value is only a non-secret placeholder; no DB connection is made by generate.
ARG DATABASE_URL=postgresql://siprima:siprima@localhost:5432/siprima_pas
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --include=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["sh","-c","npx prisma migrate deploy && node dist/prisma/seed.js && node dist/server.js"]

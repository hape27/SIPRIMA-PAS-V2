FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
# Vite performs the production transpile/build. TypeScript type-checking is kept
# as a separate `npm run typecheck` task so non-runtime TS diagnostics cannot
# block the local Docker deployment.
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Image du frontend Vue.

# Étape 1 : construction
FROM node:22-alpine AS build

WORKDIR /build

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ENV VITE_API_URL=/api

RUN npm run build

# Étape 2 : service des fichiers
FROM nginx:1.27-alpine

COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

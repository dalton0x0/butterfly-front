# Image du frontend Vue.

# Étape 1 : construction
FROM node:22-alpine AS build

WORKDIR /build

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Adresse relative : nginx réachemine /api vers le backend, une seule origine.
ENV VITE_API_URL=/api

# Nom et slogan affichés, surchargeables au build (le .env local est dockerignoré).
ARG VITE_APP_NAME=Butterfly
ARG VITE_APP_TAGLINE="Apprendre, évoluer, se transformer"
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_TAGLINE=${VITE_APP_TAGLINE}

RUN npm run build

# Étape 2 : service des fichiers.
FROM nginxinc/nginx-unprivileged:1.30-alpine

COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

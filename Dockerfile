# Image du frontend Vue.

# Étape 1 : construction
FROM node:24-alpine AS build

WORKDIR /build

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Adresse relative par défaut : nginx réachemine /api vers le backend, une seule
# origine. Exposée en argument comme les autres variables Vite pour permettre un
# build pointant vers une API hébergée ailleurs sans modifier ce fichier.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

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

# L'image de base tourne déjà avec l'utilisateur nginx (UID 101) et non root. Le rappeler
# ici rend l'intention visible et l'identifiant numérique permet à Kubernetes de vérifier
# runAsNonRoot : avec un nom d'utilisateur, il refuserait de démarrer le conteneur.
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

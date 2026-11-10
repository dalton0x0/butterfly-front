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
# Copié comme modèle : l'image le transforme en conf.d/default.conf au démarrage.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# BACKEND_HOST : nom du service backend, « backend » sous Docker Compose. Kubernetes le
# remplace par le nom complet du service.
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS : demande à l'image de lire le résolveur DNS du
# conteneur et de l'exposer dans NGINX_LOCAL_RESOLVERS.
# NGINX_ENVSUBST_FILTER : limite le remplacement à ces deux variables. Sans ce filtre,
# toute variable d'environnement portant le nom d'une variable du modèle serait remplacée.
ENV BACKEND_HOST=backend \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="^(BACKEND_HOST|NGINX_LOCAL_RESOLVERS)$"

# L'image de base tourne déjà avec l'utilisateur nginx (UID 101) et non root. Le rappeler
# ici rend l'intention visible et l'identifiant numérique permet à Kubernetes de vérifier
# runAsNonRoot : avec un nom d'utilisateur, il refuserait de démarrer le conteneur.
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

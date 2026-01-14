# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code (node_modules and dist are excluded by .dockerignore)
COPY . .

# accept Vite environment variable from Railway
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---- NGINX stage ----
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


# Step 1: Build Astro site
FROM node:lts-alpine AS build
WORKDIR /app

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy rest of the files and build
COPY . .
RUN npm run build

# Step 2: Serve using Nginx
FROM nginx:alpine AS runtime

# Copy static output to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
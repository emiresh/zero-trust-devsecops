FROM node:20-alpine as build

WORKDIR /app

# Add build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

# Install all dependencies (including dev dependencies) needed for build
RUN npm install

COPY . .

# Run the build (vite is in devDependencies)
RUN npm run build

# Remove dev dependencies to slim down the final image (optional)
RUN npm prune --production

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
FROM node:20-alpine

WORKDIR /usr/src/app

# Install all dependencies including dev tools for building
COPY package*.json ./
RUN npm ci

# Copy full backend source code
COPY . .

# Remove any possible stale build caches
RUN rm -rf dist tsconfig.tsbuildinfo

# Compile TypeScript / NestJS from clean source
RUN npm run build

# Expose port (Render automatically provides $PORT)
EXPOSE 3000

# Start server directly with node
CMD ["node", "dist/main.js"]

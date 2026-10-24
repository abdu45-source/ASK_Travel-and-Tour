FROM node:20-alpine

WORKDIR /usr/src/app

# Install all dependencies including dev tools for building
COPY package*.json ./
RUN npm ci

# Copy full backend source code
COPY . .

# Compile TypeScript / NestJS
RUN npm run build

# Expose port (Render automatically provides $PORT)
EXPOSE 3000

# Start server directly with node
CMD ["node", "dist/main.js"]

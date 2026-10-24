FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the NestJS application
RUN npm run build

# Expose API port
EXPOSE 3000

# Start server (checks dist/main.js and dist/src/main.js)
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; elif [ -f dist/src/main.js ]; then node dist/src/main.js; else node $(find dist -name 'main.js'); fi"]

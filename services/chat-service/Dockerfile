FROM node:18-alpine

WORKDIR /app

# Optional: tools like openssl, useful for some libraries
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY src ./src/

# Chat service listens on 3004
EXPOSE 3004

# Start in dev mode (expects a "dev" script in package.json)
CMD ["npm", "run", "dev"]

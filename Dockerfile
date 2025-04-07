FROM node:18-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy remaining files
COPY . .

# Build if using TypeScript
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
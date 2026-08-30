FROM node:22-alpine

WORKDIR /app

# Copy api package files
COPY apps/api/package*.json ./

# Install dependencies inside Linux environment
RUN npm install

# Copy only the api source code and configuration
COPY apps/api/ ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]

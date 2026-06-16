FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the default port (Railway will override this with $PORT dynamically)
EXPOSE 3000

# Start the API using tsx
CMD ["npx", "tsx", "src/index.ts"]

FROM node:18-alpine

# Install PostgreSQL client tools
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S replica -u 1001

# Create config directory and set permissions
RUN mkdir -p /config && chown replica:nodejs /config

USER replica

# Expose port (if needed for health checks)
EXPOSE 3000

# Run the synchronization service
CMD ["npm", "start"]

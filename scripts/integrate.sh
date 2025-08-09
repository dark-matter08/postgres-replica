#!/bin/bash

# Integration script to add the postgres-replica service to your existing docker-compose.yml
# This script demonstrates how to integrate the replica service with your current setup

set -e

echo "🔧 PostgreSQL Replica Service Integration"
echo "========================================"

# Define the path to your main docker-compose.yml
MAIN_COMPOSE_FILE="../docker-compose.yml"
REPLICA_SERVICE_NAME="postgres-replica"

# Check for your current replication-config.yml
REPLICATION_CONFIG_FILE="../replication-config.yml"

if [ ! -f "$REPLICATION_CONFIG_FILE" ]; then
    echo "❌ Error: $REPLICATION_CONFIG_FILE not found"
    echo "💡 Tip: Create a replication-config.yml file in your project root, or copy from config/replication-config.sample.yml"
    exit 1
fi

echo "📋 Found configuration file: $REPLICATION_CONFIG_FILE"

echo "🐳 Building the postgres-replica Docker image..."
docker build -t postgres-replica .

echo "🚀 Running the replica service with your configuration file..."

# Create a temporary docker-compose file for the replica service
cat > docker-compose.replica.yml << EOF
version: '3.8'

services:
  $REPLICA_SERVICE_NAME:
    image: postgres-replica
    volumes:
      # Mount your config file
      - $REPLICATION_CONFIG_FILE:/config/replication-config.yml:ro
    environment:
      CONFIG_FILE: "/config/replication-config.yml"
    ports:
      - "3001:3000"  # Health check endpoint
    restart: unless-stopped
    depends_on:
      - postgres1
      - postgres2
    networks:
      - default
EOF

echo "📄 Generated docker-compose.replica.yml"
echo ""
echo "🚀 Starting the replica service..."
echo "   Config file: $REPLICATION_CONFIG_FILE"
echo "   Health endpoint: http://localhost:3001/health"
echo ""

# Run with the existing network
docker-compose -f docker-compose.replica.yml up --build

echo "✅ Integration complete"

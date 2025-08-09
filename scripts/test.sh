#!/bin/bash

# Test script for the PostgreSQL Replica Service
# This script demonstrates how to run the service with a configuration file

set -e

echo "🧪 Testing PostgreSQL Replica Service"
echo "===================================="

# Create a test configuration file
TEST_CONFIG_FILE="./test-config.yml"

cat > "$TEST_CONFIG_FILE" << 'EOF'
replication:
  publication_name: "test_publication"
  source:
    host: "localhost"
    port: 5432
    user: "postgres"
    password: "password"
    database: "sourcedb"
  targets:
    - name: "test_target"
      subscription_name: "test_subscription"
      host: "localhost"
      port: 5433
      user: "postgres"
      password: "password"
      database: "targetdb"
      settings:
        enable_initial_sync: true
        disable_triggers_during_sync: true
  tables:
    - "User"
    - "Post"
  settings:
    max_wait_attempts: 5
    wait_interval_seconds: 2
    enable_initial_sync: true
    disable_triggers_during_sync: true
EOF

echo "📋 Created test configuration: $TEST_CONFIG_FILE"
cat "$TEST_CONFIG_FILE"
echo ""

echo "🔨 Building Docker image..."
docker build -t postgres-replica-test .

echo "🚀 Running the replica service with config file..."
docker run --rm \
  --name postgres-replica-test \
  --network host \
  -v "$(pwd)/$TEST_CONFIG_FILE:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  postgres-replica-test

# Cleanup
rm -f "$TEST_CONFIG_FILE"

echo "✅ Test completed"

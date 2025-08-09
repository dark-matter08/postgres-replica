# 🚀 Quick Start Guide for postgres-replica

## What we've created

A complete PostgreSQL replication service that can be built as a Docker image and configured via environment variables. The service handles:

- 🔄 **Multi-target replication**: One source database to multiple target databases
- 📋 **Configuration-driven**: Uses your existing `replication-config.yml` file
- 🐳 **Dockerized**: Ready to deploy alongside your existing services
- 🏥 **Health monitoring**: Built-in health check endpoint
- 🛡️ **Error handling**: Comprehensive error handling and logging

## Folder Structure

```
postgres-replica/
├── Dockerfile                    # Docker image definition
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── docker-compose.example.yml    # Example docker-compose setup
├── README.md                     # Detailed documentation
├── .gitignore                    # Git ignore rules
├── src/                          # Source code
│   ├── index.ts                  # Main entry point
│   ├── types.ts                  # TypeScript type definitions
│   ├── config.ts                 # Configuration parsing and validation
│   ├── database.ts               # Database connection management
│   ├── replication.ts            # Core replication logic
│   └── health.ts                 # Health check functionality
└── scripts/                      # Utility scripts
    ├── test.sh                   # Test the service
    └── integrate.sh              # Integration with your project
```

## How to Use

### Option 1: Quick Test
```bash
cd postgres-replica
./scripts/test.sh
```

### Option 2: Integrate with Your Project
```bash
cd postgres-replica
./scripts/integrate.sh
```

# 🚀 Quick Start Guide for postgres-replica

## What we've created

A complete PostgreSQL replication service that can be built as a Docker image and configured via YAML files. The service handles:

- 🔄 **Multi-target replication**: One source database to multiple target databases
- 📋 **File-based configuration**: Uses YAML files with automatic discovery
- 🐳 **Dockerized**: Ready to deploy alongside your existing services
- 🏥 **Health monitoring**: Built-in health check endpoint
- 🛡️ **Error handling**: Comprehensive error handling and logging

## Configuration File Locations

The service automatically searches for configuration files in this order:

1. `$CONFIG_FILE` environment variable path
2. `/config/replication-config.yml` (Docker volume mount) ⭐ **Recommended**
3. `./config/replication-config.yml` (local config directory)
4. `./replication-config.yml` (current directory)
5. `../replication-config.yml` (parent directory)
6. `$REPLICATION_CONFIG` environment variable (fallback)

## How to Use

### Option 1: Quick Test
```bash
cd postgres-replica
./scripts/test.sh
```

### Option 2: Use Your Existing Config File
```bash
cd postgres-replica

# Build the image
docker build -t postgres-replica .

# Run with your config file
docker run --rm 
  --name postgres-replica 
  -v "$(pwd)/../replication-config.yml:/config/replication-config.yml:ro" 
  -p 3001:3000 
  postgres-replica
```

### Option 3: Integration with Your Project
```bash
cd postgres-replica
./scripts/integrate.sh
```

### Option 4: Add to Your Docker Compose

```yaml
services:
  postgres-replica:
    build: ./postgres-replica
    volumes:
      # Mount your existing config file
      - ./replication-config.yml:/config/replication-config.yml:ro
    ports:
      - "3001:3000"  # Health check endpoint
    depends_on:
      - postgres1
      - postgres2
    restart: unless-stopped
```

## Environment Variables

- `CONFIG_FILE`: Specific path to config file (optional)
- `PORT`: Port for health check server (default: 3000)
- `REPLICATION_CONFIG`: Fallback YAML/JSON config (backward compatibility)

## Health Monitoring

Once running, you can check the health status:

```bash
curl http://localhost:3001/health
```

This returns a JSON response with the status of:
- Source database connection
- Publication setup
- Target database connections
- Subscription status

## Environment Variables

- `REPLICATION_CONFIG`: Your replication configuration (YAML or JSON format)
- `PORT`: Port for health check server (default: 3000)

## What the Service Does

1. **Reads configuration** from the `REPLICATION_CONFIG` environment variable
2. **Connects to source database** and creates/verifies the publication
3. **Connects to each target database** and creates/verifies subscriptions
4. **Monitors replication status** continuously
5. **Provides health check endpoint** for monitoring
6. **Handles graceful shutdown** on SIGTERM/SIGINT

## Key Features

- ✅ **Zero-downtime deployment**: Can be stopped and restarted without affecting existing replication
- ✅ **Multi-target support**: Replicate to multiple databases with different configurations
- ✅ **Table filtering**: Configure which tables to replicate per target
- ✅ **Error recovery**: Automatically handles connection failures and retries
- ✅ **Logging**: Comprehensive logging with emojis for easy reading
- ✅ **Security**: Runs as non-root user in Docker container

## Next Steps

1. **Test the service** with your existing databases
2. **Customize table schemas** in the `ensureTablesExist` method if needed
3. **Add monitoring alerts** based on the health endpoint
4. **Scale horizontally** by running multiple instances for different publication/subscription pairs

## Need Help?

Check the logs for detailed error messages and troubleshooting information. The service provides clear error messages and suggestions for common issues.

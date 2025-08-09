# PostgreSQL Replica Service

A Docker-based service for managing PostgreSQL logical replication between source and target databases.

## Features

- 🔄 **Multi-target replication**: Supports replication to multiple target databases
- 📋 **Configuration-driven**: Uses YAML/JSON configuration via environment variables
- 🐳 **Dockerized**: Ready-to-deploy Docker container
- 🔍 **Monitoring**: Built-in replication status monitoring
- 🛡️ **Error handling**: Comprehensive error handling and graceful shutdown
- 📊 **Logging**: Detailed logging for troubleshooting

# PostgreSQL Replica Service

A Docker-based service for managing PostgreSQL logical replication between source and target databases.

## Features

- 🔄 **Multi-target replication**: Supports replication to multiple target databases
- 📋 **File-based configuration**: Uses YAML configuration files with automatic discovery
- 🐳 **Dockerized**: Ready-to-deploy Docker container
- 🔍 **Monitoring**: Built-in replication status monitoring
- 🛡️ **Error handling**: Comprehensive error handling and graceful shutdown
- 📊 **Logging**: Detailed logging for troubleshooting

## Configuration

The service reads its configuration from YAML files in the following order of preference:

1. `CONFIG_FILE` environment variable path
2. `/config/replication-config.yml` (Docker volume mount)
3. `./config/replication-config.yml` (local config directory)
4. `./replication-config.yml` (current directory)
5. `../replication-config.yml` (parent directory)
6. `REPLICATION_CONFIG` environment variable (fallback)

### Sample Configuration File

```yaml
replication:
  publication_name: "my_publication"
  
  # Source database (publisher)
  source:
    host: "postgres1"
    port: 5432
    user: "user1"
    password: "pass1"
    database: "db1"
  
  # Target databases (subscribers)
  targets:
    - name: "primary_replica"
      subscription_name: "my_subscription"
      host: "postgres2"
      port: 5432
      user: "user2"
      password: "pass2"
      database: "db2"
      settings:
        enable_initial_sync: true
        disable_triggers_during_sync: true
      tables:
        - "User"
        - "Post"
  
  # Global default tables
  tables:
    - "User"
    - "Post"
  
  # Global settings
  settings:
    max_wait_attempts: 30
    wait_interval_seconds: 5
    enable_initial_sync: true
    disable_triggers_during_sync: true
```

## Usage

### Option 1: Using Your Existing Config File

```bash
cd postgres-replica

# Build the image
docker build -t postgres-replica .

# Run with your config file
docker run --rm \
  --name postgres-replica \
  -v "/path/to/your/replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  postgres-replica
```

### Option 2: Quick Test with Sample Config

```bash
cd postgres-replica
./scripts/test.sh
```

### Option 3: Integration with Your Project

```bash
cd postgres-replica
./scripts/integrate.sh
```

### Option 4: Using Docker Compose

```yaml
services:
  postgres-replica:
    build: ./postgres-replica
    volumes:
      - ./replication-config.yml:/config/replication-config.yml:ro
    ports:
      - "3001:3000"  # Health check endpoint
    depends_on:
      - postgres1
      - postgres2
    restart: unless-stopped
```

## Configuration Discovery

The service automatically searches for configuration files in this order:

```
📋 Configuration search order:
1. $CONFIG_FILE (environment variable)
2. /config/replication-config.yml (Docker volume)
3. ./config/replication-config.yml (local config)
4. ./replication-config.yml (current directory)
5. ../replication-config.yml (parent directory)
6. $REPLICATION_CONFIG (environment fallback)
```

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- PostgreSQL client tools

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Environment Variables

- `REPLICATION_CONFIG`: The replication configuration (required)

## How It Works

1. **Initialization**: The service connects to the source database and validates the configuration
2. **Publication Setup**: Creates or verifies the publication on the source database for the specified tables
3. **Subscription Setup**: For each target database:
   - Connects to the target database
   - Ensures required tables exist (creates basic structure if missing)
   - Creates or verifies the subscription to the source publication
4. **Monitoring**: Continuously monitors the replication status and logs health information
5. **Graceful Shutdown**: Handles SIGTERM and SIGINT signals for clean shutdown

## Error Handling

The service includes comprehensive error handling:

- Database connection failures
- Invalid configurations
- Missing tables or permissions
- Replication setup failures

Errors are logged with detailed information for troubleshooting.

## Security Considerations

- Use strong passwords for database connections
- Consider using connection pooling for production environments
- Run the container as a non-root user (already configured)
- Use secrets management for sensitive configuration data

## Troubleshooting

### Common Issues

1. **Connection refused**: Check that the database hosts are accessible and the ports are correct
2. **Permission denied**: Ensure the database users have replication privileges
3. **Table not found**: The service will attempt to create basic table structures, but complex schemas should be created manually
4. **Publication already exists**: The service handles existing publications gracefully

### Logs

The service provides detailed logging:
- ✅ Success indicators
- ❌ Error indicators  
- 📋 Configuration information
- 🔄 Status updates

## License

ISC

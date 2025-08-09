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

🐳 **Docker Hub**: [`darkmatter08/postgres-replica`](https://hub.docker.com/r/darkmatter08/postgres-replica)

## Features

- 🔄 **Multi-target replication**: Supports replication to multiple target databases
- 📋 **File-based configuration**: Uses YAML configuration files with automatic discovery
- 🐳 **Dockerized**: Ready-to-deploy Docker container available on Docker Hub
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

The repository includes a complete example setup:
- `replication-config.yml` - Example configuration
- `docker-compose.yml` - Complete multi-database setup
- `init-source.sql` - Sample database schema and data

```yaml
replication:
  publication_name: "example_publication"
  
  # Source database (publisher)
  source:
    host: "source-db"
    port: 5432
    user: "sourceuser"
    password: "sourcepass"
    database: "sourcedb"
  
  # Target databases (subscribers)
  targets:
    - name: "primary_replica"
      subscription_name: "primary_subscription"
      host: "target-db-1"
      port: 5432
      user: "targetuser1"
      password: "targetpass1"
      database: "targetdb1"
      settings:
        enable_initial_sync: true
        disable_triggers_during_sync: true
  
  # Tables to replicate
  tables:
    - "users"
    - "posts"
  
  # Global settings
  settings:
    max_wait_attempts: 30
    wait_interval_seconds: 5
    enable_initial_sync: true
    disable_triggers_during_sync: true
```

## Usage

### Option 1: Using Docker Image from Docker Hub

```bash
# Pull the latest image
docker pull darkmatter08/postgres-replica:latest

# Run with your config file
docker run --rm \
  --name postgres-replica \
  -v "/path/to/your/replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  darkmatter08/postgres-replica:latest
```

### Option 2: Complete Docker Compose Setup

Use the included `docker-compose.yml` for a complete setup with source and target databases:

```bash
# Clone the repository
git clone <your-repo-url>
cd postgres-replica

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f postgres-replica

# Check health
curl http://localhost:3001/health
```

This will start:
- Source PostgreSQL database (port 5432)
- Two target PostgreSQL databases (ports 5433, 5434)
- PostgreSQL replica service with health monitoring

### Option 3: Integration with Your Existing Project

Add to your existing `docker-compose.yml`:

```yaml
services:
  postgres-replica:
    image: darkmatter08/postgres-replica:latest
    volumes:
      - ./replication-config.yml:/config/replication-config.yml:ro
    ports:
      - "3001:3000"  # Health check endpoint
    depends_on:
      - your-source-db
      - your-target-db
    restart: unless-stopped
```

### Option 4: Building from Source

```bash
# Clone and build locally
git clone <your-repo-url>
cd postgres-replica

# Build the image
docker build -t postgres-replica .

# Run with your config
docker run --rm \
  --name postgres-replica \
  -v "./replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  postgres-replica
```

## Quick Start

### 1. Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd postgres-replica

# Start all services (source DB + target DBs + replication service)
docker-compose up -d

# Check the replication status
curl http://localhost:3001/health

# View logs
docker-compose logs -f postgres-replica
```

### 2. Using Pre-built Docker Image

```bash
# Pull the image
docker pull darkmatter08/postgres-replica:latest

# Create your replication-config.yml (see sample below)
# Then run:
docker run --rm \
  -v "./replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  darkmatter08/postgres-replica:latest
```

### 3. Health Monitoring

Once running, monitor the service:
```bash
# Check overall health
curl http://localhost:3001/health

# Pretty print the JSON response
curl -s http://localhost:3001/health | python -m json.tool
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

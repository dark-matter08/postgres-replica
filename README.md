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
- 🔄 **Dynamic table management**: Automatically updates publications and subscriptions when tables are added/removed from config

## Database Configuration for Replication

### PostgreSQL Replication Requirements

For logical replication to work, both source and target databases need proper configuration:

#### Source Database (Publisher) Configuration:
```bash
# Required PostgreSQL settings for the source database
wal_level = logical                    # Enable logical replication
max_replication_slots = 10            # Allow replication slots
max_wal_senders = 10                  # Allow WAL senders
max_logical_replication_workers = 10  # Logical replication workers
max_worker_processes = 16             # Total worker processes
```

#### Target Database (Subscriber) Configuration:
```bash
# Required PostgreSQL settings for target databases
wal_level = logical                    # Enable logical replication
max_replication_slots = 10            # Allow replication slots
max_logical_replication_workers = 10  # Logical replication workers
max_worker_processes = 16             # Total worker processes
```

#### Schema Requirements:
- **Target databases MUST have the same table structures as the source**
- **Primary keys are required** on all replicated tables
- **Table names and column types must match exactly**
- **Indexes are recommended** for performance but not required for replication

### Docker Compose Configuration

The included `docker-compose.yml` automatically configures:

1. **Source Database** (`source-db`):
   - Logical replication enabled
   - Sample schema with `users` and `posts` tables
   - Initial test data

2. **Target Databases** (`target-db-1`, `target-db-2`):
   - Logical replication enabled
   - Same schema as source (no initial data)
   - Proper permissions for replication

3. **Docker Compose Configuration**:
   - All databases configured with proper replication settings
   - Docker network with proper pg_hba.conf for container communication
   - Health checks for all services
   - Proper startup dependencies

**Important**: The Docker containers provide PostgreSQL instances with replication configuration, but you must create your own database schemas and initial data.

### Manual Database Setup

If using existing databases, ensure they meet these requirements:

#### 1. Configure postgresql.conf:
```ini
# Add these settings to postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
max_logical_replication_workers = 10
max_worker_processes = 16
```

#### 2. Create matching schemas:
```sql
-- On source database: verify tables exist
\dt

-- On target database: create matching schema
-- Use the provided scripts/setup-schema.sh or manually create tables
```

#### 3. Grant proper permissions:
```sql
-- On source database
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sourceuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sourceuser;

-- On target database  
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO targetuser1;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO targetuser1;
```

#### 4. Configure pg_hba.conf:
```ini
# Add to pg_hba.conf on source database
host    replication     sourceuser      target-host/32          md5

# Add to pg_hba.conf on target database  
host    all             targetuser1     source-host/32          md5
```

**Note**: The provided `pg_hba_source.conf` and `pg_hba_target.conf` files are configured for Docker networking and can be used as templates for your setup.

### Setting Up Your Database Schemas

Since the Docker containers don't include init scripts, you'll need to set up your schemas:

#### Option 1: Connect and Create Manually
```bash
# Connect to source database
docker exec -it postgres-source psql -U sourceuser -d sourcedb

# Create your tables, indexes, and data
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100));
-- ... create your schema

# Connect to target databases and create matching schema
docker exec -it postgres-target-1 psql -U targetuser1 -d targetdb1
-- Create the same tables (without initial data)
```

#### Option 2: Use SQL Files  
```bash
# Apply your schema to source
docker exec -i postgres-source psql -U sourceuser -d sourcedb < your-schema.sql

# Apply same schema to targets (without data)
docker exec -i postgres-target-1 psql -U targetuser1 -d targetdb1 < your-schema-no-data.sql
docker exec -i postgres-target-2 psql -U targetuser2 -d targetdb2 < your-schema-no-data.sql
```

#### Option 3: Use the Schema Setup Script
```bash
# Set environment variables for your databases
export SOURCE_HOST=localhost SOURCE_PORT=5432 SOURCE_USER=sourceuser SOURCE_PASS=sourcepass SOURCE_DB=sourcedb
export TARGET_HOST=localhost TARGET_PORT=5433 TARGET_USER=targetuser1 TARGET_PASS=targetpass1 TARGET_DB=targetdb1

# Copy schema from source to target
./scripts/setup-schema.sh copy-schema
```

### Adding or Removing Tables

To add or remove tables from replication:

1. **Add tables to your target databases** (if adding new tables):
   ```sql
   -- Connect to each target database and create the new table structure
   CREATE TABLE new_table (
       id SERIAL PRIMARY KEY,
       -- ... your columns
   );
   ```

2. **Update your `replication-config.yml`**:
   ```yaml
   replication:
     tables:
       - "existing_table1"
       - "existing_table2"
       - "new_table"        # Add this line
   ```

3. **Restart the replication service**:
   ```bash
   docker-compose restart postgres-replica
   ```

The service will automatically:
- ✅ Add new tables to the publication
- ✅ Refresh all subscriptions to pick up changes
- ✅ Remove tables from publication if they're no longer in config
- ✅ Show current publication status

**Note**: Always create table structures in target databases BEFORE adding them to the config.

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
- `pg_hba_source.conf` - Source database authentication rules  
- `pg_hba_target.conf` - Target database authentication rules

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

**What this sets up:**
- 🗄️ **Source Database** (port 5432): PostgreSQL with logical replication enabled
- 🗄️ **Target Database 1** (port 5433): Replica database (you provide the schema)
- 🗄️ **Target Database 2** (port 5434): Second replica database  
- 🔄 **Replication Service**: Manages logical replication between databases
- 📊 **Health Monitoring**: Available at `http://localhost:3001/health`
- 🔐 **Network Security**: Proper pg_hba.conf for Docker networking

**Note**: You need to create your own database schemas. The containers only provide the PostgreSQL instances with replication configuration.

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
2. **Publication Setup**: Creates or updates the publication on the source database for the specified tables
   - **Dynamic Updates**: Automatically adds new tables or removes tables from existing publications
3. **Subscription Setup**: For each target database:
   - Connects to the target database
   - Validates that all required tables exist with matching schemas
   - Creates or refreshes the subscription to the source publication
4. **Monitoring**: Continuously monitors the replication status and logs health information
5. **Graceful Shutdown**: Handles SIGTERM and SIGINT signals for clean shutdown

### Dynamic Table Management

The service intelligently manages table changes:
- **Adding Tables**: When you add tables to your config, they're automatically added to the publication and subscriptions are refreshed
- **Removing Tables**: When you remove tables from your config, they're automatically removed from the publication
- **No Downtime**: Changes are applied without stopping existing replication

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
3. **Table not found**: Ensure all required tables exist in both source AND target databases with matching schemas
4. **Publication already exists**: The service handles existing publications gracefully
5. **Subscription fails**: Check that target database has proper replication configuration

### Replication-Specific Issues

#### Missing Tables Error
```
❌ Missing required tables in target database: users, posts
```
**Solution**: Target databases must have the same schema as source
```bash
# Option 1: Use the provided schema setup script
./scripts/setup-schema.sh copy-schema

# Option 2: Manually copy schema
pg_dump -h source-host -U source-user --schema-only source-db | \
psql -h target-host -U target-user target-db
```

#### Replication Not Starting
**Check these settings in postgresql.conf:**
- `wal_level = logical`
- `max_replication_slots >= 1`
- `max_wal_senders >= 1` (source only)
- `max_logical_replication_workers >= 1` (target only)

#### Subscription Connection Issues
```
FATAL: no pg_hba.conf entry for replication connection
```
**Solution**: Add replication entry to pg_hba.conf on source database:
```
# Allow replication connections
host replication sourceuser target-host/32 md5
```

### Checking Replication Status

#### Monitor Publication (Source Database):
```sql
-- Check publication exists
SELECT * FROM pg_publication WHERE pubname = 'your_publication';

-- Check published tables
SELECT * FROM pg_publication_tables WHERE pubname = 'your_publication';
```

#### Monitor Subscription (Target Database):
```sql
-- Check subscription status
SELECT * FROM pg_subscription WHERE subname = 'your_subscription';

-- Check replication worker status
SELECT * FROM pg_stat_subscription WHERE subname = 'your_subscription';
```

### Logs

The service provides detailed logging:
- ✅ Success indicators
- ❌ Error indicators  
- 📋 Configuration information
- 🔄 Status updates

```bash
# View replication service logs
docker-compose logs -f postgres-replica

# View database logs
docker-compose logs source-db
docker-compose logs target-db-1
```

## License

ISC

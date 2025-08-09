# PostgreSQL Replica Service

A Docker-based service for managing PostgreSQL logical replication between source and target databases.

 **Docker Hub**: [`darkmatter08/postgres-replica`](https://hub.docker.com/r/darkmatter08/postgres-replica)  
 **Example Repository**: [`dark-matter08/db-sync-test`](https://github.com/dark-matter08/db-sync-test) - Complete working example

## Features

- 🔄 **Multi-target replication**: One source → multiple targets
- � **Docker-native**: Pull and run, no complex setup
- � **YAML configuration**: Simple, version-controllable config
- 🔄 **Dynamic table management**: Add/remove tables without downtime
- 🏥 **Health monitoring**: Built-in status endpoint
- 🛡️ **Production-ready**: Error handling, logging, graceful shutdown

## Quick Start

```bash
# 1. Pull the image
docker pull darkmatter08/postgres-replica:latest

# 2. Create replication-config.yml (see below)

# 3. Run the service
docker run --rm \
  -v "./replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  darkmatter08/postgres-replica:latest

# 4. Check health
curl http://localhost:3001/health
```

## Configuration

Create a `replication-config.yml` file:

```yaml
replication:
  publication_name: "my_publication"
  
  source:
    host: "source-db"
    port: 5432
    user: "postgres"
    password: "password"
    database: "main_db"
  
  targets:
    - name: "replica_1"
      subscription_name: "replica_1_sub"
      host: "target-db-1"
      port: 5432
      user: "postgres"
      password: "password"
      database: "replica_db"
  
  tables:
    - "users"
    - "posts"
    - "orders"
  
  settings:
    max_wait_attempts: 30
    wait_interval_seconds: 5
    enable_initial_sync: true
```

## Prerequisites

### Database Configuration

Both source and target databases need these PostgreSQL settings:

```ini
# postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10                  # Source only
max_logical_replication_workers = 10  # Targets only
max_worker_processes = 16
```

### Schema Requirements

- **Target databases must have identical table structures**
- **All replicated tables must have primary keys**
- **Tables must exist before starting replication**

### Network Access

Configure `pg_hba.conf` to allow replication connections:

```ini
# On source database
host replication postgres target-subnet/24 md5

# On target databases  
host all postgres source-subnet/24 md5
```

## Complete Example with Docker Compose

For a full working example, see the [db-sync-test repository](https://github.com/dark-matter08/db-sync-test).

```yaml
# docker-compose.yml
services:
  postgres-replica:
    image: darkmatter08/postgres-replica:latest
    volumes:
      - ./replication-config.yml:/config/replication-config.yml:ro
    ports:
      - "3001:3000"
    depends_on:
      - source-db
      - target-db
    restart: unless-stopped

  source-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: main_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    command: postgres -c wal_level=logical -c max_replication_slots=10

  target-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: replica_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    command: postgres -c wal_level=logical -c max_logical_replication_workers=10
```

## Adding/Removing Tables

1. **Create tables in target databases** (if adding new ones)
2. **Update `replication-config.yml`**:
   ```yaml
   tables:
     - "users"
     - "posts"
     - "new_table"  # Add this
   ```
3. **Restart the service**:
   ```bash
   docker-compose restart postgres-replica
   ```

The service automatically updates publications and refreshes subscriptions.

## Health Monitoring

```bash
# Check replication status
curl http://localhost:3001/health

# Example response
{
  "status": "healthy",
  "details": {
    "source": {"status": "healthy"},
    "targets": [
      {"name": "replica_1", "status": "healthy"}
    ]
  }
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `Connection refused` | Check database connectivity and ports |
| `Permission denied` | Verify database user permissions and pg_hba.conf |
| `Missing tables` | Ensure tables exist in target databases |
| `Replication not starting` | Check PostgreSQL configuration (wal_level, etc.) |

## Production Deployment

1. **Use persistent volumes** for database data
2. **Set strong passwords** and use secrets management  
3. **Monitor the health endpoint** with your monitoring system
4. **Configure log aggregation** for troubleshooting
5. **Test schema changes** in staging first

## License

ISC

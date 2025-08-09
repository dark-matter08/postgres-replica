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

# 🚀 Quick Start Guide

Get PostgreSQL replication running in under 5 minutes!

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd postgres-replica
```

## Step 2: Start Everything with Docker Compose

```bash
# This starts source DB, target DBs, and replication service
docker-compose up -d
```

This command will:
- �️ Start a source PostgreSQL database with sample data
- 🗄️ Start two target PostgreSQL databases  
- � Start the replication service using `darkmatter08/postgres-replica:latest`
- 📊 Set up logical replication between them

## Step 3: Verify It's Working

```bash
# Check replication health
curl http://localhost:3001/health

# You should see something like:
# {
#   "status": "healthy",
#   "details": {
#     "source": { "status": "healthy" },
#     "targets": [
#       { "name": "primary_replica", "status": "healthy" },
#       { "name": "secondary_replica", "status": "healthy" }
#     ]
#   }
# }
```

## Step 4: Test the Replication

```bash
# Connect to source database and add data
docker exec -it postgres-source psql -U sourceuser -d sourcedb

# In the PostgreSQL prompt:
INSERT INTO users (username, email, full_name) VALUES ('test_user', 'test@example.com', 'Test User');
\q

# Connect to target database and verify the data replicated
docker exec -it postgres-target-1 psql -U targetuser1 -d targetdb1

# In the PostgreSQL prompt:
SELECT * FROM users WHERE username = 'test_user';
# You should see the replicated data!
\q
```

## What Just Happened?

1. **Source Database** (`postgres-source`): Contains your original data
2. **Target Databases** (`postgres-target-1`, `postgres-target-2`): Receive replicated data  
3. **Replication Service** (`darkmatter08/postgres-replica`): Manages the logical replication

## Docker Hub Image

The service is available as a pre-built Docker image:

```bash
docker pull darkmatter08/postgres-replica:latest
```

🐳 **Docker Hub**: https://hub.docker.com/r/darkmatter08/postgres-replica

## Customizing for Your Setup

1. **Edit `replication-config.yml`** to match your database credentials
2. **Modify `docker-compose.yml`** to use your existing databases
3. **Update `init-source.sql`** with your actual database schema

## Alternative: Use with Your Existing Databases

If you already have PostgreSQL databases, just update the `replication-config.yml`:

```yaml
replication:
  publication_name: "my_publication"
  source:
    host: "your-source-db-host"
    port: 5432
    user: "your-source-user"
    password: "your-source-password"
    database: "your-source-db"
  targets:
    - name: "your_target"
      subscription_name: "your_subscription"
      host: "your-target-db-host"
      port: 5432
      user: "your-target-user"
      password: "your-target-password"
      database: "your-target-db"
  tables:
    - "your_table_1"
    - "your_table_2"
```

Then run just the replication service:
```bash
docker run --rm \
  -v "./replication-config.yml:/config/replication-config.yml:ro" \
  -p 3001:3000 \
  darkmatter08/postgres-replica:latest
```

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed configuration options
- 🔧 Check out the [configuration examples](config/) for different setups
- 🐳 Learn about [Docker Hub integration](.github/DOCKER_SETUP.md)

## Troubleshooting

If something isn't working:

```bash
# Check logs
docker-compose logs postgres-replica

# Check individual database logs
docker-compose logs source-db
docker-compose logs target-db-1

# Stop and restart everything
docker-compose down
docker-compose up -d
```

**Common Issues:**
- ❌ **Connection refused**: Check that databases are running (`docker-compose ps`)
- ❌ **Permission denied**: Verify database credentials in `replication-config.yml`
- ❌ **Tables not found**: Make sure your schema exists in both source and target databases

## Production Deployment

For production use:
1. Use persistent volumes for your databases
2. Set strong passwords and use secrets management
3. Configure proper networking and firewalls
4. Monitor the health endpoint (`/health`) with your monitoring system
5. Set up log aggregation for troubleshooting

That's it! You now have PostgreSQL logical replication running. 🎉

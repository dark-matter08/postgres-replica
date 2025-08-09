#!/usr/bin/env node
import { ConfigManager } from './config';
import { ReplicationManager } from './replication';
import { HealthChecker } from './health';
import * as http from 'http';

// Simple HTTP server for health checks
function createHealthServer(healthChecker: HealthChecker): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        const health = await healthChecker.checkHealth();
        res.writeHead(health.status === 'healthy' ? 200 : 503, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(health, null, 2));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return server;
}

async function main() {
  console.log('🚀 Starting PostgreSQL Replication Service');
  console.log('======================================');

  try {
    // Parse configuration from file or environment variable
    console.log('📋 Loading configuration...');
    const config = ConfigManager.parseConfigFromFile();

    console.log(`✅ Configuration loaded successfully`);
    console.log(`📊 Publication: ${config.replication.publication_name}`);
    console.log(
      `📍 Source: ${config.replication.source.host}:${config.replication.source.port}/${config.replication.source.database}`
    );
    console.log(`🎯 Targets: ${config.replication.targets.length}`);
    config.replication.targets.forEach((target, index) => {
      console.log(
        `   ${index + 1}. ${target.name} (${target.host}:${target.port}/${
          target.database
        })`
      );
    });
    console.log(`📋 Tables: ${config.replication.tables.join(', ')}`);
    console.log('');

    // Initialize health checker and HTTP server
    const healthChecker = new HealthChecker(config);
    const healthServer = createHealthServer(healthChecker);
    const port = process.env.PORT || 3000;

    healthServer.listen(port, () => {
      console.log(`🏥 Health check server running on port ${port}`);
      console.log(`   Health endpoint: http://localhost:${port}/health`);
      console.log('');
    });

    // Initialize and run replication manager
    const replicationManager = new ReplicationManager(config);

    // Set up graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      try {
        healthServer.close();
        await replicationManager.cleanup();
        console.log('✅ Cleanup completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Run the replication setup
    await replicationManager.run();

    console.log('✅ Replication setup completed successfully');
    console.log('🔄 Replication is now active');
    console.log('');
    console.log('🎯 Service is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('❌ Replication service failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);

      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the service
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

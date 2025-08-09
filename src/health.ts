import { DatabaseConnection } from './database';
import { ReplicationConfig } from './types';

export class HealthChecker {
  private config: ReplicationConfig;

  constructor(config: ReplicationConfig) {
    this.config = config;
  }

  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      source: { status: string; details?: any };
      targets: Array<{ name: string; status: string; details?: any }>;
    };
  }> {
    const details = {
      source: { status: 'unknown', details: undefined as any },
      targets: [] as Array<{ name: string; status: string; details?: any }>,
    };

    let overallHealthy = true;

    // Check source database
    try {
      const sourceConnection = new DatabaseConnection(
        this.config.replication.source
      );
      await sourceConnection.connect();

      const isConnected = await sourceConnection.testConnection();
      if (isConnected) {
        // Check if publication exists
        const pubResult = await sourceConnection.query(
          'SELECT pubname FROM pg_publication WHERE pubname = $1',
          [this.config.replication.publication_name]
        );

        details.source = {
          status: 'healthy',
          details: {
            connected: true,
            publication_exists: pubResult.rows.length > 0,
            publication_name: this.config.replication.publication_name,
          },
        };
      } else {
        details.source = { status: 'unhealthy', details: { connected: false } };
        overallHealthy = false;
      }

      await sourceConnection.disconnect();
    } catch (error) {
      details.source = {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      overallHealthy = false;
    }

    // Check target databases
    for (const target of this.config.replication.targets) {
      try {
        const targetConnection = new DatabaseConnection(target);
        await targetConnection.connect();

        const isConnected = await targetConnection.testConnection();
        if (isConnected) {
          // Check if subscription exists and is enabled
          const subResult = await targetConnection.query(
            'SELECT subname, subenabled FROM pg_subscription WHERE subname = $1',
            [target.subscription_name]
          );

          const subscriptionExists = subResult.rows.length > 0;
          const subscriptionEnabled =
            subscriptionExists && subResult.rows[0].subenabled;

          details.targets.push({
            name: target.name,
            status:
              subscriptionExists && subscriptionEnabled
                ? 'healthy'
                : 'degraded',
            details: {
              connected: true,
              subscription_exists: subscriptionExists,
              subscription_enabled: subscriptionEnabled,
              subscription_name: target.subscription_name,
            },
          });

          if (!subscriptionExists || !subscriptionEnabled) {
            overallHealthy = false;
          }
        } else {
          details.targets.push({
            name: target.name,
            status: 'unhealthy',
            details: { connected: false },
          });
          overallHealthy = false;
        }

        await targetConnection.disconnect();
      } catch (error) {
        details.targets.push({
          name: target.name,
          status: 'unhealthy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        overallHealthy = false;
      }
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      details,
    };
  }
}

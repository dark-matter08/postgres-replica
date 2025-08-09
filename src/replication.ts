import { DatabaseConnection } from './database';
import {
  ReplicationConfig,
  TargetConfig,
  SyncResult,
  ReplicationSettings,
} from './types';

export class ReplicationManager {
  private config: ReplicationConfig;
  private sourceConnection: DatabaseConnection;

  constructor(config: ReplicationConfig) {
    this.config = config;
    this.sourceConnection = new DatabaseConnection(
      this.config.replication.source
    );
  }

  async initialize(): Promise<void> {
    console.log('Initializing replication manager...');

    // Connect to source database
    await this.sourceConnection.connect();

    // Test source connection
    const sourceConnected = await this.sourceConnection.testConnection();
    if (!sourceConnected) {
      throw new Error('Failed to connect to source database');
    }

    console.log(
      `Source database connected: ${this.sourceConnection.getConnectionInfo()}`
    );
  }

  async setupPublication(): Promise<void> {
    console.log('🔄 Setting up publication on source database...');

    const publicationName = this.config.replication.publication_name;
    const configTables = this.config.replication.tables;

    try {
      // Check if publication already exists
      const checkResult = await this.sourceConnection.query(
        'SELECT pubname FROM pg_publication WHERE pubname = $1',
        [publicationName]
      );

      if (checkResult.rows.length === 0) {
        // Create new publication
        console.log(`📋 Creating new publication "${publicationName}"...`);
        const tablesList = configTables.map((table) => `"${table}"`).join(', ');
        await this.sourceConnection.query(
          `CREATE PUBLICATION "${publicationName}" FOR TABLE ${tablesList}`
        );
        console.log(
          `✅ Publication "${publicationName}" created for tables: ${configTables.join(
            ', '
          )}`
        );
      } else {
        console.log(
          `📋 Publication "${publicationName}" already exists, checking for updates...`
        );

        // Get current tables in the publication
        const currentTablesResult = await this.sourceConnection.query(
          'SELECT tablename FROM pg_publication_tables WHERE pubname = $1',
          [publicationName]
        );

        const currentTables = currentTablesResult.rows.map(
          (row: any) => row.tablename
        );
        const configTablesSet = new Set(configTables);
        const currentTablesSet = new Set(currentTables);

        // Find tables to add and remove
        const tablesToAdd = configTables.filter(
          (table) => !currentTablesSet.has(table)
        );
        const tablesToRemove = currentTables.filter(
          (table: any) => !configTablesSet.has(table)
        );

        // Add new tables to publication
        if (tablesToAdd.length > 0) {
          console.log(
            `➕ Adding tables to publication: ${tablesToAdd.join(', ')}`
          );
          for (const table of tablesToAdd) {
            await this.sourceConnection.query(
              `ALTER PUBLICATION "${publicationName}" ADD TABLE "${table}"`
            );
          }
          console.log(`✅ Added ${tablesToAdd.length} table(s) to publication`);
        }

        // Remove tables from publication
        if (tablesToRemove.length > 0) {
          console.log(
            `➖ Removing tables from publication: ${tablesToRemove.join(', ')}`
          );
          for (const table of tablesToRemove) {
            await this.sourceConnection.query(
              `ALTER PUBLICATION "${publicationName}" DROP TABLE "${table}"`
            );
          }
          console.log(
            `✅ Removed ${tablesToRemove.length} table(s) from publication`
          );
        }

        if (tablesToAdd.length === 0 && tablesToRemove.length === 0) {
          console.log(
            `✅ Publication "${publicationName}" is already up to date`
          );
        }
      }
    } catch (error) {
      console.error('❌ Error setting up publication:', error);
      throw error;
    }
  }

  async setupSubscriptions(): Promise<SyncResult[]> {
    console.log('Setting up subscriptions on target databases...');
    const results: SyncResult[] = [];

    for (const target of this.config.replication.targets) {
      const result = await this.setupSingleSubscription(target);
      results.push(result);
    }

    return results;
  }

  private async setupSingleSubscription(
    target: TargetConfig
  ): Promise<SyncResult> {
    const targetConnection = new DatabaseConnection(target);

    try {
      await targetConnection.connect();

      // Test connection
      const connected = await targetConnection.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to target database');
      }

      console.log(`Setting up subscription for target: ${target.name}`);

      // Merge target settings with global settings
      const settings = this.mergeSettings(target.settings);

      // Get tables for this target (use target-specific or global)
      const tables = target.tables || this.config.replication.tables;

      // Validate that all required tables exist in the target database
      await this.validateTablesExist(targetConnection, tables);

      // Check if subscription already exists
      const checkResult = await targetConnection.query(
        'SELECT subname FROM pg_subscription WHERE subname = $1',
        [target.subscription_name]
      );

      if (checkResult.rows.length === 0) {
        // Build connection string for subscription
        const connStr = `host=${this.config.replication.source.host} port=${this.config.replication.source.port} user=${this.config.replication.source.user} password=${this.config.replication.source.password} dbname=${this.config.replication.source.database}`;

        // Create subscription
        console.log(
          `📋 Creating new subscription "${target.subscription_name}"...`
        );
        await targetConnection.query(
          `CREATE SUBSCRIPTION "${target.subscription_name}" CONNECTION '${connStr}' PUBLICATION "${this.config.replication.publication_name}"`
        );

        console.log(
          `✅ Subscription "${target.subscription_name}" created for target: ${target.name}`
        );
      } else {
        console.log(
          `📋 Subscription "${target.subscription_name}" already exists, refreshing...`
        );

        // Refresh the subscription to pick up any publication changes
        // This ensures the subscription gets the latest table list from the publication
        try {
          await targetConnection.query(
            `ALTER SUBSCRIPTION "${target.subscription_name}" REFRESH PUBLICATION`
          );
          console.log(
            `🔄 Refreshed subscription "${target.subscription_name}" for target: ${target.name}`
          );
        } catch (refreshError) {
          console.warn(
            `⚠️  Failed to refresh subscription "${
              target.subscription_name
            }": ${
              refreshError instanceof Error
                ? refreshError.message
                : 'Unknown error'
            }`
          );
          console.log('   This might be normal if no changes were needed.');
        }
      }

      await targetConnection.disconnect();

      return {
        success: true,
        target: target.name,
        message: `Subscription setup completed successfully`,
      };
    } catch (error) {
      console.error(`Error setting up subscription for ${target.name}:`, error);

      try {
        await targetConnection.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting from target:', disconnectError);
      }

      return {
        success: false,
        target: target.name,
        message: `Subscription setup failed`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mergeSettings(
    targetSettings?: ReplicationSettings
  ): ReplicationSettings {
    return {
      ...this.config.replication.settings,
      ...targetSettings,
    };
  }

  private async validateTablesExist(
    connection: DatabaseConnection,
    tables: string[]
  ): Promise<void> {
    console.log(
      `🔍 Validating that required tables exist: ${tables.join(', ')}`
    );

    const missingTables: string[] = [];

    for (const table of tables) {
      try {
        // Check if table exists
        const result = await connection.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );

        if (!result.rows[0].exists) {
          missingTables.push(table);
        } else {
          console.log(`✅ Table "${table}" exists in target database`);
        }
      } catch (error) {
        console.error(`❌ Error checking table "${table}":`, error);
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      const errorMessage = `❌ Missing required tables in target database: ${missingTables.join(
        ', '
      )}. 
Please ensure all tables exist in the target database before setting up replication.
Tables must be created manually to ensure proper schema consistency.`;

      console.error(errorMessage);
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    console.log(`✅ All required tables exist in target database`);
  }

  async monitorReplication(): Promise<void> {
    console.log('Starting replication monitoring...');

    const settings = this.config.replication.settings;
    const maxAttempts = settings.max_wait_attempts || 30;
    const waitInterval = (settings.wait_interval_seconds || 5) * 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkReplicationStatus();
        console.log(
          `Replication status check ${attempt}/${maxAttempts}:`,
          status
        );

        if (status.allActive) {
          console.log('All replications are active and healthy');
          break;
        }

        if (attempt < maxAttempts) {
          console.log(
            `Waiting ${settings.wait_interval_seconds} seconds before next check...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitInterval));
        }
      } catch (error) {
        console.error(
          `Replication status check failed (attempt ${attempt}):`,
          error
        );

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, waitInterval));
        }
      }
    }
  }

  private async checkReplicationStatus(): Promise<{
    allActive: boolean;
    details: any[];
  }> {
    const details = [];
    let allActive = true;

    for (const target of this.config.replication.targets) {
      const targetConnection = new DatabaseConnection(target);

      try {
        await targetConnection.connect();

        // Check subscription status
        const result = await targetConnection.query(
          'SELECT subname, subenabled, subslotname FROM pg_subscription WHERE subname = $1',
          [target.subscription_name]
        );

        const isActive = result.rows.length > 0 && result.rows[0].subenabled;
        if (!isActive) {
          allActive = false;
        }

        details.push({
          target: target.name,
          subscription: target.subscription_name,
          active: isActive,
          details: result.rows[0] || null,
        });

        await targetConnection.disconnect();
      } catch (error) {
        allActive = false;
        details.push({
          target: target.name,
          subscription: target.subscription_name,
          active: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { allActive, details };
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up replication manager...');

    try {
      await this.sourceConnection.disconnect();
    } catch (error) {
      console.error('Error disconnecting from source:', error);
    }
  }

  async run(): Promise<void> {
    try {
      await this.initialize();

      // Show what we're about to set up
      console.log(
        `🎯 Target tables for replication: ${this.config.replication.tables.join(
          ', '
        )}`
      );

      await this.setupPublication();
      const results = await this.setupSubscriptions();

      // Log results
      results.forEach((result) => {
        if (result.success) {
          console.log(`✅ ${result.target}: ${result.message}`);
        } else {
          console.error(
            `❌ ${result.target}: ${result.message} - ${result.error}`
          );
        }
      });

      // Show current publication status
      await this.showPublicationStatus();

      // Monitor replication
      await this.monitorReplication();
    } catch (error) {
      console.error('❌ Replication setup failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async showPublicationStatus(): Promise<void> {
    try {
      console.log('📊 Current publication status:');

      // Get publication info
      const pubResult = await this.sourceConnection.query(
        'SELECT pubname FROM pg_publication WHERE pubname = $1',
        [this.config.replication.publication_name]
      );

      if (pubResult.rows.length === 0) {
        console.log(
          `   ❌ Publication "${this.config.replication.publication_name}" not found`
        );
        return;
      }

      // Get current published tables
      const tablesResult = await this.sourceConnection.query(
        'SELECT tablename FROM pg_publication_tables WHERE pubname = $1 ORDER BY tablename',
        [this.config.replication.publication_name]
      );

      const publishedTables = tablesResult.rows.map(
        (row: any) => row.tablename
      );

      console.log(
        `   📋 Publication: "${this.config.replication.publication_name}"`
      );
      console.log(
        `   📊 Published tables (${
          publishedTables.length
        }): ${publishedTables.join(', ')}`
      );

      // Check for any tables in config but not published
      const configTables = this.config.replication.tables;
      const missingTables = configTables.filter(
        (table) => !publishedTables.includes(table)
      );

      if (missingTables.length > 0) {
        console.log(
          `   ⚠️  Tables in config but not published: ${missingTables.join(
            ', '
          )}`
        );
      }
    } catch (error) {
      console.error('❌ Error checking publication status:', error);
    }
  }
}

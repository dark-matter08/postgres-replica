import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { ReplicationConfig } from './types';

export class ConfigManager {
  static parseConfig(configString: string): ReplicationConfig {
    try {
      const config = yaml.load(configString) as ReplicationConfig;
      this.validateConfig(config);
      return config;
    } catch (error) {
      console.error('Error parsing configuration:', error);
      throw new Error(
        `Invalid configuration: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  static parseConfigFromFile(filePath?: string): ReplicationConfig {
    // Try different config file locations in order of preference
    const configPaths = [
      filePath, // User specified path
      process.env.CONFIG_FILE, // Environment variable
      '/config/replication-config.yml', // Docker volume mount
      './config/replication-config.yml', // Local config directory
      './replication-config.yml', // Current directory
      '../replication-config.yml', // Parent directory (for development)
    ].filter(Boolean); // Remove undefined values

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath!)) {
          console.log(`📋 Loading configuration from: ${configPath}`);
          const configContent = fs.readFileSync(configPath!, 'utf8');
          return this.parseConfig(configContent);
        }
      } catch (error) {
        console.warn(
          `⚠️  Failed to read config from ${configPath}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    // Fallback to environment variable (backward compatibility)
    const configEnv = process.env.REPLICATION_CONFIG;
    if (configEnv) {
      console.log(
        '📋 Loading configuration from REPLICATION_CONFIG environment variable'
      );
      return this.parseConfig(configEnv);
    }

    throw new Error(
      `No configuration found. Tried the following locations:\n${configPaths
        .map((p) => `  - ${p}`)
        .join(
          '\n'
        )}\n\nAlternatively, set REPLICATION_CONFIG environment variable.`
    );
  }

  static parseConfigFromEnv(): ReplicationConfig {
    const configEnv = process.env.REPLICATION_CONFIG;

    if (!configEnv) {
      throw new Error('REPLICATION_CONFIG environment variable is not set');
    }

    try {
      // Try to parse as YAML first
      return this.parseConfig(configEnv);
    } catch (yamlError) {
      try {
        // Fallback to JSON parsing
        const config = JSON.parse(configEnv) as ReplicationConfig;
        this.validateConfig(config);
        return config;
      } catch (jsonError) {
        throw new Error('REPLICATION_CONFIG must be valid YAML or JSON format');
      }
    }
  }

  private static validateConfig(config: ReplicationConfig): void {
    if (!config?.replication) {
      throw new Error('Missing "replication" section in configuration');
    }

    const repl = config.replication;

    // Validate publication name
    if (!repl.publication_name) {
      throw new Error('Missing publication_name in configuration');
    }

    // Validate source database
    if (!repl.source) {
      throw new Error('Missing source database configuration');
    }
    this.validateDatabaseConfig(repl.source, 'source');

    // Validate targets
    if (
      !repl.targets ||
      !Array.isArray(repl.targets) ||
      repl.targets.length === 0
    ) {
      throw new Error('At least one target database must be configured');
    }

    repl.targets.forEach((target, index) => {
      if (!target.name) {
        throw new Error(`Target ${index + 1} is missing a name`);
      }
      if (!target.subscription_name) {
        throw new Error(`Target "${target.name}" is missing subscription_name`);
      }
      this.validateDatabaseConfig(target, `target "${target.name}"`);
    });

    // Validate tables
    if (
      !repl.tables ||
      !Array.isArray(repl.tables) ||
      repl.tables.length === 0
    ) {
      throw new Error('At least one table must be specified for replication');
    }

    // Validate settings (optional)
    if (repl.settings) {
      this.validateSettings(repl.settings);
    }
  }

  private static validateDatabaseConfig(config: any, name: string): void {
    const requiredFields = ['host', 'port', 'user', 'password', 'database'];

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing ${field} in ${name} database configuration`);
      }
    }

    if (
      typeof config.port !== 'number' ||
      config.port <= 0 ||
      config.port > 65535
    ) {
      throw new Error(`Invalid port number for ${name} database`);
    }
  }

  private static validateSettings(settings: any): void {
    if (settings.max_wait_attempts !== undefined) {
      if (
        typeof settings.max_wait_attempts !== 'number' ||
        settings.max_wait_attempts <= 0
      ) {
        throw new Error('max_wait_attempts must be a positive number');
      }
    }

    if (settings.wait_interval_seconds !== undefined) {
      if (
        typeof settings.wait_interval_seconds !== 'number' ||
        settings.wait_interval_seconds <= 0
      ) {
        throw new Error('wait_interval_seconds must be a positive number');
      }
    }

    if (
      settings.enable_initial_sync !== undefined &&
      typeof settings.enable_initial_sync !== 'boolean'
    ) {
      throw new Error('enable_initial_sync must be a boolean');
    }

    if (
      settings.disable_triggers_during_sync !== undefined &&
      typeof settings.disable_triggers_during_sync !== 'boolean'
    ) {
      throw new Error('disable_triggers_during_sync must be a boolean');
    }
  }

  static getDefaultConfig(): ReplicationConfig {
    return {
      replication: {
        publication_name: 'default_publication',
        source: {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'sourcedb',
        },
        targets: [
          {
            name: 'default_target',
            subscription_name: 'default_subscription',
            host: 'localhost',
            port: 5433,
            user: 'postgres',
            password: 'password',
            database: 'targetdb',
          },
        ],
        tables: ['users', 'posts'],
        settings: {
          max_wait_attempts: 30,
          wait_interval_seconds: 5,
          enable_initial_sync: true,
          disable_triggers_during_sync: true,
        },
      },
    };
  }
}

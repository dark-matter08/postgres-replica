export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface TargetConfig extends DatabaseConfig {
  name: string;
  subscription_name: string;
  settings?: {
    enable_initial_sync?: boolean;
    disable_triggers_during_sync?: boolean;
  };
  tables?: string[];
}

export interface ReplicationSettings {
  max_wait_attempts?: number;
  wait_interval_seconds?: number;
  enable_initial_sync?: boolean;
  disable_triggers_during_sync?: boolean;
}

export interface ReplicationConfig {
  replication: {
    publication_name: string;
    source: DatabaseConfig;
    targets: TargetConfig[];
    tables: string[];
    settings: ReplicationSettings;
  };
}

export interface SyncResult {
  success: boolean;
  target: string;
  message: string;
  error?: string;
}

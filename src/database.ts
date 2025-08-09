import { Client } from 'pg';
import { DatabaseConfig } from './types';

export class DatabaseConnection {
  private client: Client;

  constructor(config: DatabaseConfig) {
    this.client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log(
      `Connected to database at ${this.client.host}:${this.client.port}`
    );
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    console.log(
      `Disconnected from database at ${this.client.host}:${this.client.port}`
    );
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await this.client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  getConnectionInfo(): string {
    return `${this.client.host}:${this.client.port}/${this.client.database}`;
  }
}

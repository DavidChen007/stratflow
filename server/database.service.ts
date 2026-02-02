
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;

  async onModuleInit() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'stratflow',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await this.initTables();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async initTables() {
    const connection = await this.pool.getConnection();
    try {
      // 企业基础表
      await connection.query(`
        CREATE TABLE IF NOT EXISTS enterprises (
          name VARCHAR(255) PRIMARY KEY,
          display_name VARCHAR(255),
          password VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 工作空间 JSON 存储表
      await connection.query(`
        CREATE TABLE IF NOT EXISTS workspaces (
          ent_name VARCHAR(255) PRIMARY KEY,
          data LONGTEXT,
          updated_at BIGINT,
          CONSTRAINT fk_enterprise FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      
      console.log('NestJS Database Service: MySQL Tables checked.');
    } finally {
      connection.release();
    }
  }

  async query(sql: string, params: any[] = []) {
    return this.pool.query(sql, params);
  }
}

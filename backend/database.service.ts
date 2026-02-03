
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;

  async onModuleInit() {
    // 数据库配置完全从环境变量获取
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'stratflow',
      waitForConnections: true,
      connectionLimit: 10,
    });

    await this.initTables();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async initTables() {
    const conn = await this.pool.getConnection();
    try {
      // 1. 创建表结构
      await conn.query(`CREATE TABLE IF NOT EXISTS enterprises (name VARCHAR(255) PRIMARY KEY, display_name VARCHAR(255), password VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS users (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), username VARCHAR(255), password VARCHAR(255), name VARCHAR(255), role VARCHAR(50), department_id VARCHAR(255), CONSTRAINT fk_user_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS processes (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), name VARCHAR(255), category VARCHAR(255), level INT, version VARCHAR(50), is_active BOOLEAN, owner VARCHAR(255), co_owner VARCHAR(255), objective TEXT, nodes_json LONGTEXT, links_json LONGTEXT, history_json LONGTEXT, updated_at BIGINT, CONSTRAINT fk_proc_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS departments (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), name VARCHAR(255), manager VARCHAR(255), roles_json TEXT, parent_id VARCHAR(255), CONSTRAINT fk_dept_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS strategies (ent_name VARCHAR(255) PRIMARY KEY, mission TEXT, vision TEXT, customer_issues TEXT, employee_issues TEXT, okrs_json LONGTEXT, CONSTRAINT fk_strat_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS weekly_pads (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), week_id VARCHAR(50), owner_id VARCHAR(255), type VARCHAR(50), entries_json LONGTEXT, CONSTRAINT fk_pad_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

      // 2. 种子数据初始化 (Seed Data)
      // 如果没有任何企业，则创建一个演示企业空间，避免业务代码硬编码
      const [ents]: any = await conn.query("SELECT COUNT(*) as count FROM enterprises");
      if (ents[0].count === 0) {
        console.log("Initializing seed data for the first time...");
        const demoEnt = 'default';
        await conn.query("INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)", [demoEnt, '演示企业空间', 'stratflow']);
        await conn.query("INSERT INTO users (id, ent_name, username, password, name, role) VALUES (?, ?, ?, ?, ?, ?)", [`admin-init`, demoEnt, 'admin', '888888', '系统管理员', 'Admin']);
        await conn.query("INSERT INTO strategies (ent_name, mission, vision, okrs_json) VALUES (?, '', '', '{}')", [demoEnt]);
      }
      
      console.log('NestJS Database Service initialized with security context.');
    } finally {
      conn.release();
    }
  }

  async query(sql: string, params: any[] = []) {
    return this.pool.query(sql, params);
  }
}

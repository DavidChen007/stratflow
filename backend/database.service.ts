
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;

  async onModuleInit() {
    // 数据库连接参数从环境变量读取，严禁硬编码
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
      // 1. 核心表结构定义
      await conn.query(`CREATE TABLE IF NOT EXISTS enterprises (name VARCHAR(255) PRIMARY KEY, display_name VARCHAR(255), password VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS users (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), username VARCHAR(255), password VARCHAR(255), name VARCHAR(255), role VARCHAR(50), department_id VARCHAR(255), CONSTRAINT fk_user_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS processes (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), name VARCHAR(255), category VARCHAR(255), level INT, version VARCHAR(50), is_active BOOLEAN, owner VARCHAR(255), co_owner VARCHAR(255), objective TEXT, nodes_json LONGTEXT, links_json LONGTEXT, history_json LONGTEXT, updated_at BIGINT, CONSTRAINT fk_proc_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS departments (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), name VARCHAR(255), manager VARCHAR(255), roles_json TEXT, parent_id VARCHAR(255), CONSTRAINT fk_dept_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS strategies (ent_name VARCHAR(255) PRIMARY KEY, mission TEXT, vision TEXT, customer_issues TEXT, employee_issues TEXT, okrs_json LONGTEXT, CONSTRAINT fk_strat_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await conn.query(`CREATE TABLE IF NOT EXISTS weekly_pads (id VARCHAR(255) PRIMARY KEY, ent_name VARCHAR(255), week_id VARCHAR(50), owner_id VARCHAR(255), type VARCHAR(50), entries_json LONGTEXT, CONSTRAINT fk_pad_ent FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

      // 2. 首次运行种子数据 (Seed Data)
      // 检查是否是全新数据库
      const [ents]: any = await conn.query("SELECT COUNT(*) as count FROM enterprises");
      if (ents[0].count === 0) {
        console.log("StratFlow System: Detecting empty database. Performing first-time initialization...");
        const demoId = 'stratflow-demo';
        
        // 创建初始演示租户
        await conn.query("INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)", [demoId, 'StratFlow 演示空间', 'stratflow']);
        
        // 创建默认超级管理员 (admin / 888888)
        await conn.query(
          "INSERT INTO users (id, ent_name, username, password, name, role) VALUES (?, ?, ?, ?, ?, ?)",
          [`admin-${Date.now()}`, demoId, 'admin', '888888', '系统管理员', 'Admin']
        );

        // 创建初始战略底座
        await conn.query(
          "INSERT INTO strategies (ent_name, mission, vision, okrs_json) VALUES (?, '为企业提供最直观的数字化战略治理底座', '成为企业价值链资产管理的标准工具', '{}')",
          [demoId]
        );
        
        console.log("StratFlow System: Seed data injected successfully.");
      }
      
      console.log('NestJS Secure Database connection verified.');
    } finally {
      conn.release();
    }
  }

  async query(sql: string, params: any[] = []) {
    return this.pool.query(sql, params);
  }
}

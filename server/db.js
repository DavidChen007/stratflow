
const mysql = require('mysql2/promise');

// 数据库连接池配置
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stratflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * 初始化数据库表结构
 */
async function initDB() {
  const connection = await pool.getConnection();
  try {
    // 1. 企业表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS enterprises (
        name VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        password VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. 工作空间表 (使用 LONGTEXT 存储大型 JSON)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        ent_name VARCHAR(255) PRIMARY KEY,
        data LONGTEXT,
        updated_at BIGINT,
        CONSTRAINT fk_enterprise FOREIGN KEY (ent_name) REFERENCES enterprises(name) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('MySQL Database & Tables initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize MySQL database:', err.message);
  } finally {
    connection.release();
  }
}

initDB();

module.exports = {
  pool
};

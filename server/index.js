
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- API 路由 ---

/**
 * 获取所有企业列表
 * GET /api/enterprises
 */
app.get('/api/enterprises', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT name, display_name, password FROM enterprises");
    const enterprises = rows.map(row => ({
      name: row.name,
      displayName: row.display_name,
      password: row.password
    }));
    res.json(enterprises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * 注册新企业
 * POST /api/enterprises
 */
app.post('/api/enterprises', async (req, res) => {
  const { name, displayName, password } = req.body;
  if (!name || !displayName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    await pool.query(
      "INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)",
      [name, displayName, password || 'root']
    );
    res.status(201).json({ message: "Enterprise created" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: "Enterprise ID already exists" });
    } else {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
});

/**
 * 获取工作空间数据
 * GET /api/workspace/:entId
 */
app.get('/api/workspace/:entId', async (req, res) => {
  const entId = req.params.entId;
  try {
    const [rows] = await pool.query("SELECT data FROM workspaces WHERE ent_name = ?", [entId]);
    if (rows.length > 0 && rows[0].data) {
      try {
        res.json({ state: JSON.parse(rows[0].data) });
      } catch (e) {
        res.status(500).json({ error: "Data parsing error" });
      }
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * 保存/更新工作空间数据
 * POST /api/workspace/:entId
 */
app.post('/api/workspace/:entId', async (req, res) => {
  const entId = req.params.entId;
  const { state } = req.body;

  if (!state) {
    res.status(400).json({ error: "No state data provided" });
    return;
  }

  const jsonString = JSON.stringify(state);
  const updatedAt = Date.now();

  try {
    // 使用 MySQL 的 ON DUPLICATE KEY UPDATE 语法
    await pool.query(`
      INSERT INTO workspaces (ent_name, data, updated_at) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
      data = VALUES(data),
      updated_at = VALUES(updated_at)
    `, [entId, jsonString, updatedAt]);
    
    res.json({ success: true, updatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`StratFlow Backend (MySQL Mode) running on http://localhost:${PORT}`);
});

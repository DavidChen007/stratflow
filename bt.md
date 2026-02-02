
# StratFlow AI 后端与数据库设计指南 (v3.0)

## 1. 数据库建模 (Entity-Relationship)

### 表 3: `processes` (流程治理表)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| owner | VARCHAR(100) | 主责任人 (部门或姓名) |
| co_owner | VARCHAR(100) | 辅助责任人 |
| objective | TEXT | 流程业务目标 |
| history_json | JSONB | 历史快照数组 `[{version, nodes, links, published_at}]` |

---

## 2. 版本管理逻辑 (Versioning)

1. **草稿与发布 (Draft vs Published)**:
   - `nodes` 和 `links` 字段始终存储“正在编辑”的草稿。
   - `history_json` 存储过去发布的所有快照。
   - 只有发布 (Publish) 动作会将草稿深拷贝进 `history_json` 并更新 `is_active`。

2. **回溯逻辑 (Rollback)**:
   - 回溯操作不应删除历史，而是从 `history_json` 中取出一个快照，覆盖当前的 `nodes` 和 `links` 草稿。

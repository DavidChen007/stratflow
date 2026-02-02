import { Controller, Get, Post, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly db: DatabaseService) {}

  // --- Processes ---
  @Get('processes/:entId')
  async getProcesses(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT * FROM processes WHERE ent_name = ?", [entId]);
    return rows.map((r: any) => ({
      ...r,
      nodes: JSON.parse(r.nodes_json || '[]'),
      links: JSON.parse(r.links_json || '[]'),
      history: JSON.parse(r.history_json || '[]')
    }));
  }

  @Post('processes/:entId')
  async saveProcess(@Param('entId') entId: string, @Body() proc: any) {
    await this.db.query(`
      INSERT INTO processes (id, ent_name, name, category, level, version, is_active, owner, co_owner, objective, nodes_json, links_json, history_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name=VALUES(name), category=VALUES(category), level=VALUES(level), version=VALUES(version), is_active=VALUES(is_active), 
      owner=VALUES(owner), co_owner=VALUES(co_owner), objective=VALUES(objective), 
      nodes_json=VALUES(nodes_json), links_json=VALUES(links_json), history_json=VALUES(history_json), updated_at=VALUES(updated_at)
    `, [proc.id, entId, proc.name, proc.category, proc.level, proc.version, proc.isActive, proc.owner, proc.coOwner, proc.objective, JSON.stringify(proc.nodes), JSON.stringify(proc.links), JSON.stringify(proc.history), proc.updatedAt]);
    return { success: true };
  }

  // --- Strategy ---
  @Get('strategy/:entId')
  async getStrategy(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT mission, vision, okrs_json FROM strategies WHERE ent_name = ?", [entId]);
    if (rows.length === 0) return null;
    return {
      mission: rows[0].mission,
      vision: rows[0].vision,
      companyOKRs: JSON.parse(rows[0].okrs_json || '{}')
    };
  }

  @Post('strategy/:entId')
  async saveStrategy(@Param('entId') entId: string, @Body() body: any) {
    await this.db.query(`
      UPDATE strategies SET mission = ?, vision = ?, okrs_json = ? WHERE ent_name = ?
    `, [body.mission, body.vision, JSON.stringify(body.companyOKRs), entId]);
    return { success: true };
  }

  // --- Departments (Simple JSON array for now as they are small) ---
  @Get('departments/:entId')
  async getDepts(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT * FROM departments WHERE ent_name = ?", [entId]);
    return rows.map((r: any) => ({
      ...r,
      roles: JSON.parse(r.roles_json || '[]')
    }));
  }

  @Post('departments/:entId')
  async saveDepts(@Param('entId') entId: string, @Body() depts: any[]) {
    // 简易处理：先删后插
    await this.db.query("DELETE FROM departments WHERE ent_name = ?", [entId]);
    for (const d of depts) {
      await this.db.query("INSERT INTO departments (id, ent_name, name, manager, roles_json, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
        [d.id, entId, d.name, d.manager, JSON.stringify(d.roles), d.parent_id]);
    }
    return { success: true };
  }
}

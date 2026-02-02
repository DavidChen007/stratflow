
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
      history: JSON.parse(r.history_json || '[]'),
      isActive: Boolean(r.is_active)
    }));
  }

  @Post('processes/:entId')
  async saveProcess(@Param('entId') entId: string, @Body() proc: any) {
    try {
      await this.db.query(`
        INSERT INTO processes (id, ent_name, name, category, level, version, is_active, owner, co_owner, objective, nodes_json, links_json, history_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name=VALUES(name), category=VALUES(category), level=VALUES(level), version=VALUES(version), is_active=VALUES(is_active), 
        owner=VALUES(owner), co_owner=VALUES(co_owner), objective=VALUES(objective), nodes_json=VALUES(nodes_json), links_json=VALUES(links_json), history_json=VALUES(history_json), updated_at=VALUES(updated_at)
      `, [
        proc.id, 
        entId, 
        proc.name, 
        proc.category, 
        proc.level, 
        proc.version, 
        proc.isActive ? 1 : 0, 
        proc.owner || '', 
        proc.coOwner || '', 
        proc.objective || '', 
        JSON.stringify(proc.nodes || []), 
        JSON.stringify(proc.links || []), 
        JSON.stringify(proc.history || []), 
        proc.updatedAt || Date.now()
      ]);
      return { success: true };
    } catch (e: any) {
      console.error("SQL Error in saveProcess:", e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('processes/:entId/:procId')
  async deleteProcess(@Param('entId') entId: string, @Param('procId') procId: string) {
    await this.db.query("DELETE FROM processes WHERE ent_name = ? AND id = ?", [entId, procId]);
    return { success: true };
  }

  // --- Strategy ---
  @Get('strategy/:entId')
  async getStrategy(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT mission, vision, okrs_json FROM strategies WHERE ent_name = ?", [entId]);
    if (rows.length === 0) return { mission: '', vision: '', companyOKRs: {} };
    return {
      mission: rows[0].mission || '',
      vision: rows[0].vision || '',
      companyOKRs: JSON.parse(rows[0].okrs_json || '{}')
    };
  }

  @Post('strategy/:entId')
  async saveStrategy(@Param('entId') entId: string, @Body() body: any) {
    await this.db.query(`
      INSERT INTO strategies (ent_name, mission, vision, okrs_json) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE mission=VALUES(mission), vision=VALUES(vision), okrs_json=VALUES(okrs_json)
    `, [entId, body.mission || '', body.vision || '', JSON.stringify(body.companyOKRs || {})]);
    return { success: true };
  }

  // --- Departments (Accepts Flat List from Frontend) ---
  @Get('departments/:entId')
  async getDepts(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT * FROM departments WHERE ent_name = ?", [entId]);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      manager: r.manager,
      roles: JSON.parse(r.roles_json || '[]'),
      parent_id: r.parent_id
    }));
  }

  @Post('departments/:entId')
  async saveDepts(@Param('entId') entId: string, @Body() depts: any[]) {
    const connection = await this.db.query("SELECT 1"); // Dummy to ensure connection works
    try {
      await this.db.query("DELETE FROM departments WHERE ent_name = ?", [entId]);
      for (const d of depts) {
        await this.db.query("INSERT INTO departments (id, ent_name, name, manager, roles_json, parent_id) VALUES (?, ?, ?, ?, ?, ?)",
          [d.id, entId, d.name, d.manager || '', JSON.stringify(d.roles || []), d.parent_id || null]);
      }
      return { success: true };
    } catch (e: any) {
      console.error("SQL Error in saveDepts:", e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // --- Weekly PADs ---
  @Get('pads/:entId')
  async getPADs(@Param('entId') entId: string) {
    const [rows]: any = await this.db.query("SELECT * FROM weekly_pads WHERE ent_name = ?", [entId]);
    return rows.map((r: any) => ({
      id: r.id,
      weekId: r.week_id,
      ownerId: r.owner_id,
      type: r.type,
      entries: JSON.parse(r.entries_json || '[]')
    }));
  }

  @Post('pads/:entId')
  async savePADs(@Param('entId') entId: string, @Body() pads: any[]) {
    try {
      await this.db.query("DELETE FROM weekly_pads WHERE ent_name = ?", [entId]);
      for (const p of pads) {
        await this.db.query("INSERT INTO weekly_pads (id, ent_name, week_id, owner_id, type, entries_json) VALUES (?, ?, ?, ?, ?, ?)",
          [p.id, entId, p.weekId, p.ownerId, p.type, JSON.stringify(p.entries || [])]);
      }
      return { success: true };
    } catch (e: any) {
      console.error("SQL Error in savePADs:", e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

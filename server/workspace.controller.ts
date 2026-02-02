
import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':entId')
  async findOne(@Param('entId') entId: string) {
    try {
      const [rows]: any = await this.db.query("SELECT data FROM workspaces WHERE ent_name = ?", [entId]);
      if (rows.length > 0 && rows[0].data) {
        return { state: JSON.parse(rows[0].data) };
      }
      return null;
    } catch (err) {
      throw new HttpException('Database error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':entId')
  async save(@Param('entId') entId: string, @Body() body: { state: any }) {
    const { state } = body;
    if (!state) {
      throw new HttpException('No state data provided', HttpStatus.BAD_REQUEST);
    }

    const jsonString = JSON.stringify(state);
    const updatedAt = Date.now();

    try {
      await this.db.query(`
        INSERT INTO workspaces (ent_name, data, updated_at) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        data = VALUES(data),
        updated_at = VALUES(updated_at)
      `, [entId, jsonString, updatedAt]);
      
      return { success: true, updatedAt };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { Controller, Get, Post, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('users')
export class UserController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async findByEnterprise(@Query('entId') entId: string) {
    if (!entId) throw new HttpException('Missing entId', HttpStatus.BAD_REQUEST);
    const [rows]: any = await this.db.query("SELECT id, username, name, role, department_id FROM users WHERE ent_name = ?", [entId]);
    return rows;
  }

  @Post()
  async save(@Body() user: any) {
    const { id, ent_name, username, password, name, role, department_id } = user;
    try {
      await this.db.query(`
        INSERT INTO users (id, ent_name, username, password, name, role, department_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        password = VALUES(password),
        name = VALUES(name),
        role = VALUES(role),
        department_id = VALUES(department_id)
      `, [id, ent_name, username, password || '888888', name, role, department_id]);
      return { success: true };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.db.query("DELETE FROM users WHERE id = ?", [id]);
    return { success: true };
  }
}

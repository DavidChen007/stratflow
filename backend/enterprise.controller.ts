import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('enterprises')
export class EnterpriseController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async findAll() {
    const [rows]: any = await this.db.query("SELECT name, display_name FROM enterprises");
    return rows;
  }

  @Post()
  async create(@Body() body: any) {
    const { name, displayName, password } = body;
    if (!name || !displayName) throw new HttpException('Missing fields', HttpStatus.BAD_REQUEST);

    try {
      // 1. 创建企业
      await this.db.query("INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)", [name, displayName, password || 'root']);
      
      // 2. 自动初始化管理员
      await this.db.query(
        "INSERT INTO users (id, ent_name, username, password, name, role) VALUES (?, ?, ?, ?, ?, ?)",
        [`admin-${Date.now()}`, name, 'admin', '888888', '系统管理员', 'Admin']
      );

      // 3. 初始化战略记录
      await this.db.query("INSERT INTO strategies (ent_name, mission, vision) VALUES (?, '', '')", [name]);

      return { message: "Enterprise and Admin created" };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpException('Exists', HttpStatus.CONFLICT);
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

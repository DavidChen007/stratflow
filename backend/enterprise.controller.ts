
import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Enterprise')
@Controller('enterprises')
export class EnterpriseController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: '获取所有注册企业列表' })
  async findAll() {
    const [rows]: any = await this.db.query("SELECT name, display_name FROM enterprises");
    return rows;
  }

  @Post()
  @ApiOperation({ summary: '创建新企业空间' })
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' }, displayName: { type: 'string' }, password: { type: 'string' } } } })
  async create(@Body() body: any) {
    const { name, displayName, password } = body;
    if (!name || !displayName) throw new HttpException('Missing fields', HttpStatus.BAD_REQUEST);

    try {
      await this.db.query("INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)", [name, displayName, password || 'root']);
      
      // 业务层面的关联初始化：仅创建必要的空记录，具体账号由用户后续配置
      await this.db.query("INSERT INTO strategies (ent_name, mission, vision, okrs_json) VALUES (?, '', '', '{}')", [name]);

      return { success: true };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpException('Enterprise ID already exists', HttpStatus.CONFLICT);
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

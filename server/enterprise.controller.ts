
import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('enterprises')
export class EnterpriseController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async findAll() {
    try {
      const [rows]: any = await this.db.query("SELECT name, display_name, password FROM enterprises");
      return rows.map((row: any) => ({
        name: row.name,
        displayName: row.display_name,
        password: row.password
      }));
    } catch (err) {
      throw new HttpException('Database error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async create(@Body() body: { name: string; displayName: string; password?: string }) {
    const { name, displayName, password } = body;
    if (!name || !displayName) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.db.query(
        "INSERT INTO enterprises (name, display_name, password) VALUES (?, ?, ?)",
        [name, displayName, password || 'root']
      );
      return { message: "Enterprise created" };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new HttpException('Enterprise ID already exists', HttpStatus.CONFLICT);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DatabaseService) {}

  @Post('login')
  async login(@Body() body: any) {
    const { entId, username, password } = body;
    
    const [rows]: any = await this.db.query(
      "SELECT * FROM users WHERE ent_name = ? AND username = ? AND password = ?",
      [entId, username, password]
    );

    if (rows.length > 0) {
      const user = rows[0];
      // 不要把密码传回前端
      delete user.password;
      return { success: true, user };
    } else {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
  }
}

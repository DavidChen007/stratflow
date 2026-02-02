import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 设置全局 API 前缀
  app.setGlobalPrefix('api');
  
  // 启用跨域支持
  app.enableCors();
  
  // 增加 JSON 载荷限制
  app.use(json({ limit: '50mb' }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`StratFlow NestJS Backend running on: http://localhost:${port}/api`);
}
bootstrap();
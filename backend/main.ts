import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 设置全局 API 前缀
  app.setGlobalPrefix('api/flow');

  // 启用跨域支持
  app.enableCors();

  // 增加 JSON 载荷限制
  app.use(json({ limit: '50mb' }));

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('StratFlow AI API')
    .setDescription('StratFlow AI 企业战略规划工具后端接口文档')
    .setVersion('1.0')
    .addTag('Auth', '身份验证接口')
    .addTag('Enterprise', '企业管理接口')
    .addTag('User', '用户与权限接口')
    .addTag('Workspace', '工作空间资产接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // 访问路径: http://localhost:3001/api/flow/docs
  SwaggerModule.setup('api/flow/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`StratFlow NestJS Backend running on: http://localhost:${port}/api/flow`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/flow/docs`);
}
bootstrap();
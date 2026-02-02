import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EnterpriseController } from './enterprise.controller';
import { WorkspaceController } from './workspace.controller';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';

@Module({
  imports: [],
  controllers: [
    EnterpriseController, 
    WorkspaceController, 
    AuthController, 
    UserController
  ],
  providers: [DatabaseService],
})
export class AppModule {}

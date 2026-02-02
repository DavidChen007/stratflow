
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EnterpriseController } from './enterprise.controller';
import { WorkspaceController } from './workspace.controller';

@Module({
  imports: [],
  controllers: [EnterpriseController, WorkspaceController],
  providers: [DatabaseService],
})
export class AppModule {}

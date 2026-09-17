import { Module } from '@nestjs/common';
import { TappersModule } from '../tappers/tappers.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [TappersModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}

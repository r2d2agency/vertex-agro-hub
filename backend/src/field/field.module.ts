import { Module } from '@nestjs/common';
import { FieldController } from './field.controller';
import { FieldService } from './field.service';
import { TappersModule } from '../tappers/tappers.module';

@Module({
  imports: [TappersModule],
  controllers: [FieldController],
  providers: [FieldService],
})
export class FieldModule {}

import { Module } from '@nestjs/common';
import { TappersController } from './tappers.controller';
import { TappersService } from './tappers.service';

@Module({
  controllers: [TappersController],
  providers: [TappersService],
})
export class TappersModule {}

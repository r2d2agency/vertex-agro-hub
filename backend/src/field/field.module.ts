import { Module } from '@nestjs/common';
import { FieldController } from './field.controller';
import { FieldService } from './field.service';
import { TappersModule } from '../tappers/tappers.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [TappersModule, CatalogModule],
  controllers: [FieldController],
  providers: [FieldService],
})
export class FieldModule {}

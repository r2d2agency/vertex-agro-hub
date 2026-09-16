import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module';
import { FarmsImportController } from './farms-import.controller';
import { FarmsImportService } from './farms-import.service';

@Module({
  imports: [PeopleModule],
  controllers: [FarmsImportController],
  providers: [FarmsImportService],
})
export class FarmsImportModule {}

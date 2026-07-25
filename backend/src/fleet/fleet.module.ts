import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { FleetOpsController } from './fleet-ops.controller';
import { FleetOpsService } from './fleet-ops.service';

@Module({
  controllers: [FleetController, FleetOpsController],
  providers: [FleetService, FleetOpsService],
})
export class FleetModule {}

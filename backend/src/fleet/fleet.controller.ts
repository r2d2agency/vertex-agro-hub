import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FleetService } from './fleet.service';
import {
  CreateImplementDto, CreateMachineDto, CreateOperatorDto,
  CreateOperationTypeDto, UpdateMachineDto,
} from './dto';

function req(companyId?: string) {
  if (!companyId) throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class FleetController {
  constructor(private readonly svc: FleetService) {}

  // Overview
  @Get('fleet/overview')
  overview(@Req() r: any, @Query('companyId') companyId?: string) {
    return this.svc.fleetOverview(r.user.sub, req(companyId));
  }

  // Machines
  @Get('machines')
  listMachines(
    @Req() r: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listMachines(r.user.sub, req(companyId), farmId, status);
  }
  @Get('machines/:id')
  getMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getMachine(r.user.sub, id);
  }
  @Post('machines')
  createMachine(@Req() r: any, @Body() dto: CreateMachineDto) {
    return this.svc.createMachine(r.user.sub, dto);
  }
  @Patch('machines/:id')
  updateMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMachineDto) {
    return this.svc.updateMachine(r.user.sub, id, dto);
  }
  @Delete('machines/:id')
  delMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteMachine(r.user.sub, id);
  }

  // Implements
  @Get('implements')
  listImpls(@Req() r: any, @Query('companyId') c?: string, @Query('farmId') f?: string) {
    return this.svc.listImplements(r.user.sub, req(c), f);
  }
  @Post('implements')
  createImpl(@Req() r: any, @Body() dto: CreateImplementDto) {
    return this.svc.createImplement(r.user.sub, dto);
  }
  @Patch('implements/:id')
  updateImpl(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateImplementDto>) {
    return this.svc.updateImplement(r.user.sub, id, dto);
  }
  @Delete('implements/:id')
  delImpl(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteImplement(r.user.sub, id);
  }

  // Operators
  @Get('operators')
  listOps(@Req() r: any, @Query('companyId') c?: string, @Query('farmId') f?: string) {
    return this.svc.listOperators(r.user.sub, req(c), f);
  }
  @Post('operators')
  createOp(@Req() r: any, @Body() dto: CreateOperatorDto) {
    return this.svc.createOperator(r.user.sub, dto);
  }
  @Patch('operators/:id')
  updateOp(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOperatorDto>) {
    return this.svc.updateOperator(r.user.sub, id, dto);
  }
  @Delete('operators/:id')
  delOp(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOperator(r.user.sub, id);
  }

  // Operation types
  @Get('operation-types')
  listOts(@Req() r: any, @Query('companyId') c?: string) {
    return this.svc.listOperationTypes(r.user.sub, req(c));
  }
  @Post('operation-types')
  createOt(@Req() r: any, @Body() dto: CreateOperationTypeDto) {
    return this.svc.createOperationType(r.user.sub, dto);
  }
  @Patch('operation-types/:id')
  updateOt(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOperationTypeDto>) {
    return this.svc.updateOperationType(r.user.sub, id, dto);
  }
  @Delete('operation-types/:id')
  delOt(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOperationType(r.user.sub, id);
  }
}

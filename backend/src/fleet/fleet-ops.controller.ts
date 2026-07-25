import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FleetOpsService } from './fleet-ops.service';
import {
  AddMaintenanceItemDto, CreateChecklistDto, CreateFuelMovementDto,
  CreateFuelTankDto, CreateInventoryItemDto, CreateInventoryMovementDto,
  CreateMaintenanceOrderDto, CreateOperationLogDto,
} from './ops-dto';

function req(v?: string) {
  if (!v) throw new BadRequestException('companyId é obrigatório');
  return v;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class FleetOpsController {
  constructor(private readonly svc: FleetOpsService) {}

  // ===== Overview =====
  @Get('fleet/ops-overview')
  overview(@Req() r: any, @Query('companyId') c?: string) {
    return this.svc.opsOverview(r.user.sub, req(c));
  }

  // ===== Fuel tanks =====
  @Get('fuel-tanks')
  listTanks(@Req() r: any, @Query('companyId') c?: string, @Query('farmId') f?: string) {
    return this.svc.listTanks(r.user.sub, req(c), f);
  }
  @Post('fuel-tanks')
  createTank(@Req() r: any, @Body() dto: CreateFuelTankDto) {
    return this.svc.createTank(r.user.sub, dto);
  }
  @Patch('fuel-tanks/:id')
  updateTank(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateFuelTankDto>) {
    return this.svc.updateTank(r.user.sub, id, dto);
  }
  @Delete('fuel-tanks/:id')
  delTank(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTank(r.user.sub, id);
  }

  // ===== Fuel movements =====
  @Get('fuel-movements')
  listFuelMv(
    @Req() r: any,
    @Query('companyId') c?: string,
    @Query('tankId') tankId?: string,
    @Query('machineId') machineId?: string,
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listFuelMovements(r.user.sub, req(c), { tankId, machineId, kind, from, to });
  }
  @Post('fuel-movements')
  createFuelMv(@Req() r: any, @Body() dto: CreateFuelMovementDto) {
    return this.svc.createFuelMovement(r.user.sub, dto);
  }
  @Delete('fuel-movements/:id')
  delFuelMv(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteFuelMovement(r.user.sub, id);
  }

  // ===== Inventory items =====
  @Get('inventory-items')
  listItems(
    @Req() r: any,
    @Query('companyId') c?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.svc.listItems(r.user.sub, req(c), { category, lowStock: lowStock === 'true' });
  }
  @Post('inventory-items')
  createItem(@Req() r: any, @Body() dto: CreateInventoryItemDto) {
    return this.svc.createItem(r.user.sub, dto);
  }
  @Patch('inventory-items/:id')
  updItem(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateInventoryItemDto>) {
    return this.svc.updateItem(r.user.sub, id, dto);
  }
  @Delete('inventory-items/:id')
  delItem(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteItem(r.user.sub, id);
  }

  // ===== Inventory movements =====
  @Get('inventory-movements')
  listInvMv(@Req() r: any, @Query('companyId') c?: string, @Query('itemId') itemId?: string) {
    return this.svc.listInventoryMovements(r.user.sub, req(c), itemId);
  }
  @Post('inventory-movements')
  createInvMv(@Req() r: any, @Body() dto: CreateInventoryMovementDto) {
    return this.svc.createInventoryMovement(r.user.sub, dto);
  }

  // ===== Maintenance orders =====
  @Get('maintenance-orders')
  listOrders(
    @Req() r: any,
    @Query('companyId') c?: string,
    @Query('status') status?: string,
    @Query('machineId') machineId?: string,
  ) {
    return this.svc.listOrders(r.user.sub, req(c), { status, machineId });
  }
  @Get('maintenance-orders/:id')
  getOrder(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getOrder(r.user.sub, id);
  }
  @Post('maintenance-orders')
  createOrder(@Req() r: any, @Body() dto: CreateMaintenanceOrderDto) {
    return this.svc.createOrder(r.user.sub, dto);
  }
  @Patch('maintenance-orders/:id')
  updOrder(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateMaintenanceOrderDto>) {
    return this.svc.updateOrder(r.user.sub, id, dto);
  }
  @Delete('maintenance-orders/:id')
  delOrder(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOrder(r.user.sub, id);
  }
  @Post('maintenance-orders/:id/items')
  addOrderItem(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddMaintenanceItemDto) {
    return this.svc.addOrderItem(r.user.sub, id, dto);
  }
  @Delete('maintenance-orders/:id/items/:itemId')
  delOrderItem(
    @Req() r: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.svc.removeOrderItem(r.user.sub, id, itemId);
  }

  // ===== Operation logs =====
  @Get('operation-logs')
  listOpLogs(
    @Req() r: any,
    @Query('companyId') c?: string,
    @Query('machineId') machineId?: string,
    @Query('operatorId') operatorId?: string,
    @Query('farmId') farmId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listOperationLogs(r.user.sub, req(c), { machineId, operatorId, farmId, from, to });
  }
  @Post('operation-logs')
  createOpLog(@Req() r: any, @Body() dto: CreateOperationLogDto) {
    return this.svc.createOperationLog(r.user.sub, dto);
  }
  @Patch('operation-logs/:id')
  updOpLog(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOperationLogDto>) {
    return this.svc.updateOperationLog(r.user.sub, id, dto);
  }
  @Delete('operation-logs/:id')
  delOpLog(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOperationLog(r.user.sub, id);
  }

  // ===== Checklists =====
  @Get('machine-checklists')
  listChks(@Req() r: any, @Query('companyId') c?: string, @Query('machineId') machineId?: string) {
    return this.svc.listChecklists(r.user.sub, req(c), machineId);
  }
  @Post('machine-checklists')
  createChk(@Req() r: any, @Body() dto: CreateChecklistDto) {
    return this.svc.createChecklist(r.user.sub, dto);
  }
  @Delete('machine-checklists/:id')
  delChk(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteChecklist(r.user.sub, id);
  }
}

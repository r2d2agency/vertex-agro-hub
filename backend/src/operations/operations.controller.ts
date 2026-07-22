import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OperationsService } from './operations.service';
import {
  CreateDeliveryDto,
  CreateTappingRecordDto,
  UpdateDeliveryDto,
  UpdateTappingRecordDto,
} from './dto';

function need(v?: string) {
  if (!v) throw new BadRequestException('companyId é obrigatório');
  return v;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class OperationsController {
  constructor(private readonly svc: OperationsService) {}

  // Tapping Records
  @Get('tapping-records')
  listTaps(
    @Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('plotId') plotId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listTappingRecords(req.user.sub, need(companyId), { farmId, plotId, from, to });
  }
  @Post('tapping-records')
  createTap(@Req() req: any, @Body() dto: CreateTappingRecordDto) {
    return this.svc.createTappingRecord(req.user.sub, dto);
  }
  @Patch('tapping-records/:id')
  updateTap(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTappingRecordDto,
  ) {
    return this.svc.updateTappingRecord(req.user.sub, id, dto);
  }
  @Delete('tapping-records/:id')
  deleteTap(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTappingRecord(req.user.sub, id);
  }

  // Production Deliveries
  @Get('deliveries')
  listDeliveries(
    @Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('season') season?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listDeliveries(req.user.sub, need(companyId), { farmId, season, from, to });
  }
  @Post('deliveries')
  createDelivery(@Req() req: any, @Body() dto: CreateDeliveryDto) {
    return this.svc.createDelivery(req.user.sub, dto);
  }
  @Patch('deliveries/:id')
  updateDelivery(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.svc.updateDelivery(req.user.sub, id, dto);
  }
  @Delete('deliveries/:id')
  deleteDelivery(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteDelivery(req.user.sub, id);
  }

  // KPIs
  @Get('kpis')
  kpis(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.kpis(req.user.sub, need(companyId));
  }
}

import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FieldService } from './field.service';
import { TappersService } from '../tappers/tappers.service';
import { CatalogService } from '../catalog/catalog.service';
import {
  CreatePhotoDto, CreateStimulationDto, UpdatePhotoDto, UpdateStimulationDto,
  CreateProductionDeliveryDto,
} from './dto';

function need(v?: string) {
  if (!v) throw new BadRequestException('companyId é obrigatório');
  return v;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class FieldController {
  constructor(private readonly svc: FieldService, private readonly tappersSvc: TappersService, private readonly catalogSvc: CatalogService) {}

  // ---------- App de campo ----------
  @Get('field/me')
  fieldMe(@Req() req: any) { return this.svc.fieldMe(req.user.sub); }

  @Get('field/tappers')
  listTappers(@Req() req: any, @Query('companyId') companyId?: string, @Query('farmId') farmId?: string) {
    return this.svc.listTappersForFarm(req.user.sub, need(companyId), need(farmId));
  }

  @Get('field/tapping-tasks')
  listTappingTasks(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.catalogSvc.listTasks(req.user.sub, need(companyId));
  }

  @Get('field/tapping-tables')
  listTappingTables(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listTappingTablesForCompany(req.user.sub, need(companyId));
  }

  // Tabelas vinculadas a um sangrador específico (com a quantidade de
  // árvores prevista pra ele em cada uma) — usado ao registrar sangria.
  @Get('field/tapper-tables')
  listTapperTables(
    @Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('tapperKey') tapperKey?: string,
  ) {
    return this.tappersSvc.listTableLinksForField(req.user.sub, need(companyId), need(tapperKey));
  }

  @Post('field/checkin')
  checkin(@Req() req: any, @Body() dto: {
    companyId: string; farmId?: string; plotId?: string;
    latitude?: number; longitude?: number; accuracyM?: number;
    taskId?: string; notes?: string; photoUrl?: string; strict?: boolean;
  }) { return this.svc.checkin(req.user.sub, dto); }

  // ---------- Estimulações ----------
  @Get('stimulations')
  listStim(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('plotId') plotId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) { return this.svc.listStimulations(req.user.sub, need(companyId), { farmId, plotId, from, to }); }
  @Post('stimulations')
  createStim(@Req() req: any, @Body() dto: CreateStimulationDto) { return this.svc.createStimulation(req.user.sub, dto); }
  @Patch('stimulations/:id')
  updateStim(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStimulationDto) {
    return this.svc.updateStimulation(req.user.sub, id, dto);
  }
  @Delete('stimulations/:id')
  deleteStim(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteStimulation(req.user.sub, id); }

  @Get('photos')
  listPhotos(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) { return this.svc.listPhotos(req.user.sub, need(companyId), { farmId, category, from, to }); }
  @Post('photos')
  createPhoto(@Req() req: any, @Body() dto: CreatePhotoDto) { return this.svc.createPhoto(req.user.sub, dto); }
  @Patch('photos/:id')
  updatePhoto(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePhotoDto) {
    return this.svc.updatePhoto(req.user.sub, id, dto);
  }
  @Delete('photos/:id')
  deletePhoto(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deletePhoto(req.user.sub, id); }

  @Get('field/history')
  history(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.history(req.user.sub, need(companyId), {
      farmId, from, to, limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('historico')
  fullHistory(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.history(req.user.sub, need(companyId), {
      farmId, from, to, limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // POST tapping-records não é registrado aqui de propósito: o mesmo path já
  // existe em OperationsController (registrado antes no app.module.ts), então
  // uma rota aqui nunca seria alcançada — ficava como código morto.

  @Post('production-deliveries')
  createProduction(@Req() req: any, @Body() dto: CreateProductionDeliveryDto) {
    return this.svc.createProduction(req.user.sub, dto);
  }
}

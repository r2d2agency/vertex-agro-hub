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
import { TerritorialService } from './territorial.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateFarmDto,
  CreatePlotDto,
  CreateRegionalDto,
  UpdateFarmDto,
  UpdatePlotDto,
  UpdateRegionalDto,
  UpdateOwnerDto,
  CreateOwnerDocumentDto,
  CreateFarmDocumentDto,
} from './dto';

function requireCompanyId(companyId?: string) {
  if (!companyId || companyId === 'undefined' || companyId === 'null') throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

// Guard de classe: apenas autenticação + acesso à empresa (checado em cada
// método do service via CompanyAccess.ensureCompany). Consultor/monitor
// precisam LER regionais/fazendas/talhões pelo app de campo — por isso
// RolesGuard (admin_empresa/gestor) só é aplicado nas mutações (criar,
// editar, excluir), não nos GETs.
@UseGuards(JwtAuthGuard)
@Controller()
export class TerritorialController {
  constructor(private readonly svc: TerritorialService) {}

  // Regionals
  @Get('regionals')
  listRegionals(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listRegionals(req.user.sub, requireCompanyId(companyId));
  }
  @UseGuards(RolesGuard)
  @Post('regionals')
  createRegional(@Req() req: any, @Body() dto: CreateRegionalDto) {
    return this.svc.createRegional(req.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('regionals/:id')
  updateRegional(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegionalDto,
  ) {
    return this.svc.updateRegional(req.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('regionals/:id')
  deleteRegional(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteRegional(req.user.sub, id);
  }

  // Farms
  @Get('farms')
  listFarms(
    @Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('regionalId') regionalId?: string,
  ) {
    return this.svc.listFarms(req.user.sub, requireCompanyId(companyId), regionalId);
  }
  @Get('farms/:id')
  getFarm(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getFarm(req.user.sub, id);
  }
  @UseGuards(RolesGuard)
  @Post('farms')
  createFarm(@Req() req: any, @Body() dto: CreateFarmDto) {
    return this.svc.createFarm(req.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('farms/:id')
  updateFarm(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFarmDto,
  ) {
    return this.svc.updateFarm(req.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('farms/:id')
  deleteFarm(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteFarm(req.user.sub, id);
  }
  @Get('farms/:id/documents')
  listFarmDocuments(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('companyId') companyId?: string) {
    return this.svc.listFarmDocuments(req.user.sub, id, requireCompanyId(companyId));
  }
  @UseGuards(RolesGuard)
  @Post('farms/:id/documents')
  createFarmDocument(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateFarmDocumentDto) {
    return this.svc.createFarmDocument(req.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('farms/:id/documents/:documentId')
  deleteFarmDocument(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.deleteFarmDocument(req.user.sub, id, documentId, requireCompanyId(companyId));
  }

  // Plots
  @Get('plots')
  listPlots(
    @Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
  ) {
    return this.svc.listPlots(req.user.sub, requireCompanyId(companyId), farmId);
  }
  @UseGuards(RolesGuard)
  @Post('plots')
  createPlot(@Req() req: any, @Body() dto: CreatePlotDto) {
    return this.svc.createPlot(req.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('plots/:id')
  updatePlot(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlotDto,
  ) {
    return this.svc.updatePlot(req.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('plots/:id')
  deletePlot(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deletePlot(req.user.sub, id);
  }

  // Proprietários e compradores (autocomplete usado pelo formulário de
  // fazenda e pela importação em massa)
  @Get('owners')
  listOwners(@Req() req: any, @Query('companyId') companyId?: string, @Query('q') q?: string) {
    return this.svc.listOwners(req.user.sub, requireCompanyId(companyId), q);
  }
  @Get('owners/:id')
  getOwner(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('companyId') companyId?: string) {
    return this.svc.getOwner(req.user.sub, id, requireCompanyId(companyId));
  }
  @UseGuards(RolesGuard)
  @Patch('owners/:id')
  updateOwner(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('companyId') companyId: string, @Body() dto: UpdateOwnerDto) {
    return this.svc.updateOwner(req.user.sub, id, requireCompanyId(companyId), dto);
  }
  @Get('owners/:id/documents')
  listOwnerDocuments(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query('companyId') companyId?: string) {
    return this.svc.listOwnerDocuments(req.user.sub, id, requireCompanyId(companyId));
  }
  @UseGuards(RolesGuard)
  @Post('owners/:id/documents')
  createOwnerDocument(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateOwnerDocumentDto) {
    return this.svc.createOwnerDocument(req.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('owners/:id/documents/:documentId')
  deleteOwnerDocument(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.deleteOwnerDocument(req.user.sub, id, documentId, requireCompanyId(companyId));
  }
  @Get('buyers')
  listBuyers(@Req() req: any, @Query('companyId') companyId?: string, @Query('q') q?: string) {
    return this.svc.listBuyers(req.user.sub, requireCompanyId(companyId), q);
  }
}

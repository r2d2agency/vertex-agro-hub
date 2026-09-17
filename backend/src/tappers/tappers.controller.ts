import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TappersService } from './tappers.service';
import {
  CreateStintDto, CreateTapperDto, CreateTapperPreRegistrationDto, CreateTapperTableLinkDto,
  EndStintDto, ReviewTapperPreRegistrationDto, UpdateTapperDto, UpdateTapperTableLinkDto, UpsertTapperDto,
  UpsertTapperRotationDto,
} from './dto';

// Guard de classe: apenas autenticação. RolesGuard (admin/gestor) é aplicado
// por rota — `lookup`, `pre-registrations` (GET e POST) também são usadas
// pelo consultor no app de campo; TappersService já restringe: criação a
// consultores da fazenda (ensureConsultorSubmission) e listagem a "só os
// meus" pra quem não é admin/gestor (listPreRegistrations).
@UseGuards(JwtAuthGuard)
@Controller('tappers')
export class TappersController {
  constructor(private readonly svc: TappersService) {}

  @UseGuards(RolesGuard)
  @Get()
  list(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string) {
    return this.svc.list(req.user.sub, companyId);
  }

  @Get('lookup')
  lookup(
    @Req() req: any,
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('cpf') cpf: string,
  ) {
    return this.svc.lookupByCpf(req.user.sub, companyId, cpf ?? '');
  }

  @UseGuards(RolesGuard)
  @Post('upsert')
  upsert(@Req() req: any, @Body() dto: UpsertTapperDto) {
    return this.svc.upsertByCpf(req.user.sub, dto);
  }

  @Get('pre-registrations')
  listPreRegistrations(
    @Req() req: any,
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.svc.listPreRegistrations(req.user.sub, companyId, { status, role });
  }

  @Post('pre-registrations')
  createPreRegistration(@Req() req: any, @Body() dto: CreateTapperPreRegistrationDto) {
    return this.svc.createPreRegistration(req.user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Patch('pre-registrations/:id')
  reviewPreRegistration(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewTapperPreRegistrationDto,
  ) {
    return this.svc.reviewPreRegistration(req.user.sub, id, dto);
  }

  // Tabelas vinculadas ao sangrador — precisa vir antes de ":id" pra não ser
  // capturado por ele (o path "table-links" não é um UUID). Sem RolesGuard
  // de rota: além de admin/gestor, um monitor ou consultor vinculado à
  // mesma fazenda do sangrador também pode gerenciar — TappersService
  // (ensureManagerOrFarmStaff) valida isso.
  @Get('table-links')
  listTableLinks(
    @Req() req: any,
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('tapperKey') tapperKey: string,
  ) {
    return this.svc.listTableLinks(req.user.sub, companyId, tapperKey);
  }

  @Post('table-links')
  createTableLink(@Req() req: any, @Body() dto: CreateTapperTableLinkDto) {
    return this.svc.createTableLink(req.user.sub, dto);
  }

  @Patch('table-links/:linkId')
  updateTableLink(
    @Req() req: any,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: UpdateTapperTableLinkDto,
  ) {
    return this.svc.updateTableLink(req.user.sub, linkId, dto);
  }

  @Delete('table-links/:linkId')
  deleteTableLink(
    @Req() req: any,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.deleteTableLink(req.user.sub, linkId, companyId);
  }

  // Rotação de tabelas do sangrador: sugestão da próxima tabela + estado do
  // ponto de partida. Mesma autorização de table-links (monitor/consultor da
  // fazenda ou admin), sem RolesGuard de rota.
  @Get('rotation')
  getRotation(
    @Req() req: any,
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('tapperKey') tapperKey: string,
  ) {
    return this.svc.getRotation(req.user.sub, companyId, tapperKey);
  }

  @Put('rotation')
  upsertRotation(@Req() req: any, @Body() dto: UpsertTapperRotationDto) {
    return this.svc.upsertRotation(req.user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Get(':id')
  get(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.get(req.user.sub, id, companyId);
  }

  @UseGuards(RolesGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateTapperDto) {
    return this.svc.create(req.user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTapperDto) {
    return this.svc.update(req.user.sub, id, dto);
  }

  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(req.user.sub, id);
  }

  @UseGuards(RolesGuard)
  @Post(':id/stints')
  addStint(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateStintDto) {
    return this.svc.addStint(req.user.sub, id, dto);
  }

  @UseGuards(RolesGuard)
  @Patch(':id/stints/:stintId/end')
  endStint(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stintId', ParseUUIDPipe) stintId: string,
    @Body() dto: EndStintDto,
  ) {
    return this.svc.endStint(req.user.sub, id, stintId, dto);
  }

  @Delete(':id/stints/:stintId')
  deleteStint(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stintId', ParseUUIDPipe) stintId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.deleteStint(req.user.sub, id, stintId, companyId);
  }
}

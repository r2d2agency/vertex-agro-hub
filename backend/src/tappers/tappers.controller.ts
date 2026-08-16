import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TappersService } from './tappers.service';
import {
  CreateStintDto, CreateTapperDto, EndStintDto, UpdateTapperDto, UpsertTapperDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tappers')
export class TappersController {
  constructor(private readonly svc: TappersService) {}

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

  @Post('upsert')
  upsert(@Req() req: any, @Body() dto: UpsertTapperDto) {
    return this.svc.upsertByCpf(req.user.sub, dto);
  }

  @Get(':id')
  get(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.get(req.user.sub, id, companyId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTapperDto) {
    return this.svc.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTapperDto) {
    return this.svc.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(req.user.sub, id);
  }

  @Post(':id/stints')
  addStint(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateStintDto) {
    return this.svc.addStint(req.user.sub, id, dto);
  }

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

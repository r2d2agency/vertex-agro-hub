import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FieldService } from './field.service';
import {
  CreatePhotoDto, CreateStimulationDto, UpdatePhotoDto, UpdateStimulationDto,
} from './dto';

function need(v?: string) {
  if (!v) throw new BadRequestException('companyId é obrigatório');
  return v;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class FieldController {
  constructor(private readonly svc: FieldService) {}

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

  @Get('history')
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
}

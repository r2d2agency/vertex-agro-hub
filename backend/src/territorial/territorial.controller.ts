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
import {
  CreateFarmDto,
  CreatePlotDto,
  CreateRegionalDto,
  UpdateFarmDto,
  UpdatePlotDto,
  UpdateRegionalDto,
} from './dto';

function requireCompanyId(companyId?: string) {
  if (!companyId) throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class TerritorialController {
  constructor(private readonly svc: TerritorialService) {}

  // Regionals
  @Get('regionals')
  listRegionals(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listRegionals(req.user.sub, requireCompanyId(companyId));
  }
  @Post('regionals')
  createRegional(@Req() req: any, @Body() dto: CreateRegionalDto) {
    return this.svc.createRegional(req.user.sub, dto);
  }
  @Patch('regionals/:id')
  updateRegional(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegionalDto,
  ) {
    return this.svc.updateRegional(req.user.sub, id, dto);
  }
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
  @Post('farms')
  createFarm(@Req() req: any, @Body() dto: CreateFarmDto) {
    return this.svc.createFarm(req.user.sub, dto);
  }
  @Patch('farms/:id')
  updateFarm(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFarmDto,
  ) {
    return this.svc.updateFarm(req.user.sub, id, dto);
  }
  @Delete('farms/:id')
  deleteFarm(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteFarm(req.user.sub, id);
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
  @Post('plots')
  createPlot(@Req() req: any, @Body() dto: CreatePlotDto) {
    return this.svc.createPlot(req.user.sub, dto);
  }
  @Patch('plots/:id')
  updatePlot(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlotDto,
  ) {
    return this.svc.updatePlot(req.user.sub, id, dto);
  }
  @Delete('plots/:id')
  deletePlot(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deletePlot(req.user.sub, id);
  }
}

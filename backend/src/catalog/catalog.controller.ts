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
import { CatalogService } from './catalog.service';
import {
  CreateCloneDto,
  CreateTappingTableDto,
  UpdateCloneDto,
  UpdateTappingTableDto,
} from './dto';

function requireCompanyId(companyId?: string) {
  if (!companyId) throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  // Clones
  @Get('clones')
  listClones(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listClones(req.user.sub, requireCompanyId(companyId));
  }
  @Post('clones')
  createClone(@Req() req: any, @Body() dto: CreateCloneDto) {
    return this.svc.createClone(req.user.sub, dto);
  }
  @Patch('clones/:id')
  updateClone(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCloneDto) {
    return this.svc.updateClone(req.user.sub, id, dto);
  }
  @Delete('clones/:id')
  deleteClone(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteClone(req.user.sub, id);
  }

  // Tapping tables
  @Get('tapping-tables')
  listTables(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listTables(req.user.sub, requireCompanyId(companyId));
  }
  @Post('tapping-tables')
  createTable(@Req() req: any, @Body() dto: CreateTappingTableDto) {
    return this.svc.createTable(req.user.sub, dto);
  }
  @Patch('tapping-tables/:id')
  updateTable(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTappingTableDto,
  ) {
    return this.svc.updateTable(req.user.sub, id, dto);
  }
  @Delete('tapping-tables/:id')
  deleteTable(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTable(req.user.sub, id);
  }
}

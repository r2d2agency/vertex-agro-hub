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
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateCloneDto,
  CreateTappingTableDto,
  UpdateCloneDto,
  UpdateTappingTableDto, CreateTappingTableTemplateDto, UpdateTappingTableTemplateDto,
  CreateTappingTaskDto, UpdateTappingTaskDto,
} from './dto';

function requireCompanyId(companyId?: string) {
  if (!companyId) throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('tapping-table-templates') listTemplates(@Req() req: any, @Query('companyId') companyId?: string) { return this.svc.listTemplates(req.user.sub, requireCompanyId(companyId)); }
  @Post('tapping-table-templates') createTemplate(@Req() req: any, @Body() dto: CreateTappingTableTemplateDto) { return this.svc.createTemplate(req.user.sub, dto); }
  @Patch('tapping-table-templates/:id') updateTemplate(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTappingTableTemplateDto) { return this.svc.updateTemplate(req.user.sub, id, dto); }
  @Delete('tapping-table-templates/:id') deleteTemplate(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteTemplate(req.user.sub, id); }

  @Get('tapping-tasks') listTasks(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.svc.listTasks(req.user.sub, requireCompanyId(companyId));
  }
  @Post('tapping-tasks') createTask(@Req() req: any, @Body() dto: CreateTappingTaskDto) {
    return this.svc.createTask(req.user.sub, dto);
  }
  @Patch('tapping-tasks/:id') updateTask(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTappingTaskDto) {
    return this.svc.updateTask(req.user.sub, id, dto);
  }
  @Delete('tapping-tasks/:id') deleteTask(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTask(req.user.sub, id);
  }
}

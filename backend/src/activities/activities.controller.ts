import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import {
  CreateOccurrenceDto, UpdateOccurrenceDto,
  CreateTaskDto, UpdateTaskDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ActivitiesController {
  constructor(private readonly svc: ActivitiesService) {}

  @Get('occurrences')
  listOcc(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('farmId') farmId?: string, @Query('status') status?: string,
    @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.listOccurrences(req.user.sub, companyId, { farmId, status, from, to });
  }
  @Post('occurrences')
  createOcc(@Req() req: any, @Body() dto: CreateOccurrenceDto) {
    return this.svc.createOccurrence(req.user.sub, dto);
  }
  @Patch('occurrences/:id')
  updateOcc(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOccurrenceDto) {
    return this.svc.updateOccurrence(req.user.sub, id, dto);
  }
  @Delete('occurrences/:id')
  deleteOcc(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOccurrence(req.user.sub, id);
  }

  @Get('scheduled-tasks')
  listTask(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string,
    @Query('farmId') farmId?: string, @Query('teamId') teamId?: string,
    @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.listTasks(req.user.sub, companyId, { farmId, teamId, status, from, to });
  }
  @Post('scheduled-tasks')
  createTask(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.svc.createTask(req.user.sub, dto);
  }
  @Patch('scheduled-tasks/:id')
  updateTask(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.svc.updateTask(req.user.sub, id, dto);
  }
  @Delete('scheduled-tasks/:id')
  deleteTask(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTask(req.user.sub, id);
  }
}

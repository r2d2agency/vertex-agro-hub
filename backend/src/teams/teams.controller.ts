import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { AddMemberDto, CreateTeamDto, UpdateTeamDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly svc: TeamsService) {}

  @Get()
  list(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string) {
    return this.svc.list(req.user.sub, companyId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.svc.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto) {
    return this.svc.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(req.user.sub, id);
  }

  @Post(':id/members')
  addMember(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(req.user.sub, id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.svc.removeMember(req.user.sub, id, userId);
  }
}

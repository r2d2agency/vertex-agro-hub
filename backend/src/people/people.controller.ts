import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PeopleService } from './people.service';
import { InvitePersonDto, UpdatePersonRoleDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('people')
export class PeopleController {
  constructor(private readonly svc: PeopleService) {}

  @Get()
  list(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string) {
    return this.svc.list(req.user.sub, companyId);
  }

  @Post('invite')
  invite(@Req() req: any, @Body() dto: InvitePersonDto) {
    return this.svc.invite(req.user.sub, dto);
  }

  @Patch(':userId/role')
  updateRole(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdatePersonRoleDto,
  ) {
    return this.svc.updateRole(req.user.sub, userId, dto);
  }

  @Delete(':userId')
  remove(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.remove(req.user.sub, userId, companyId);
  }
}

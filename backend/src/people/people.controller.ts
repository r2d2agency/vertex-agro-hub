import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PeopleService } from './people.service';
import {
  DocumentDto, EmploymentDto, InvitePersonDto, PersonalDataDto, UpdatePersonRoleDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('people')
export class PeopleController {
  constructor(private readonly svc: PeopleService) {}

  @Get()
  list(@Req() req: any, @Query('companyId', ParseUUIDPipe) companyId: string) {
    return this.svc.list(req.user.sub, companyId);
  }

  @Get(':userId')
  get(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.get(req.user.sub, targetUserId, companyId);
  }

  @Post('invite')
  invite(@Req() req: any, @Body() dto: InvitePersonDto) {
    return this.svc.invite(req.user.sub, dto);
  }

  @Patch(':userId/personal')
  updatePersonal(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: PersonalDataDto,
  ) {
    return this.svc.updatePersonal(req.user.sub, targetUserId, companyId, dto);
  }

  @Patch(':userId/employment')
  upsertEmployment(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: EmploymentDto,
  ) {
    return this.svc.upsertEmployment(req.user.sub, targetUserId, dto);
  }

  @Get(':userId/documents')
  listDocs(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.listDocuments(req.user.sub, targetUserId, companyId);
  }

  @Post(':userId/documents')
  createDoc(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: DocumentDto,
  ) {
    return this.svc.createDocument(req.user.sub, targetUserId, dto);
  }

  @Delete(':userId/documents/:docId')
  deleteDoc(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Query('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.svc.deleteDocument(req.user.sub, targetUserId, docId, companyId);
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

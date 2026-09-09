import {
  Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PeopleService } from './people.service';
import {
  CreateAssignmentDto, CreateEvaluationDto, DocumentDto, EmploymentDto,
  EndAssignmentDto, InvitePersonDto, PersonalDataDto, ToggleActiveDto, UpdatePersonRoleDto, UpsertPersonAccessDto,
} from './dto';

// Guard de classe: apenas autenticação. RolesGuard (admin/gestor) é aplicado
// por rota — algumas (equipe da fazenda, vínculos e avaliações de
// monitor/sangrador) também são acessíveis a um consultor, restrito às
// fazendas onde ele atua (ver PeopleService.ensureManagerOrFarmConsultor /
// ensureManagerOrCanEvaluate).
@UseGuards(JwtAuthGuard)
@Controller('people')
export class PeopleController {
  constructor(private readonly svc: PeopleService) {}

  @UseGuards(RolesGuard)
  @Get()
  list(@Req() req: any, @Query('companyId') companyId: string) {
    return this.svc.list(req.user.sub, companyId);
  }

  @UseGuards(RolesGuard)
  @Get('assignments')
  listCompanyAssignments(
    @Req() req: any,
    @Query('companyId') companyId: string,
    @Query('role') role?: string,
    @Query('userId') targetUserId?: string,
    @Query('farmId') farmId?: string,
    @Query('consultorUserId') consultorUserId?: string,
    @Query('history') history?: string,
  ) {
    return this.svc.listCompanyAssignments(req.user.sub, companyId, {
      role: role as any,
      userId: targetUserId,
      farmId,
      consultorUserId,
      includeHistory: history === 'true',
    });
  }

  @Get('farm/:farmId/team')
  farmTeam(
    @Req() req: any,
    @Param('farmId', ParseUUIDPipe) farmId: string,
    @Query('companyId') companyId: string,
    @Query('history') history?: string,
  ) {
    return this.svc.listFarmTeam(req.user.sub, farmId, companyId, history === 'true');
  }

  @UseGuards(RolesGuard)
  @Get(':userId')
  get(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.get(req.user.sub, targetUserId, companyId);
  }

  @UseGuards(RolesGuard)
  @Post('invite')
  invite(@Req() req: any, @Body() dto: InvitePersonDto) {
    return this.svc.invite(req.user.sub, dto);
  }

  @UseGuards(RolesGuard)
  @Patch(':userId/access')
  upsertAccess(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpsertPersonAccessDto,
  ) {
    return this.svc.upsertAccess(req.user.sub, targetUserId, dto);
  }

  @UseGuards(RolesGuard)
  @Post(':userId/reset-password')
  resetPassword(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.resetPassword(req.user.sub, targetUserId, companyId);
  }


  @UseGuards(RolesGuard)
  @Patch(':userId/personal')
  updatePersonal(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
    @Body() dto: PersonalDataDto,
  ) {
    return this.svc.updatePersonal(req.user.sub, targetUserId, companyId, dto);
  }

  @UseGuards(RolesGuard)
  @Patch(':userId/employment')
  upsertEmployment(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: EmploymentDto,
  ) {
    return this.svc.upsertEmployment(req.user.sub, targetUserId, dto);
  }

  @UseGuards(RolesGuard)
  @Patch(':userId/active')
  setActive(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.svc.setActive(req.user.sub, targetUserId, companyId, dto);
  }

  @UseGuards(RolesGuard)
  @Get(':userId/documents')
  listDocs(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.listDocuments(req.user.sub, targetUserId, companyId);
  }

  @UseGuards(RolesGuard)
  @Post(':userId/documents')
  createDoc(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: DocumentDto,
  ) {
    return this.svc.createDocument(req.user.sub, targetUserId, dto);
  }

  @UseGuards(RolesGuard)
  @Delete(':userId/documents/:docId')
  deleteDoc(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.deleteDocument(req.user.sub, targetUserId, docId, companyId);
  }

  // ===== Vínculos =====
  @UseGuards(RolesGuard)
  @Get(':userId/assignments')
  listAssignments(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.listAssignments(req.user.sub, targetUserId, companyId);
  }

  @Post(':userId/assignments')
  createAssignment(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.svc.createAssignment(req.user.sub, targetUserId, dto);
  }

  @Patch(':userId/assignments/:assignmentId/end')
  endAssignment(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: EndAssignmentDto,
  ) {
    return this.svc.endAssignment(req.user.sub, targetUserId, assignmentId, dto);
  }

  @Delete(':userId/assignments/:assignmentId')
  deleteAssignment(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.deleteAssignment(req.user.sub, targetUserId, assignmentId, companyId);
  }

  // ===== Avaliações =====
  @Get(':userId/evaluations')
  listEval(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.listEvaluations(req.user.sub, targetUserId, companyId);
  }

  @Post(':userId/evaluations')
  createEval(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.svc.createEvaluation(req.user.sub, targetUserId, dto);
  }

  @UseGuards(RolesGuard)
  @Delete(':userId/evaluations/:evaluationId')
  deleteEval(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.deleteEvaluation(req.user.sub, targetUserId, evaluationId, companyId);
  }

  @UseGuards(RolesGuard)
  @Patch(':userId/role')
  updateRole(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdatePersonRoleDto,
  ) {
    return this.svc.updateRole(req.user.sub, userId, dto);
  }

  @UseGuards(RolesGuard)
  @Delete(':userId')
  remove(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.svc.remove(req.user.sub, userId, companyId);
  }
}

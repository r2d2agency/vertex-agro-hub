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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ConsultationsService } from "./consultations.service";
import { CreateConsultationDto, JustifyMissedVisitDto, UpdateConsultationDto } from "./dto";

function need(v?: string) {
  if (!v) throw new BadRequestException("companyId é obrigatório");
  return v;
}

// Só JwtAuthGuard: consultores (sem papel administrativo) lançam visitas
// diretamente pelo app de campo, escopados por CompanyAccess.ensureCompany.
@UseGuards(JwtAuthGuard)
@Controller("consultations")
export class ConsultationsController {
  constructor(private readonly svc: ConsultationsService) {}

  @Get()
  list(
    @Req() req: any,
    @Query("companyId") companyId?: string,
    @Query("farmId") farmId?: string,
    @Query("consultantId") consultantId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.list(req.user.sub, need(companyId), { farmId, consultantId, from, to });
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateConsultationDto) {
    return this.svc.create(req.user.sub, dto);
  }

  // Status de visita obrigatória por fazenda: para um consultor, retorna
  // apenas as fazendas onde ele atua; para admin/gestor, todas as fazendas
  // com consultor vinculado na empresa.
  @Get("visit-status")
  visitStatus(@Req() req: any, @Query("companyId") companyId?: string) {
    return this.svc.getVisitStatus(req.user.sub, need(companyId));
  }

  @Post("justify-visit")
  justifyVisit(@Req() req: any, @Body() dto: JustifyMissedVisitDto) {
    return this.svc.justifyMissedVisit(req.user.sub, dto);
  }

  @Get("dashboard")
  dashboard(@Req() req: any, @Query("companyId") companyId?: string) {
    return this.svc.getDashboard(req.user.sub, need(companyId));
  }

  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.svc.update(req.user.sub, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.svc.remove(req.user.sub, id);
  }
}

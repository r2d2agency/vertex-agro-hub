import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FleetService } from './fleet.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateImplementDto, CreateMachineDto, CreateOperatorDto,
  CreateOperationTypeDto, UpdateMachineDto,
} from './dto';
import { PrismaService } from '../prisma/prisma.service';

function req(companyId?: string) {
  if (!companyId) throw new BadRequestException('companyId é obrigatório');
  return companyId;
}

// Guard de classe: apenas autenticação. RolesGuard (admin/gestor) é aplicado
// só nas rotas de escrita — as leituras (listagens de máquina/implemento/
// operador/tipo de operação) alimentam telas do app de campo usadas por
// monitor/consultor e ficam protegidas por CompanyAccess.ensureCompany() em
// cada método do service, não por papel.
@UseGuards(JwtAuthGuard)
@Controller()
export class FleetController {
  constructor(
    private readonly svc: FleetService,
    private readonly prisma: PrismaService,
  ) {}

  // Overview
  @Get('fleet/overview')
  overview(@Req() r: any, @Query('companyId') companyId?: string) {
    return this.svc.fleetOverview(r.user.sub, req(companyId));
  }

  // Machines
  @Get('machines')
  listMachines(
    @Req() r: any,
    @Query('companyId') companyId?: string,
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listMachines(r.user.sub, req(companyId), farmId, status);
  }
  @Get('machines/:id')
  getMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getMachine(r.user.sub, id);
  }
  @UseGuards(RolesGuard)
  @Post('machines')
  createMachine(@Req() r: any, @Body() dto: CreateMachineDto) {
    return this.svc.createMachine(r.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('machines/:id')
  updateMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMachineDto) {
    return this.svc.updateMachine(r.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('machines/:id')
  delMachine(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteMachine(r.user.sub, id);
  }

  // Implements
  @Get('implements')
  listImpls(@Req() r: any, @Query('companyId') c?: string, @Query('farmId') f?: string) {
    return this.svc.listImplements(r.user.sub, req(c), f);
  }
  @UseGuards(RolesGuard)
  @Post('implements')
  createImpl(@Req() r: any, @Body() dto: CreateImplementDto) {
    return this.svc.createImplement(r.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('implements/:id')
  async updateImpl(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateImplementDto>) {
    // #region debug-point C:controller-update-implement
    const userId: string | undefined = r?.user?.sub;
    const dtoMeta = Object.fromEntries(
      Object.entries(dto ?? {}).map(([k, v]) => [
        k,
        { type: typeof v, value: v, isArray: Array.isArray(v) },
      ]),
    );
    try {
      void this.prisma.systemLog.create({
        data: {
          level: 'debug',
          source: 'fleet.controller.updateImpl',
          message: `[DBG implement-patch-500-persist] CONTROLLER-ENTER id=${id}`,
          meta: { id, userId, dtoKeys: Object.keys(dto ?? {}), dtoMeta } as any,
        },
      }).catch(() => {});
    } catch {}
    try {
      const result = await this.svc.updateImplement(userId as string, id, dto);
      try {
        void this.prisma.systemLog.create({
          data: {
            level: 'debug',
            source: 'fleet.controller.updateImpl',
            message: `[DBG implement-patch-500-persist] CONTROLLER-EXIT-OK id=${id} version=${(result as any)?.version ?? 'n/a'}`,
            meta: { id, userId } as any,
          },
        }).catch(() => {});
      } catch {}
      return result;
    } catch (error: any) {
      try {
        void this.prisma.systemLog.create({
          data: {
            level: 'error',
            source: 'fleet.controller.updateImpl',
            message: `[DBG implement-patch-500-persist] CONTROLLER-EXIT-ERR id=${id} name=${error?.name ?? 'unknown'} status=${error?.status ?? 'n/a'}`,
            meta: {
              id,
              userId,
              dtoKeys: Object.keys(dto ?? {}),
              dtoMeta,
              error: {
                name: error?.name ?? null,
                code: error?.code ?? null,
                status: error?.status ?? null,
                message: error?.message ?? null,
                response: error?.response ?? null,
                stack: typeof error?.stack === 'string' ? error.stack.slice(0, 3000) : null,
                meta: error?.meta ?? null,
                cause: typeof error?.cause === 'string' ? error.cause : (error?.cause?.message ?? error?.cause ?? null),
              },
            } as any,
          },
        }).catch(() => {});
      } catch {}
      throw error;
    }
    // #endregion
  }
  @UseGuards(RolesGuard)
  @Delete('implements/:id')
  delImpl(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteImplement(r.user.sub, id);
  }

  // Operators
  @Get('operators')
  listOps(@Req() r: any, @Query('companyId') c?: string, @Query('farmId') f?: string) {
    return this.svc.listOperators(r.user.sub, req(c), f);
  }
  @UseGuards(RolesGuard)
  @Post('operators')
  createOp(@Req() r: any, @Body() dto: CreateOperatorDto) {
    return this.svc.createOperator(r.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('operators/:id')
  updateOp(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOperatorDto>) {
    return this.svc.updateOperator(r.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('operators/:id')
  delOp(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOperator(r.user.sub, id);
  }

  // Operation types
  @Get('operation-types')
  listOts(@Req() r: any, @Query('companyId') c?: string) {
    return this.svc.listOperationTypes(r.user.sub, req(c));
  }
  @UseGuards(RolesGuard)
  @Post('operation-types')
  createOt(@Req() r: any, @Body() dto: CreateOperationTypeDto) {
    return this.svc.createOperationType(r.user.sub, dto);
  }
  @UseGuards(RolesGuard)
  @Patch('operation-types/:id')
  updateOt(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOperationTypeDto>) {
    return this.svc.updateOperationType(r.user.sub, id, dto);
  }
  @UseGuards(RolesGuard)
  @Delete('operation-types/:id')
  delOt(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteOperationType(r.user.sub, id);
  }
}

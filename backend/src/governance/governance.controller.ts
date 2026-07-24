import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { LogsService } from './logs.service';
import { SyncService } from './sync.service';
import { AlertsService } from './alerts.service';
import { IntegrationsService } from './integrations.service';
import { SettingsService } from './settings.service';

function need(v?: string) {
  if (!v) throw new BadRequestException('companyId é obrigatório');
  return v;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class GovernanceController {
  constructor(
    private readonly audit: AuditService,
    private readonly logs: LogsService,
    private readonly sync: SyncService,
    private readonly alerts: AlertsService,
    private readonly integrations: IntegrationsService,
    private readonly settings: SettingsService,
  ) {}

  // Audit
  @Get('audit')
  listAudit(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') uid?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list(req.user.sub, need(companyId), { entity, action, userId: uid, from, to, limit: limit ? +limit : undefined });
  }

  // Logs
  @Get('logs')
  listLogs(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('level') level?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.logs.list(req.user.sub, need(companyId), { level, source, q, from, to, limit: limit ? +limit : undefined });
  }

  // Sync
  @Get('sync/pull')
  pull(@Req() req: any,
    @Query('companyId') companyId?: string,
    @Query('since') since?: string,
    @Query('entities') entities?: string,
  ) { return this.sync.pull(req.user.sub, need(companyId), since, entities); }

  @Post('sync/push')
  push(@Req() req: any, @Body() body: { companyId: string; deviceId: string; batch: any[] }) {
    return this.sync.push(req.user.sub, need(body?.companyId), body?.deviceId, body?.batch || []);
  }

  @Get('sync/sessions')
  sessions(@Req() req: any, @Query('companyId') companyId?: string, @Query('deviceId') deviceId?: string, @Query('limit') limit?: string) {
    return this.sync.sessions(req.user.sub, need(companyId), { deviceId, limit: limit ? +limit : undefined });
  }
  @Get('sync/health')
  health(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.sync.health(req.user.sub, need(companyId));
  }

  // Alerts
  @Get('alerts/rules')
  listRules(@Req() req: any, @Query('companyId') companyId?: string) {
    return this.alerts.listRules(req.user.sub, need(companyId));
  }
  @Post('alerts/rules')
  createRule(@Req() req: any, @Body() dto: any) { return this.alerts.createRule(req.user.sub, dto); }
  @Patch('alerts/rules/:id')
  updateRule(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.alerts.updateRule(req.user.sub, id, dto); }
  @Delete('alerts/rules/:id')
  deleteRule(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.alerts.deleteRule(req.user.sub, id); }
  @Get('alerts/events')
  listEvents(@Req() req: any, @Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    return this.alerts.listEvents(req.user.sub, need(companyId), { limit: limit ? +limit : undefined });
  }
  @Post('alerts/evaluate')
  evaluate(@Req() req: any, @Body() body: { companyId: string }) {
    return this.alerts.evaluate(req.user.sub, need(body?.companyId));
  }

  // Integrations
  @Get('integrations')
  listInt(@Req() req: any, @Query('companyId') companyId?: string) { return this.integrations.list(req.user.sub, need(companyId)); }
  @Post('integrations')
  createInt(@Req() req: any, @Body() dto: any) { return this.integrations.create(req.user.sub, dto); }
  @Patch('integrations/:id')
  updateInt(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: any) { return this.integrations.update(req.user.sub, id, dto); }
  @Delete('integrations/:id')
  deleteInt(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.integrations.remove(req.user.sub, id); }
  @Get('integrations/:id/deliveries')
  intDeliveries(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.integrations.deliveries(req.user.sub, id); }
  @Post('integrations/:id/test')
  intTest(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.integrations.test(req.user.sub, id); }

  // Settings
  @Get('settings')
  getSettings(@Req() req: any, @Query('companyId') companyId?: string) { return this.settings.get(req.user.sub, need(companyId)); }
  @Patch('settings')
  updateSettings(@Req() req: any, @Query('companyId') companyId?: string, @Body() dto?: any) {
    return this.settings.update(req.user.sub, need(companyId), dto ?? {});
  }
}

import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { AuditService } from './audit.service';
import { LogsService } from './logs.service';
import { SyncService } from './sync.service';
import { AlertsService } from './alerts.service';
import { IntegrationsService } from './integrations.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [GovernanceController],
  providers: [AuditService, LogsService, SyncService, AlertsService, IntegrationsService, SettingsService],
  exports: [AuditService, LogsService],
})
export class GovernanceModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { TerritorialModule } from './territorial/territorial.module';
import { CatalogModule } from './catalog/catalog.module';
import { OperationsModule } from './operations/operations.module';
import { PeopleModule } from './people/people.module';
import { TeamsModule } from './teams/teams.module';
import { ActivitiesModule } from './activities/activities.module';
import { FieldModule } from './field/field.module';
import { UploadsModule } from './uploads/uploads.module';
import { GovernanceModule } from './governance/governance.module';
import { AiModule } from './ai/ai.module';
import { FleetModule } from './fleet/fleet.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    CompaniesModule,
    TerritorialModule,
    CatalogModule,
    OperationsModule,
    PeopleModule,
    TeamsModule,
    ActivitiesModule,
    FieldModule,
    UploadsModule,
    GovernanceModule,
    AiModule,
    FleetModule,
  ],

  controllers: [HealthController],
})
export class AppModule {}

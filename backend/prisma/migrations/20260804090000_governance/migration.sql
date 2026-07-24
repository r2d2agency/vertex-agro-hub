-- Sprint 5: Governança & Sincronização

CREATE TABLE "audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "user_id" UUID,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "diff" JSONB,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_log_company_created_idx" ON "audit_log"("company_id","created_at" DESC);
CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity","entity_id");

CREATE TABLE "system_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "level" TEXT NOT NULL DEFAULT 'info',
  "source" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_log_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL
);
CREATE INDEX "system_log_company_created_idx" ON "system_log"("company_id","created_at" DESC);
CREATE INDEX "system_log_level_created_idx" ON "system_log"("level","created_at" DESC);

CREATE TABLE "sync_session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "user_id" UUID,
  "device_id" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "pulled" INTEGER NOT NULL DEFAULT 0,
  "pushed" INTEGER NOT NULL DEFAULT 0,
  "conflicts" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  CONSTRAINT "sync_session_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "sync_session_company_started_idx" ON "sync_session"("company_id","started_at" DESC);
CREATE INDEX "sync_session_device_idx" ON "sync_session"("device_id");

CREATE TABLE "alert_rule" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "threshold" JSONB,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_rule_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "alert_rule_company_active_idx" ON "alert_rule"("company_id","active");

CREATE TABLE "alert_event" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_id" UUID,
  "company_id" UUID NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "message" TEXT,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_event_rule_fk" FOREIGN KEY ("rule_id") REFERENCES "alert_rule"("id") ON DELETE SET NULL,
  CONSTRAINT "alert_event_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "alert_event_company_created_idx" ON "alert_event"("company_id","created_at" DESC);

CREATE TABLE "integration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "config" JSONB,
  "secret" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "integration_company_active_idx" ON "integration"("company_id","active");

CREATE TABLE "webhook_delivery" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "integration_id" UUID NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "status_code" INTEGER,
  "response_body" TEXT,
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_delivery_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "integration"("id") ON DELETE CASCADE
);
CREATE INDEX "webhook_delivery_integration_attempted_idx" ON "webhook_delivery"("integration_id","attempted_at" DESC);

CREATE TABLE "company_settings" (
  "company_id" UUID PRIMARY KEY,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "unit_weight" TEXT NOT NULL DEFAULT 'kg',
  "unit_volume" TEXT NOT NULL DEFAULT 'L',
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "photo_retention_days" INTEGER NOT NULL DEFAULT 365,
  "extra" JSONB,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_settings_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

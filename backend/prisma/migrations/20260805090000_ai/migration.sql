-- Sprint 6: Inteligência Artificial

CREATE TABLE "ai_insight" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "kind" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "details" JSONB,
  "period_from" TIMESTAMP(3),
  "period_to" TIMESTAMP(3),
  "model" TEXT,
  "acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_insight_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "ai_insight_company_created_idx" ON "ai_insight"("company_id","created_at" DESC);
CREATE INDEX "ai_insight_severity_idx" ON "ai_insight"("company_id","severity");

CREATE TABLE "ai_forecast" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "horizon_days" INTEGER NOT NULL,
  "predicted_dry_kg" DOUBLE PRECISION NOT NULL,
  "baseline_dry_kg" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION,
  "method" TEXT NOT NULL DEFAULT 'trend',
  "series" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_forecast_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "ai_forecast_company_idx" ON "ai_forecast"("company_id","created_at" DESC);

CREATE TABLE "action_plan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "insight_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'media',
  "status" TEXT NOT NULL DEFAULT 'aberto',
  "due_date" TIMESTAMP(3),
  "assignee" TEXT,
  "steps" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_plan_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "action_plan_insight_fk" FOREIGN KEY ("insight_id") REFERENCES "ai_insight"("id") ON DELETE SET NULL
);
CREATE INDEX "action_plan_company_status_idx" ON "action_plan"("company_id","status");

ALTER TABLE "photos" ADD COLUMN "ai_tags" JSONB;
ALTER TABLE "photos" ADD COLUMN "ai_summary" TEXT;
ALTER TABLE "photos" ADD COLUMN "ai_analyzed_at" TIMESTAMP(3);

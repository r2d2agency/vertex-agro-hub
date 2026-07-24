-- Sprint 7.1: Frota — Máquinas, Implementos, Operadores, Operações

CREATE TABLE "machines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "regional_id" UUID,
  "farm_id" UUID,
  "code" TEXT,
  "patrimony" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'trator',
  "brand" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "serial" TEXT,
  "plate" TEXT,
  "tank_capacity" DOUBLE PRECISION,
  "fuel_type" TEXT,
  "hourmeter" DOUBLE PRECISION,
  "hourmeter_unit" TEXT DEFAULT 'h',
  "default_operator_id" UUID,
  "monitor_user_id" UUID,
  "acquisition_date" DATE,
  "supplier" TEXT,
  "photo_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'disponivel',
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "machines_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "machines_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL,
  CONSTRAINT "machines_regional_fk" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL,
  CONSTRAINT "machines_monitor_fk" FOREIGN KEY ("monitor_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "machines_company_idx" ON "machines"("company_id","is_deleted");
CREATE INDEX "machines_farm_idx" ON "machines"("farm_id");
CREATE INDEX "machines_status_idx" ON "machines"("company_id","status");

CREATE TABLE "implements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "machine_id" UUID,
  "code" TEXT,
  "patrimony" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'outro',
  "brand" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "serial" TEXT,
  "responsible_user_id" UUID,
  "photo_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'disponivel',
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "implements_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "implements_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL,
  CONSTRAINT "implements_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL
);
CREATE INDEX "implements_company_idx" ON "implements"("company_id","is_deleted");
CREATE INDEX "implements_farm_idx" ON "implements"("farm_id");

CREATE TABLE "operators" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "name" TEXT NOT NULL,
  "cpf" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "monitor_user_id" UUID,
  "cnh_category" TEXT,
  "cnh_expires_at" DATE,
  "admission_date" DATE,
  "photo_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "authorized_categories" JSONB,
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operators_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "operators_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL
);
CREATE INDEX "operators_company_idx" ON "operators"("company_id","is_deleted");
CREATE INDEX "operators_farm_idx" ON "operators"("farm_id");

-- FK do operator padrão da máquina (adicionado após criar tabela operators)
ALTER TABLE "machines"
  ADD CONSTRAINT "machines_default_operator_fk"
  FOREIGN KEY ("default_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL;

CREATE TABLE "operation_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "unit" TEXT,
  "requires_hourmeter" BOOLEAN NOT NULL DEFAULT true,
  "requires_operator" BOOLEAN NOT NULL DEFAULT true,
  "requires_photo" BOOLEAN NOT NULL DEFAULT false,
  "requires_location" BOOLEAN NOT NULL DEFAULT true,
  "consumes_fuel" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operation_types_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "operation_types_company_idx" ON "operation_types"("company_id","is_deleted");

CREATE TABLE "machine_operators" (
  "machine_id" UUID NOT NULL,
  "operator_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("machine_id","operator_id"),
  CONSTRAINT "machine_operators_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE,
  CONSTRAINT "machine_operators_operator_fk" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE
);

CREATE TABLE "monitor_machine_access" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monitor_machine_access_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "monitor_machine_access_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE,
  CONSTRAINT "monitor_machine_access_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "monitor_machine_access_uniq" UNIQUE ("user_id","machine_id")
);
CREATE INDEX "monitor_machine_access_user_idx" ON "monitor_machine_access"("user_id");
CREATE INDEX "monitor_machine_access_machine_idx" ON "monitor_machine_access"("machine_id");

CREATE TABLE "monitor_temp_farm_access" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "start_at" DATE NOT NULL,
  "end_at" DATE,
  "reason" TEXT,
  "authorized_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monitor_temp_farm_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "monitor_temp_farm_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE,
  CONSTRAINT "monitor_temp_farm_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX "monitor_temp_farm_user_idx" ON "monitor_temp_farm_access"("user_id");
CREATE INDEX "monitor_temp_farm_farm_idx" ON "monitor_temp_farm_access"("farm_id");

CREATE TABLE "machine_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "machine_id" UUID NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'document',
  "name" TEXT NOT NULL,
  "file_url" TEXT,
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "machine_documents_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE
);
CREATE INDEX "machine_documents_machine_idx" ON "machine_documents"("machine_id");

CREATE TABLE "machine_status_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "machine_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "from_value" TEXT,
  "to_value" TEXT,
  "notes" TEXT,
  "by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "machine_status_logs_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE
);
CREATE INDEX "machine_status_logs_machine_idx" ON "machine_status_logs"("machine_id","created_at" DESC);

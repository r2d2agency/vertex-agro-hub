-- Sprint 7.2: Frota Operacional
-- Abastecimento, estoque diesel, estoque de produtos, manutenção, apontamento, checklists

-- ============================================================
-- FUEL TANKS (tanques de diesel/combustível)
-- ============================================================
CREATE TABLE "fuel_tanks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "name" TEXT NOT NULL,
  "fuel_type" TEXT NOT NULL DEFAULT 'Diesel S10',
  "capacity" DOUBLE PRECISION,
  "current_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "min_level" DOUBLE PRECISION,
  "location" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
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
  CONSTRAINT "fuel_tanks_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "fuel_tanks_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL
);
CREATE INDEX "fuel_tanks_company_idx" ON "fuel_tanks"("company_id","is_deleted");
CREATE INDEX "fuel_tanks_farm_idx" ON "fuel_tanks"("farm_id");

-- ============================================================
-- FUEL MOVEMENTS (movimentações do tanque: entrada/saída/ajuste)
-- Kind: 'entrada' (compra), 'saida' (abastecimento), 'ajuste'
-- ============================================================
CREATE TABLE "fuel_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "tank_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liters" DOUBLE PRECISION NOT NULL,
  "unit_cost" DOUBLE PRECISION,
  "total_cost" DOUBLE PRECISION,
  "supplier" TEXT,
  "invoice_number" TEXT,
  "machine_id" UUID,
  "operator_id" UUID,
  "operation_log_id" UUID,
  "hourmeter" DOUBLE PRECISION,
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
  CONSTRAINT "fuel_movements_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "fuel_movements_tank_fk" FOREIGN KEY ("tank_id") REFERENCES "fuel_tanks"("id") ON DELETE CASCADE,
  CONSTRAINT "fuel_movements_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL,
  CONSTRAINT "fuel_movements_operator_fk" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL
);
CREATE INDEX "fuel_movements_company_idx" ON "fuel_movements"("company_id","occurred_at" DESC);
CREATE INDEX "fuel_movements_tank_idx" ON "fuel_movements"("tank_id","occurred_at" DESC);
CREATE INDEX "fuel_movements_machine_idx" ON "fuel_movements"("machine_id","occurred_at" DESC);

-- ============================================================
-- INVENTORY ITEMS (estoque de produtos/peças/insumos)
-- ============================================================
CREATE TABLE "inventory_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'peca',
  "unit" TEXT NOT NULL DEFAULT 'un',
  "current_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "min_stock" DOUBLE PRECISION,
  "unit_cost" DOUBLE PRECISION,
  "supplier" TEXT,
  "location" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
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
  CONSTRAINT "inventory_items_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_items_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL
);
CREATE INDEX "inventory_items_company_idx" ON "inventory_items"("company_id","is_deleted");
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("company_id","category");

-- ============================================================
-- INVENTORY MOVEMENTS
-- Kind: 'entrada' (compra), 'saida' (consumo), 'ajuste'
-- ============================================================
CREATE TABLE "inventory_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit_cost" DOUBLE PRECISION,
  "total_cost" DOUBLE PRECISION,
  "reason" TEXT,
  "machine_id" UUID,
  "maintenance_order_id" UUID,
  "supplier" TEXT,
  "invoice_number" TEXT,
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
  CONSTRAINT "inv_mov_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "inv_mov_item_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE,
  CONSTRAINT "inv_mov_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL
);
CREATE INDEX "inv_mov_company_idx" ON "inventory_movements"("company_id","occurred_at" DESC);
CREATE INDEX "inv_mov_item_idx" ON "inventory_movements"("item_id","occurred_at" DESC);

-- ============================================================
-- MAINTENANCE ORDERS (Ordens de Serviço)
-- Status: 'aberta','em_andamento','concluida','cancelada'
-- Kind: 'preventiva','corretiva','preditiva','revisao'
-- ============================================================
CREATE TABLE "maintenance_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "machine_id" UUID,
  "implement_id" UUID,
  "code" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'corretiva',
  "status" TEXT NOT NULL DEFAULT 'aberta',
  "priority" TEXT NOT NULL DEFAULT 'media',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduled_for" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "hourmeter_at_open" DOUBLE PRECISION,
  "hourmeter_at_close" DOUBLE PRECISION,
  "reported_by" UUID,
  "assigned_to" UUID,
  "supplier" TEXT,
  "description" TEXT NOT NULL,
  "diagnosis" TEXT,
  "solution" TEXT,
  "labor_cost" DOUBLE PRECISION,
  "parts_cost" DOUBLE PRECISION,
  "total_cost" DOUBLE PRECISION,
  "photo_url" TEXT,
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
  CONSTRAINT "mo_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "mo_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL,
  CONSTRAINT "mo_implement_fk" FOREIGN KEY ("implement_id") REFERENCES "implements"("id") ON DELETE SET NULL
);
CREATE INDEX "mo_company_idx" ON "maintenance_orders"("company_id","status","opened_at" DESC);
CREATE INDEX "mo_machine_idx" ON "maintenance_orders"("machine_id","opened_at" DESC);

-- ============================================================
-- MAINTENANCE ORDER ITEMS (peças/serviços em uma OS)
-- ============================================================
CREATE TABLE "maintenance_order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "inventory_item_id" UUID,
  "kind" TEXT NOT NULL DEFAULT 'peca',
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unit_cost" DOUBLE PRECISION,
  "total_cost" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moi_order_fk" FOREIGN KEY ("order_id") REFERENCES "maintenance_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "moi_item_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL
);
CREATE INDEX "moi_order_idx" ON "maintenance_order_items"("order_id");

-- ============================================================
-- OPERATION LOGS (apontamento de operação executada)
-- ============================================================
CREATE TABLE "operation_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "machine_id" UUID NOT NULL,
  "implement_id" UUID,
  "operator_id" UUID,
  "operation_type_id" UUID,
  "started_at" TIMESTAMP(3) NOT NULL,
  "finished_at" TIMESTAMP(3),
  "hourmeter_start" DOUBLE PRECISION,
  "hourmeter_end" DOUBLE PRECISION,
  "duration_hours" DOUBLE PRECISION,
  "fuel_consumed" DOUBLE PRECISION,
  "area_worked" DOUBLE PRECISION,
  "distance_km" DOUBLE PRECISION,
  "notes" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "photo_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'concluida',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "op_log_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "op_log_farm_fk" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL,
  CONSTRAINT "op_log_plot_fk" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE SET NULL,
  CONSTRAINT "op_log_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE,
  CONSTRAINT "op_log_implement_fk" FOREIGN KEY ("implement_id") REFERENCES "implements"("id") ON DELETE SET NULL,
  CONSTRAINT "op_log_operator_fk" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL,
  CONSTRAINT "op_log_type_fk" FOREIGN KEY ("operation_type_id") REFERENCES "operation_types"("id") ON DELETE SET NULL
);
CREATE INDEX "op_log_company_idx" ON "operation_logs"("company_id","started_at" DESC);
CREATE INDEX "op_log_machine_idx" ON "operation_logs"("machine_id","started_at" DESC);
CREATE INDEX "op_log_farm_idx" ON "operation_logs"("farm_id","started_at" DESC);

-- ============================================================
-- MACHINE CHECKLISTS (checklist pré/pós operação/manutenção)
-- Items armazenados como JSON: [{ label, status:'ok'|'nok'|'na', notes }]
-- ============================================================
CREATE TABLE "machine_checklists" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "operator_id" UUID,
  "operation_log_id" UUID,
  "kind" TEXT NOT NULL DEFAULT 'pre_operacao',
  "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hourmeter" DOUBLE PRECISION,
  "overall_status" TEXT NOT NULL DEFAULT 'ok',
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notes" TEXT,
  "photo_url" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" TEXT NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "chk_machine_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE,
  CONSTRAINT "chk_operator_fk" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL,
  CONSTRAINT "chk_op_log_fk" FOREIGN KEY ("operation_log_id") REFERENCES "operation_logs"("id") ON DELETE SET NULL
);
CREATE INDEX "chk_company_idx" ON "machine_checklists"("company_id","performed_at" DESC);
CREATE INDEX "chk_machine_idx" ON "machine_checklists"("machine_id","performed_at" DESC);

-- FK circular: inv_mov -> maintenance_order (adiciona depois)
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inv_mov_maint_fk"
  FOREIGN KEY ("maintenance_order_id") REFERENCES "maintenance_orders"("id") ON DELETE SET NULL;

-- FK circular: fuel_movements -> operation_logs
ALTER TABLE "fuel_movements"
  ADD CONSTRAINT "fuel_mov_op_log_fk"
  FOREIGN KEY ("operation_log_id") REFERENCES "operation_logs"("id") ON DELETE SET NULL;

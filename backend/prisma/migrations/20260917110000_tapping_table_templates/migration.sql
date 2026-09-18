CREATE TABLE "tapping_table_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "company_id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "created_by" UUID, "updated_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tapping_table_templates_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tapping_table_template_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "template_id" UUID NOT NULL, "tapping_table_id" UUID NOT NULL, "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "tapping_table_template_items_pkey" PRIMARY KEY ("id"), CONSTRAINT "tapping_table_template_items_template_id_tapping_table_id_key" UNIQUE ("template_id", "tapping_table_id")
);
CREATE INDEX "tapping_table_templates_company_id_active_idx" ON "tapping_table_templates"("company_id", "active");
CREATE INDEX "tapping_table_template_items_template_id_position_idx" ON "tapping_table_template_items"("template_id", "position");
ALTER TABLE "tapping_table_template_items" ADD CONSTRAINT "tapping_table_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "tapping_table_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

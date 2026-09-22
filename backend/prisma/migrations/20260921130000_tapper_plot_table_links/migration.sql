CREATE TABLE "tapper_plot_table_links" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "plot_id" UUID NOT NULL,
  "tapper_id" UUID,
  "user_id" UUID,
  "tapping_table_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "tree_count" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tapper_plot_table_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tapper_plot_table_links_company_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tapper_plot_table_links_farm_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tapper_plot_table_links_plot_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tapper_plot_table_links_table_fkey" FOREIGN KEY ("tapping_table_id") REFERENCES "tapping_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "tapper_plot_table_links_scope_idx" ON "tapper_plot_table_links"("company_id", "farm_id", "plot_id", "active");
CREATE INDEX "tapper_plot_table_links_tapper_plot_idx" ON "tapper_plot_table_links"("tapper_id", "plot_id", "position");
CREATE INDEX "tapper_plot_table_links_user_plot_idx" ON "tapper_plot_table_links"("user_id", "plot_id", "position");
CREATE UNIQUE INDEX "tapper_plot_table_links_plot_tapper_table_key" ON "tapper_plot_table_links"("plot_id", "tapper_id", "tapping_table_id");
CREATE UNIQUE INDEX "tapper_plot_table_links_plot_user_table_key" ON "tapper_plot_table_links"("plot_id", "user_id", "tapping_table_id");

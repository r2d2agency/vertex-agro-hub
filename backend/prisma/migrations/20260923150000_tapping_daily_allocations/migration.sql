CREATE TABLE "tapping_daily_allocations" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "plot_id" UUID NOT NULL,
  "work_date" DATE NOT NULL,
  "tapper_id" UUID,
  "user_id" UUID,
  "tapping_table_id" UUID NOT NULL,
  "task_extent" TEXT NOT NULL,
  "trees_expected" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tapping_daily_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tapping_daily_allocations_unique_context"
  ON "tapping_daily_allocations"("plot_id", "work_date", "tapper_id", "user_id", "tapping_table_id", "task_extent");
CREATE INDEX "tapping_daily_allocations_scope_idx"
  ON "tapping_daily_allocations"("company_id", "farm_id", "plot_id", "work_date");

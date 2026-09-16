ALTER TABLE "tapper_table_links"
  ADD COLUMN "frequency_days" INTEGER,
  ADD COLUMN "rest_days" INTEGER,
  ADD COLUMN "work_days_cycle" INTEGER,
  ADD COLUMN "cut_type" TEXT,
  ADD COLUMN "stimulation" TEXT;

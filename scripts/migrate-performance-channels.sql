-- Add channels column to performance_reports (multi-canal Performance MVP)
ALTER TABLE performance_reports
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS perf_reports_channels
  ON performance_reports USING gin (channels);

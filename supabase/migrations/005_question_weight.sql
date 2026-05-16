-- ────────────────────────────────────────────────────────────
-- Question weight for scoring aggregation
-- ────────────────────────────────────────────────────────────
-- Per-question weight used by getSessionOverallScore() to compute
-- the weighted average across all evaluated questions. Default 1.0
-- means equal weight; HR can dial up core questions (e.g. 2.0/3.0)
-- or dial down small-talk (e.g. 0.5).

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS "weight" numeric NOT NULL DEFAULT 1.0;

-- ────────────────────────────────────────────────────────────
-- STRUCTURED_EVAL question type
-- ────────────────────────────────────────────────────────────
-- A new question type whose evaluation is driven by an HR-authored
-- rubric (Markdown). After the interview the AI evaluator scores
-- every STRUCTURED_EVAL question independently against its rubric
-- and writes the per-question result into sessions.questionEvaluations.

-- 1. Add new enum value
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'STRUCTURED_EVAL';

-- 2. Per-question rubric (Markdown). Only meaningful for
--    type='STRUCTURED_EVAL'; other types leave it NULL.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS "evaluationRubric" text;

-- 3. Per-question evaluation results: array of
--    { questionId, totalScore, maxScore, dimensions[], explanation, ... }
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS "questionEvaluations" jsonb;

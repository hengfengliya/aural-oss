/**
 * Session scoring — unified weighted-average percentage (0-100) across
 * heterogeneous question types.
 *
 * Inputs (any combination present):
 *   - insights.questionEvaluations: LLM "gut-feel" per-question scores 1-10
 *     (produced by the summary prompt for non-structured question types)
 *   - insights.criteriaEvaluations: per-criterion scores 1-10 (interview-
 *     level soft dimensions; used only as a fallback when no question-
 *     level scores exist — and NEVER mixed into the question total)
 *   - structuredEvaluations: STRUCTURED_EVAL rubric results { totalScore,
 *     maxScore, notEvaluated, questionId } produced by the dedicated
 *     evaluator (sessions.questionEvaluations jsonb)
 *
 * Algorithm:
 *   1. Normalize every per-question score to a 0..100 percentage.
 *      - Old shape: { score: 1..10 }    → score * 10
 *      - Rubric:    { totalScore/maxScore } → (total/max) * 100
 *   2. Match each scored question to its weight (question.weight, default 1).
 *   3. Weighted average → overallPercent in [0..100].
 *   4. Map to letter grade by global thresholds (≥85 A / 70 B / 55 C / else D).
 *
 * Backwards compatible: callers that pass only `{ questionEvaluations,
 * criteriaEvaluations }` (legacy two-field shape) still get a reasonable
 * result — old data automatically "backfills" to the new scale.
 */

export type Grade = "A" | "B" | "C" | "D";

export interface SessionScoreInputs {
  /** insights.questionEvaluations from the summary route. Legacy 1-10. */
  questionEvaluations?:
    | Array<{
        questionId?: string | null;
        question?: string | null;
        score?: number | string | null;
      } | null>
    | null;
  /** insights.criteriaEvaluations 1-10 (soft dimensions, fallback only). */
  criteriaEvaluations?:
    | Array<{ score?: number | string | null } | null>
    | null;
  /** sessions.questionEvaluations: structured rubric results. */
  structuredEvaluations?:
    | Array<{
        questionId?: string | null;
        totalScore?: number | null;
        maxScore?: number | null;
        notEvaluated?: boolean;
      } | null>
    | null;
  /** Optional per-question weights, keyed by questionId. Missing → 1. */
  weights?: Record<string, number> | null;
}

export interface SessionScoreResult {
  /** Weighted average percentage 0..100, or null if no scores at all. */
  percent: number | null;
  /** Letter grade derived from `percent`, or null when percent is null. */
  grade: Grade | null;
  /** Total number of questions that contributed to the score. */
  scoredQuestions: number;
}

const GRADE_THRESHOLDS: Array<{ min: number; grade: Grade }> = [
  { min: 85, grade: "A" },
  { min: 70, grade: "B" },
  { min: 55, grade: "C" },
  { min: 0, grade: "D" },
];

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function gradeFromPercent(pct: number): Grade {
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.min) return t.grade;
  }
  return "D";
}

/**
 * Compute the unified session score. See module docstring for full algorithm.
 */
export function computeSessionScore(
  inputs: SessionScoreInputs,
): SessionScoreResult {
  const weights = inputs.weights ?? {};
  const contributions: { percent: number; weight: number }[] = [];
  const seenIds = new Set<string>();

  // 1. Rubric (STRUCTURED_EVAL) — authoritative; takes precedence over any
  //    LLM gut-feel score that might also exist for the same question.
  for (const e of inputs.structuredEvaluations ?? []) {
    if (!e || e.notEvaluated) continue;
    const total = toNumber(e.totalScore);
    const max = toNumber(e.maxScore);
    if (total === null || max === null || max <= 0) continue;
    const percent = Math.max(0, Math.min(100, (total / max) * 100));
    const weight = e.questionId ? (weights[e.questionId] ?? 1) : 1;
    contributions.push({ percent, weight });
    if (e.questionId) seenIds.add(e.questionId);
  }

  // 2. LLM gut-feel 1-10 — skip questions already covered by a rubric result.
  for (const e of inputs.questionEvaluations ?? []) {
    if (!e) continue;
    const qid = e.questionId ?? null;
    if (qid && seenIds.has(qid)) continue;
    const s = toNumber(e.score);
    if (s === null) continue;
    const clamped = Math.max(0, Math.min(10, s));
    const percent = clamped * 10;
    const weight = qid ? (weights[qid] ?? 1) : 1;
    contributions.push({ percent, weight });
  }

  if (contributions.length === 0) {
    // 3. Fallback: average of criteriaEvaluations 1-10 if nothing question-
    //    level exists. Criteria don't have weights — equal averaging.
    const crit = (inputs.criteriaEvaluations ?? [])
      .map((c) => toNumber(c?.score))
      .filter((n): n is number => n !== null && Number.isFinite(n));
    if (crit.length === 0) return { percent: null, grade: null, scoredQuestions: 0 };
    const avg = crit.reduce((s, n) => s + n, 0) / crit.length;
    const percent = Math.max(0, Math.min(100, avg * 10));
    return { percent, grade: gradeFromPercent(percent), scoredQuestions: 0 };
  }

  const totalWeight = contributions.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return { percent: null, grade: null, scoredQuestions: 0 };
  const percent =
    contributions.reduce((s, c) => s + c.percent * c.weight, 0) / totalWeight;
  return {
    percent: Math.round(percent * 10) / 10, // 1 decimal place
    grade: gradeFromPercent(percent),
    scoredQuestions: contributions.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy shims — keep existing call-sites compiling without refactor */
/* ------------------------------------------------------------------ */

export type SessionScoreInsights =
  | {
      questionEvaluations?: SessionScoreInputs["questionEvaluations"];
      criteriaEvaluations?: SessionScoreInputs["criteriaEvaluations"];
      structuredEvaluations?: SessionScoreInputs["structuredEvaluations"];
      weights?: SessionScoreInputs["weights"];
    }
  | null
  | undefined;

/**
 * Returns the overall session score as a single number.
 *
 * **NEW semantics**: returns a 0..100 percentage. Old call-sites that
 * displayed "X/10" still render correctly (a value of 78 looks fine);
 * call-sites that want the explicit grade should switch to
 * `computeSessionScore()` and read `.grade`.
 *
 * Returns null when no scores exist for this session.
 */
export function getSessionOverallScore(
  insights: SessionScoreInsights,
): number | null {
  if (!insights) return null;
  const result = computeSessionScore({
    questionEvaluations: insights.questionEvaluations,
    criteriaEvaluations: insights.criteriaEvaluations,
    structuredEvaluations: insights.structuredEvaluations,
    weights: insights.weights,
  });
  return result.percent;
}

/**
 * Backwards-compatible helper: did this session use question-level data
 * (rather than falling back to criteria averaging)?
 */
export function usesQuestionEvaluationScore(
  insights: SessionScoreInsights,
): boolean {
  if (!insights) return false;
  const result = computeSessionScore({
    questionEvaluations: insights.questionEvaluations,
    criteriaEvaluations: insights.criteriaEvaluations,
    structuredEvaluations: insights.structuredEvaluations,
    weights: insights.weights,
  });
  return result.scoredQuestions > 0;
}

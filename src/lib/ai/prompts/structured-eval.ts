/**
 * Structured-evaluation prompt for STRUCTURED_EVAL questions.
 *
 * HR authors a per-question rubric (Markdown) that defines dimensions,
 * scoring brackets, pressure rules, output format and few-shot examples.
 * This module:
 *   1. Wraps that rubric into a chat message pair for the evaluator LLM.
 *   2. Parses the strict line-based output back into a structured object.
 */

export interface StructuredEvalDimension {
  name: string;
  score: number;
  max: number;
}

export interface StructuredEvalResult {
  questionId: string;
  totalScore: number | null;
  maxScore: number | null;
  dimensions: StructuredEvalDimension[];
  explanation: string;
  rawOutput: string;
  notEvaluated?: boolean;
}

interface BuildArgs {
  interviewTitle: string;
  language: string;
  questionText: string;
  rubric: string;
  transcript: { role: string; content: string }[];
}

/**
 * Build chat-completion messages: a strict system prompt that forces the
 * evaluator to respect the rubric verbatim, plus a user message containing
 * the question, the rubric, and the full transcript so the model can pick
 * out the relevant answer span itself.
 */
export function buildStructuredEvalPrompt(args: BuildArgs) {
  const transcriptText = args.transcript
    .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
    .join("\n");

  const system = [
    "你是一位严谨、克制的面试评估器（structured-eval evaluator）。",
    "你的工作流程：",
    "1. 阅读用户消息里的「题目」和「评分量规（rubric）」；",
    "2. 在「面试对话记录」里定位候选人对这道题的回答；",
    "3. 严格按照量规中的「输出要求」格式输出评分，不输出任何额外内容。",
    "",
    "硬性约束：",
    "- 所有分数必须为整数；",
    "- 总分必须等于各维度分之和；",
    "- 若候选人未提及该题、明显未作答或内容无关，直接输出：不评分",
    "- 评分要严格服从量规中的「压分规则」与等级判定；不要凭直觉抬分。",
    "- 评分说明使用中文，120 字以内。",
    "- 除量规规定的输出行之外，不得输出任何其他内容（不要 Markdown 标题、不要解释、不要 JSON 包裹）。",
  ].join("\n");

  const user = [
    `面试名称：${args.interviewTitle}`,
    `回答语言：${args.language}`,
    "",
    "## 题目",
    args.questionText,
    "",
    "## 评分量规（rubric）",
    args.rubric,
    "",
    "## 面试对话记录",
    transcriptText || "(空)",
    "",
    "请严格按量规中的「输出要求」输出。",
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/**
 * Parse the strict line-based evaluator output back to structured fields.
 *
 * Expected raw format (Chinese rubric example):
 *   总分：10/12
 *   推理透明性：3/3
 *   假设质量：3/3
 *   系统完整性：2/3
 *   工程化转化度：2/3
 *   评分说明：……
 *
 * Robust to:
 *   - leading/trailing whitespace, blank lines
 *   - either Chinese "：" or ASCII ":" separators
 *   - "不评分" / "not evaluated" → notEvaluated=true
 */
export function parseStructuredEvalOutput(
  raw: string,
  questionId: string,
): StructuredEvalResult | null {
  if (!raw || !raw.trim()) return null;

  const text = raw.trim();

  if (/^\s*(不评分|未作答|not evaluated|n\/a)\s*$/im.test(text)) {
    return {
      questionId,
      totalScore: null,
      maxScore: null,
      dimensions: [],
      explanation: "",
      rawOutput: text,
      notEvaluated: true,
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let totalScore: number | null = null;
  let maxScore: number | null = null;
  let explanation = "";
  const dimensions: StructuredEvalDimension[] = [];

  // Matches "label: N/M" with either ":" or "：" and tolerates spaces.
  const scoreLineRe = /^(.+?)\s*[:：]\s*(-?\d+)\s*\/\s*(\d+)\s*$/;
  // Matches "评分说明: ..." or "Explanation: ..."
  const explainRe = /^(评分说明|说明|explanation|comment)\s*[:：]\s*(.+)$/i;
  // Matches the "总分" / total line (case-insensitive)
  const totalRe = /^(总分|total)\s*[:：]\s*(-?\d+)\s*\/\s*(\d+)\s*$/i;

  for (const line of lines) {
    const totalMatch = line.match(totalRe);
    if (totalMatch) {
      totalScore = Number(totalMatch[2]);
      maxScore = Number(totalMatch[3]);
      continue;
    }

    const explainMatch = line.match(explainRe);
    if (explainMatch) {
      explanation = explainMatch[2].trim();
      continue;
    }

    const dimMatch = line.match(scoreLineRe);
    if (dimMatch) {
      dimensions.push({
        name: dimMatch[1].trim(),
        score: Number(dimMatch[2]),
        max: Number(dimMatch[3]),
      });
    }
  }

  // Reject parses that look obviously broken: no total and no dimensions.
  if (totalScore === null && dimensions.length === 0) return null;

  return {
    questionId,
    totalScore,
    maxScore,
    dimensions,
    explanation,
    rawOutput: text,
  };
}

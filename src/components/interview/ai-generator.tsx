"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { QUESTION_TYPE_STYLES, QuestionCard } from "@/components/interview/question-card";
import { useOrg } from "@/components/org-provider";
import { AiButton } from "@/components/ui/ai-button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { AssessmentCriterion, GeneratedInterview, GeneratedQuestion } from "@/lib/ai/types";
import { AI_TONES, FOLLOW_UP_DEPTHS, LANGUAGES } from "@/lib/constants";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    ArrowRight,
    BrainCircuit,
    Briefcase,
    Check,
    Code2,
    Copy,
    FileText,
    Globe,
    ListOrdered,
    Loader2,
    MessageSquareText,
    Mic,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    Trash2,
    Users,
    Video,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PromptSegment = string | { text: string; highlight: true };

interface PromptTemplate {
  label: string;
  icon: React.ElementType;
  segments: PromptSegment[];
}

interface HLRange {
  start: number;
  end: number;
}

function templateToText(segments: PromptSegment[]): string {
  return segments.map((s) => (typeof s === "string" ? s : s.text)).join("");
}

function rangesFromSegments(segments: PromptSegment[]): HLRange[] {
  const ranges: HLRange[] = [];
  let pos = 0;
  for (const seg of segments) {
    const text = typeof seg === "string" ? seg : seg.text;
    if (typeof seg !== "string") ranges.push({ start: pos, end: pos + text.length });
    pos += text.length;
  }
  return ranges;
}

function adjustRanges(ranges: HLRange[], oldText: string, newText: string): HLRange[] {
  if (!ranges.length) return ranges;
  let s = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (s < minLen && oldText[s] === newText[s]) s++;
  let oe = oldText.length;
  let ne = newText.length;
  while (oe > s && ne > s && oldText[oe - 1] === newText[ne - 1]) {
    oe--;
    ne--;
  }
  const delta = (ne - s) - (oe - s);
  return ranges
    .map(({ start: rs, end: re }) => {
      if (re <= s) return { start: rs, end: re };
      if (rs >= oe) return { start: rs + delta, end: re + delta };
      if (rs <= s && re >= oe) return { start: rs, end: re + delta };
      if (rs >= s && re <= oe) return { start: s, end: ne };
      if (rs >= s && rs < oe) return { start: ne, end: re + delta };
      if (re > s && re <= oe) return { start: rs, end: s };
      return { start: rs, end: re };
    })
    .filter((r) => r.start < r.end);
}

function segmentsFromRanges(text: string, ranges: HLRange[]): PromptSegment[] {
  if (!ranges.length || !text) return text ? [text] : [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const result: PromptSegment[] = [];
  let pos = 0;
  for (const { start, end } of sorted) {
    if (start > pos) result.push(text.slice(pos, start));
    if (end > start) result.push({ text: text.slice(start, end), highlight: true });
    pos = end;
  }
  if (pos < text.length) result.push(text.slice(pos));
  return result;
}

const h = (text: string): { text: string; highlight: true } => ({
  text,
  highlight: true,
});

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    label: "Tech Hiring",
    icon: Code2,
    segments: [
      "Assess ",
      h("Senior Software Engineer"),
      " candidates with ",
      h("8"),
      " questions covering ",
      h("open-ended, coding, multiple-choice, and whiteboard"),
      " types, focusing on ",
      h("practical problem-solving and technical depth"),
      ".",
    ],
  },
  {
    label: "Behavioral",
    icon: Users,
    segments: [
      "Conduct a ",
      h("behavioral interview"),
      " with ",
      h("6"),
      " questions mixing ",
      h("open-ended and single-choice"),
      " formats to evaluate ",
      h("leadership, teamwork, and conflict resolution"),
      ".",
    ],
  },
  {
    label: "User Research",
    icon: Search,
    segments: [
      "Conduct ",
      h("user research interviews"),
      " with ",
      h("6"),
      " ",
      h("open-ended"),
      " questions to understand ",
      h("product usage patterns, pain points, and unmet user needs"),
      ".",
    ],
  },
  {
    label: "Screening Call",
    icon: Briefcase,
    segments: [
      "Design a ",
      h("screening call"),
      " with ",
      h("5"),
      " questions mixing ",
      h("open-ended, single-choice, and coding"),
      " to quickly evaluate ",
      h("technical fundamentals and communication skills"),
      ".",
    ],
  },
  {
    label: "Case Study",
    icon: BrainCircuit,
    segments: [
      "Design a ",
      h("case study interview"),
      " with ",
      h("4"),
      " questions including ",
      h("whiteboard, multiple-choice, and open-ended"),
      " problem analysis.",
    ],
  },
  {
    label: "Expert Interview",
    icon: MessageSquareText,
    segments: [
      "Conduct an ",
      h("expert interview"),
      " with ",
      h("5"),
      " ",
      h("open-ended and research"),
      " questions to explore ",
      h("domain expertise, industry trends, and strategic recommendations"),
      " for the ",
      h("AI industry"),
      ".",
    ],
  },
];

const PROMPT_TEMPLATES_ZH: PromptTemplate[] = [
  {
    label: "销售顾问",
    icon: Briefcase,
    segments: [
      "为焕贞美容门诊招聘 ",
      h("销售顾问"),
      "，出 ",
      h("8"),
      " 道题，覆盖 ",
      h("开放型 + 单选 + 案例"),
      " 类型，重点考察 ",
      h("销售技巧、客户沟通、成交转化能力"),
      "。",
    ],
  },
  {
    label: "美容师",
    icon: Users,
    segments: [
      "招聘 ",
      h("美容师 / 治疗师"),
      "，出 ",
      h("6"),
      " 道题，混合 ",
      h("开放型和单选"),
      "，考察 ",
      h("专业操作、服务意识、卫生与安全规范"),
      "。",
    ],
  },
  {
    label: "行为面试",
    icon: MessageSquareText,
    segments: [
      "进行 ",
      h("行为面试"),
      "，出 ",
      h("6"),
      " 道题，混合 ",
      h("开放型和单选"),
      " 题型，评估 ",
      h("责任心、团队协作、压力下处理冲突的能力"),
      "。",
    ],
  },
  {
    label: "初筛电话",
    icon: Briefcase,
    segments: [
      "设计一场 ",
      h("初筛电话"),
      "，出 ",
      h("5"),
      " 道题，混合 ",
      h("开放型和单选"),
      "，快速评估 ",
      h("基础专业能力和沟通表达"),
      "。",
    ],
  },
  {
    label: "案例分析",
    icon: BrainCircuit,
    segments: [
      "设计一场 ",
      h("案例分析面试"),
      "，出 ",
      h("4"),
      " 道题，包含 ",
      h("白板、多选、开放型"),
      " 综合问题分析。",
    ],
  },
  {
    label: "用户调研",
    icon: Search,
    segments: [
      "进行 ",
      h("用户调研访谈"),
      "，出 ",
      h("6"),
      " 道 ",
      h("开放型"),
      " 题目，了解 ",
      h("产品使用习惯、痛点和未被满足的需求"),
      "。",
    ],
  },
];

export function AIGenerator({ projectId }: { projectId?: string } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [description, setDescription] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);
  const [hlRanges, setHlRanges] = useState<HLRange[]>([]);
  const prevDescRef = useRef("");
  const [duration, setDuration] = useState("20");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [aiTone, setAiTone] = useState<"CASUAL" | "PROFESSIONAL" | "FORMAL" | "FRIENDLY">("FRIENDLY");
  const [followUpDepth, setFollowUpDepth] = useState<"LIGHT" | "MODERATE" | "DEEP">("MODERATE");
  const [language, setLanguage] = useState("en");
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamPhase, setStreamPhase] = useState<"idle" | "thinking" | "writing">("idle");
  const [thinkingText, setThinkingText] = useState("");
  const [contentText, setContentText] = useState("");
  const thinkingRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<GeneratedInterview | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable state (separate from result so edits don't mutate original)
  const [editableCriteria, setEditableCriteria] = useState<AssessmentCriterion[]>([]);
  const [editableQuestions, setEditableQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCriterionIndex, setEditingCriterionIndex] = useState<number | null>(null);
  const criterionSnapshotRef = useRef<AssessmentCriterion | null>(null);

  // Context documents (JD / Resume)
  const [jdText, setJdText] = useState("");
  const [jdSource, setJdSource] = useState("");
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState("");
  const [jdUrlInput, setJdUrlInput] = useState("");
  const [jdPopoverOpen, setJdPopoverOpen] = useState(false);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeSource, setResumeSource] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // AI feedback refinement
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  // Auto-scroll streaming panels to bottom and keep card in viewport
  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thinkingText]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [contentText]);

  const createMutation = trpc.interview.create.useMutation();
  const createQuestionMutation = trpc.question.create.useMutation();

  /** Consume an SSE stream from generate/refine and return parsed data. */
  const consumeStream = async (response: Response): Promise<GeneratedInterview> => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: GeneratedInterview | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "thinking") {
          setStreamPhase("thinking");
          if (payload.text) {
            setThinkingText((prev) => prev + payload.text);
          }
        } else if (payload.type === "content") {
          setStreamPhase("writing");
          if (payload.text) {
            setContentText((prev) => prev + payload.text);
          }
        } else if (payload.type === "done") {
          result = payload.data as GeneratedInterview;
        } else if (payload.type === "error") {
          throw new Error(payload.message);
        }
      }
    }
    if (!result) throw new Error("No result received");
    return result;
  };

  const extractText = useCallback(async (source: { file?: File; url?: string }) => {
    const formData = new FormData();
    if (source.file) formData.append("file", source.file);
    if (source.url) formData.append("url", source.url);
    const res = await fetch("/api/ai/extract-text", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Extraction failed");
    return data.text as string;
  }, []);

  const handleJdFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdLoading(true);
    setJdError("");
    setJdPopoverOpen(false);
    try {
      const text = await extractText({ file });
      setJdText(text);
      setJdSource(file.name);
    } catch (err) {
      setJdError(err instanceof Error ? err.message : "Failed to extract text");
    } finally {
      setJdLoading(false);
      if (jdFileRef.current) jdFileRef.current.value = "";
    }
  }, [extractText]);

  const handleJdUrl = useCallback(async (pastedUrl?: string) => {
    const url = (pastedUrl ?? jdUrlInput).trim();
    if (!url) return;
    setJdLoading(true);
    setJdError("");
    setJdPopoverOpen(false);
    setJdUrlInput("");
    try {
      const text = await extractText({ url });
      setJdText(text);
      setJdSource(url);
    } catch (err) {
      setJdError(err instanceof Error ? err.message : "Failed to extract text");
    } finally {
      setJdLoading(false);
    }
  }, [jdUrlInput, extractText]);

  const handleResumeFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeLoading(true);
    setResumeError("");
    try {
      const text = await extractText({ file });
      setResumeText(text);
      setResumeSource(file.name);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Failed to extract text");
    } finally {
      setResumeLoading(false);
      if (resumeFileRef.current) resumeFileRef.current.value = "";
    }
  }, [extractText]);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setGenerating(true);
    setStreamPhase("idle");
    setThinkingText("");
    setContentText("");
    setResult(null);
    setEditableCriteria([]);
    setEditableQuestions([]);
    setEditingIndex(null);
    setEditingCriterionIndex(null);
    setFeedback("");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          durationMinutes: Number(duration) || 20,
          language: LANGUAGES.find((l) => l.value === language)?.label ?? language,
          organizationId: currentOrg?.id,
          projectId,
          ...(jdText && { jobDescription: jdText }),
          ...(resumeText && { resumeText }),
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Generation failed");
      }

      const data = await consumeStream(response);
      setResult(data);
      setEditableCriteria(data.assessmentCriteria ?? []);
      setEditableQuestions(data.questions.map((q, i) => ({
        ...q,
        order: i + 1,
        starterCode: q.starterCode
          ? { ...q.starterCode, language: q.starterCode.language.toLowerCase() }
          : undefined,
      })));
    } catch {
      toast({ title: tt("Generation failed", "生成失败"), description: tt("Please try again or create the interview manually.", "请重试，或手动创建面试。"), variant: "destructive" });
    } finally {
      setGenerating(false);
      setStreamPhase("idle");
    }
  };

  const handleRefine = async () => {
    if (!result || !feedback.trim()) return;

    setRefining(true);
    setStreamPhase("idle");
    setThinkingText("");
    setContentText("");
    try {
      const response = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview: {
            title: result.title,
            description: result.description,
            objective: result.objective,
            assessmentCriteria: editableCriteria,
            questions: editableQuestions.map((q) => ({ text: q.text, type: q.type })),
          },
          feedback,
          language: LANGUAGES.find((l) => l.value === language)?.label ?? language,
          organizationId: currentOrg?.id,
          projectId,
          ...(jdText && { jobDescription: jdText }),
          ...(resumeText && { resumeText }),
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Refinement failed");
      }

      const data = await consumeStream(response);
      setResult(data);
      setEditableCriteria(data.assessmentCriteria ?? []);
      setEditableQuestions(data.questions.map((q, i) => ({
        ...q,
        order: i + 1,
        starterCode: q.starterCode
          ? { ...q.starterCode, language: q.starterCode.language.toLowerCase() }
          : undefined,
      })));
      setFeedback("");
      setEditingIndex(null);
      setEditingCriterionIndex(null);
      toast({ title: tt("Interview refined based on your feedback!", "已根据你的反馈优化面试！") });
    } catch {
      toast({ title: tt("Refinement failed", "优化失败"), description: tt("Please try again.", "请重试。"), variant: "destructive" });
    } finally {
      setRefining(false);
      setStreamPhase("idle");
    }
  };

  const handleAccept = async () => {
    if (!result || editableQuestions.length === 0) return;

    setSaving(true);
    try {
      const interview = await createMutation.mutateAsync({
        projectId,
        title: result.title,
        description: result.description,
        objective: result.objective,
        assessmentCriteria: editableCriteria.length > 0 ? editableCriteria : undefined,
        chatEnabled,
        voiceEnabled,
        videoEnabled,
        language,
        aiTone,
        aiName: result.recommendedSettings.aiName,
        followUpDepth,
        antiCheatingEnabled,
        timeLimitMinutes: Number(duration) || undefined,
      });

      await Promise.all(
        editableQuestions.map((q, i) =>
          createQuestionMutation.mutateAsync({
            interviewId: interview.id,
            order: i,
            text: q.text,
            type: q.type as "OPEN_ENDED" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "CODING" | "WHITEBOARD" | "RESEARCH",
            description: q.description ?? undefined,
            timeLimitSeconds: q.timeLimitSeconds ?? undefined,
            isRequired: q.isRequired ?? true,
            options: q.options ?? undefined,
            followUpPrompts: q.followUpPrompts ?? undefined,
            starterCode: q.type === "CODING" && q.starterCode ? q.starterCode : undefined,
          })
        )
      );

      toast({ title: tt("Interview created!", "面试已创建！") });
      router.push(`/interviews/${interview.id}/edit/sessions`);
    } catch (err) {
      const message = err instanceof Error ? err.message : tt("Something went wrong", "出现错误");
      toast({ title: tt("Error saving interview", "保存面试失败"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Question editing helpers
  const updateQuestion = useCallback(
    (index: number, updates: Partial<GeneratedQuestion>) => {
      setEditableQuestions((prev) =>
        prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
      );
    },
    []
  );

  const deleteQuestion = useCallback((index: number) => {
    setEditableQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 }))
    );
    setEditingIndex(null);
  }, []);

  const [importOpen, setImportOpen] = useState(false);

  const addQuestion = useCallback(() => {
    const newQ: GeneratedQuestion = {
      order: editableQuestions.length + 1,
      text: "",
      type: "OPEN_ENDED",
      description: "",
      isRequired: true,
      timeLimitSeconds: undefined,
      followUpPrompts: [],
    };
    setEditableQuestions((prev) => [...prev, newQ]);
    setEditingIndex(editableQuestions.length);
  }, [editableQuestions.length]);

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    setEditableQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next.map((q, i) => ({ ...q, order: i + 1 }));
    });
    setEditingIndex((prev) => {
      if (prev === null) return null;
      if (prev === fromIndex) return dropIndex;
      // Shift editing index if it was between from and drop
      if (fromIndex < dropIndex && prev > fromIndex && prev <= dropIndex) return prev - 1;
      if (fromIndex > dropIndex && prev >= dropIndex && prev < fromIndex) return prev + 1;
      return prev;
    });
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Generator input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {tt("AI Interview Generator", "AI 面试生成器")}
          </CardTitle>
          <CardDescription>
            {tt(
              "Describe your goal in natural language and AI will create a complete interview structure for you.",
              "用自然语言描述你的目标，AI 会为你生成完整的面试结构。",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2" data-tour="interview-prompt">
            <Label htmlFor="ai-description">{tt("What kind of interview do you need?", "想做什么样的面试？")}</Label>
            {(() => {
              const segments = hlRanges.length ? segmentsFromRanges(description, hlRanges) : null;
              const hasHL = segments?.some((s) => typeof s !== "string") ?? false;
              return (
                <>
                  {/* Textarea with attachment area */}
                  <div className="rounded-md border bg-background focus-within:border-ring transition-colors">
                    {/* Hidden file inputs */}
                    <input ref={jdFileRef} type="file" accept=".pdf" className="hidden" onChange={handleJdFile} />
                    <input ref={resumeFileRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeFile} />

                    {/* Attached files at the top */}
                    {(jdText || resumeText || jdLoading || resumeLoading || jdError || resumeError) && (
                      <div className="flex flex-wrap items-center gap-2 px-3 pt-2.5 pb-1">
                        {jdLoading && (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {tt("Extracting JD...", "正在提取职位描述...")}
                          </span>
                        )}
                        {jdText && (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                            {jdSource.startsWith("http") ? <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <span className="max-w-[180px] truncate">{jdSource}</span>
                            <button
                              type="button"
                              className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => { setJdText(""); setJdSource(""); setJdUrlInput(""); setJdError(""); }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {jdError && <span className="text-xs text-destructive">{jdError}</span>}

                        {resumeLoading && (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {tt("Extracting resume...", "正在提取简历...")}
                          </span>
                        )}
                        {resumeText && (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="max-w-[180px] truncate">{resumeSource}</span>
                            <button
                              type="button"
                              className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => { setResumeText(""); setResumeSource(""); setResumeError(""); }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {resumeError && <span className="text-xs text-destructive">{resumeError}</span>}
                      </div>
                    )}

                    <div className="relative">
                      <Textarea
                        id="ai-description"
                        placeholder={tt(
                          "e.g. I want to assess senior React developers for our fintech startup, focusing on system design and problem-solving skills...",
                          "例如：我想为焕贞美容门诊招聘有 3 年以上经验的销售顾问，重点考察销售技巧和客户沟通能力...",
                        )}
                        value={description}
                        onChange={(e) => {
                          const next = e.target.value;
                          setHlRanges((prev) => adjustRanges(prev, prevDescRef.current, next));
                          prevDescRef.current = next;
                          setDescription(next);
                          setActiveTemplate(null);
                        }}
                        rows={4}
                        className={cn(
                          "border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[96px] bg-transparent",
                          hasHL && "text-transparent caret-foreground selection:bg-primary/20",
                        )}
                      />
                      {hasHL && segments && (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent px-3 py-2 text-sm leading-normal"
                        >
                          {segments.map((seg, j) =>
                            typeof seg === "string" ? (
                              <span key={j}>{seg}</span>
                            ) : (
                              <mark
                                key={j}
                                style={{ backgroundColor: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))", borderRadius: "3px", boxShadow: "-3px 0 0 hsl(var(--primary) / 0.12), 3px 0 0 hsl(var(--primary) / 0.12)", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
                              >
                                {seg.text}
                              </mark>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom toolbar: JD & Resume buttons (right-aligned) */}
                    <div className="flex items-center justify-end gap-1.5 px-3 pb-2">
                      {/* JD button */}
                      <Popover open={jdPopoverOpen} onOpenChange={(open) => { setJdPopoverOpen(open); if (!open) setJdUrlInput(""); }}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                              jdText
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {jdLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5" />}
                            {tt("JD", "职位描述")}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-2">
                          {jdText ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-muted transition-colors"
                              onClick={() => { setJdText(""); setJdSource(""); setJdUrlInput(""); setJdError(""); setJdPopoverOpen(false); }}
                            >
                              <X className="h-4 w-4" />
                              {tt("Remove JD", "移除职位描述")}
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="block px-1 text-xs font-medium text-muted-foreground">{tt("Paste JD link", "粘贴职位描述链接")}</label>
                              <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5">
                                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={jdUrlInput}
                                  onChange={(e) => setJdUrlInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleJdUrl(); } }}
                                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                                  autoFocus
                                />
                                {jdUrlInput.trim() && (
                                  <button
                                    type="button"
                                    className="shrink-0 rounded p-0.5 text-primary hover:text-primary/80 transition-colors"
                                    onClick={() => handleJdUrl()}
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                                <div className="relative flex justify-center"><span className="bg-popover px-2 text-xs text-muted-foreground">{tt("or", "或")}</span></div>
                              </div>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                onClick={() => { jdFileRef.current?.click(); setJdPopoverOpen(false); }}
                              >
                                <FileText className="h-4 w-4" />
                                {tt("Upload PDF", "上传 PDF")}
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>

                      {/* Resume button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                              resumeText
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {resumeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                            {tt("Resume", "简历")}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {resumeText ? (
                            <DropdownMenuItem onClick={() => { setResumeText(""); setResumeSource(""); setResumeError(""); }}>
                              <X className="mr-2 h-4 w-4" />
                              {tt("Remove Resume", "移除简历")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => resumeFileRef.current?.click()}>
                              <FileText className="mr-2 h-4 w-4" />
                              {tt("Upload PDF", "上传 PDF")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(isZh ? PROMPT_TEMPLATES_ZH : PROMPT_TEMPLATES).map((t, i) => (
                      <button
                        key={t.label}
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          activeTemplate === i
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                        onClick={() => {
                          const text = templateToText(t.segments);
                          setDescription(text);
                          prevDescRef.current = text;
                          setActiveTemplate(i);
                          setHlRanges(rangesFromSegments(t.segments));
                        }}
                      >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">{tt("Duration (min)", "时长（分钟）")}</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{tt("Language", "语言")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {isZh ? l.labelZh : l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tt("Tone", "AI 语气")}</Label>
              <Select value={aiTone} onValueChange={(v) => setAiTone(v as typeof aiTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {isZh ? t.labelZh : t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tt("Follow-up Depth", "追问深度")}</Label>
              <Select value={followUpDepth} onValueChange={(v) => setFollowUpDepth(v as typeof followUpDepth)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_DEPTHS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {isZh ? `${d.labelZh}（${d.descriptionZh}）` : `${d.label} (${d.description})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tt("Communication Channels", "沟通渠道")}</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>{tt("Chat", "聊天")}</Label>
                    <p className="text-xs text-muted-foreground">{tt("Text messaging", "文字消息")}</p>
                  </div>
                </div>
                <Switch
                  checked={chatEnabled}
                  onCheckedChange={(v) => {
                    if (!v && !voiceEnabled) return;
                    setChatEnabled(v);
                  }}
                />
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>{tt("Voice", "语音")}</Label>
                    <p className="text-xs text-muted-foreground">{tt("Speech conversation", "语音对话")}</p>
                  </div>
                </div>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={(v) => {
                    if (!v && !chatEnabled) return;
                    setVoiceEnabled(v);
                    if (!v) setVideoEnabled(false);
                  }}
                />
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>{tt("Video", "视频")}</Label>
                    <p className="text-xs text-muted-foreground">{tt("Camera & screen recording", "摄像头与屏幕录制")}</p>
                  </div>
                </div>
                <Switch
                  checked={videoEnabled}
                  disabled={!voiceEnabled}
                  onCheckedChange={setVideoEnabled}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tt("Anti-Cheating Mode", "反作弊模式")}</Label>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>{tt("Enable Anti-Cheating", "启用反作弊")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {tt(
                        "Requires camera, mic & screen sharing. Monitors tab switches, blocks external paste, and detects multiple screens",
                        "需要摄像头、麦克风和屏幕共享。监控标签页切换、阻止外部粘贴、检测多屏设备",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={antiCheatingEnabled}
                  onCheckedChange={setAntiCheatingEnabled}
                />
              </div>
              {antiCheatingEnabled && (
                <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">{tt("When enabled, interviewees will experience:", "启用后，候选人将经历：")}</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    <li>{tt("Camera, microphone, and screen sharing will be mandatory (cannot be skipped)", "强制开启摄像头、麦克风和屏幕共享（不可跳过）")}</li>
                    <li>{tt("Tab switching and window focus loss will be tracked and flagged", "切换标签页或窗口失焦将被记录并标记")}</li>
                    <li>{tt("Pasting content from outside the interview page will be blocked", "禁止从面试页面外粘贴内容")}</li>
                    <li>{tt("Multiple monitor setups will be detected and warned against", "检测到多显示器将给出警告")}</li>
                  </ul>
                  <p className="mt-1.5 text-amber-700 dark:text-amber-300">
                    {tt("Candidates will be informed of these restrictions before starting.", "候选人将在开始前被告知这些限制。")}
                  </p>
                </div>
              )}
            </div>
          </div>
          <AiButton
            wrapperClassName="w-full"
            className="w-full"
            data-tour="generate-interview"
            loading={generating}
            disabled={!description.trim()}
            onClick={handleGenerate}
          >
            {!generating && <Sparkles className="mr-2 h-4 w-4" />}
            {generating
              ? streamPhase === "thinking"
                ? tt("Thinking...", "思考中...")
                : streamPhase === "writing"
                  ? tt("Writing...", "撰写中...")
                  : tt("Generating...", "生成中...")
              : tt("Generate Interview", "生成面试")}
          </AiButton>
        </CardContent>
      </Card>

      {/* Streaming display (generation only — refine stream is rendered inside the result card) */}
      {generating && (thinkingText || contentText) && (
        <Card className="border-dashed">
          <CardContent className="space-y-3 pt-4 pb-3">
            {/* Thinking section */}
            {thinkingText && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {streamPhase === "thinking" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  <span>{streamPhase === "thinking" ? tt("Thinking...", "思考中...") : tt("Thinking complete", "思考完成")}</span>
                </div>
                <div
                  ref={thinkingRef}
                  className={cn(
                    "overflow-y-auto rounded-md bg-muted/50 px-3 py-2 code-scrollbar",
                    streamPhase === "thinking" ? "max-h-40" : "max-h-20"
                  )}
                >
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {thinkingText}
                  </p>
                </div>
              </div>
            )}
            {/* Content / writing section */}
            {contentText && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {streamPhase === "writing" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  <span>{streamPhase === "writing" ? tt("Writing interview...", "撰写面试...") : tt("Finalizing...", "整理中...")}</span>
                </div>
                <div ref={contentRef} className="max-h-40 overflow-y-auto rounded-md bg-muted/50 px-3 py-2 code-scrollbar">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {contentText}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <div ref={streamEndRef} />
        </Card>
      )}

      {/* Generated result — editable */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <CardDescription>{result.objective}</CardDescription>
            <div className="flex gap-2 pt-2">
              {chatEnabled && <Badge>{tt("Chat", "聊天")}</Badge>}
              {voiceEnabled && <Badge>{tt("Voice", "语音")}</Badge>}
              {videoEnabled && <Badge>{tt("Video", "视频")}</Badge>}
              <Badge variant="outline">{aiTone}</Badge>
              <Badge variant="secondary">
                {tt(`~${result.estimatedDurationMinutes} min`, `约 ${result.estimatedDurationMinutes} 分钟`)}
              </Badge>
              <Badge variant="secondary">
                {tt(`${editableQuestions.length} questions`, `${editableQuestions.length} 道题`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Questions sub-section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <ListOrdered className="h-4 w-4" />
                {tt(`Questions (${editableQuestions.length})`, `题目（${editableQuestions.length}）`)}
              </Label>
              <div className="space-y-1">
                {editableQuestions.map((q, i) => (
                  <QuestionCard
                    key={`q-${i}`}
                    data={q}
                    index={i}
                    editing={editingIndex === i}
                    onStartEdit={() => setEditingIndex(i)}
                    onSave={(updated) => {
                      updateQuestion(i, updated as Partial<GeneratedQuestion>);
                      setEditingIndex(null);
                    }}
                    onCancel={() => setEditingIndex(null)}
                    onDelete={() => deleteQuestion(i)}
                    dragProps={{
                      draggable: editingIndex !== i,
                      onDragStart: (e) => handleDragStart(e, i),
                      onDragOver: (e) => handleDragOver(e, i),
                      onDragLeave: handleDragLeave,
                      onDrop: (e) => handleDrop(e, i),
                      onDragEnd: handleDragEnd,
                    }}
                    className={cn(
                      dragOverIndex === i && dragIndexRef.current !== i
                        ? "border-primary bg-primary/5"
                        : "",
                      dragIndexRef.current === i && "opacity-50",
                    )}
                  />
                ))}
              </div>

              {/* Add question */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="flex-1 border-dashed"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {tt("Add New", "添加新题")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-dashed"
                  onClick={() => setImportOpen(true)}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  {tt("Import Existing", "导入已有")}
                </Button>
              </div>
            </div>

            {/* Import Questions Dialog */}
            <ImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              onImport={(imported) => {
                setEditableQuestions((prev) => [
                  ...prev,
                  ...imported.map((q, i) => ({
                    ...q,
                    order: prev.length + i + 1,
                  })),
                ]);
                toast({ title: tt(`${imported.length} question${imported.length > 1 ? "s" : ""} imported`, `已导入 ${imported.length} 道题`) });
              }}
              existingTexts={editableQuestions.map((q) => q.text)}
            />

            {/* Divider */}
            <div className="border-t" />

            {/* Assessment Criteria sub-section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Target className="h-4 w-4" />
                {tt(`Assessment Criteria (${editableCriteria.length})`, `评分标准（${editableCriteria.length}）`)}
              </Label>
              <div className="space-y-1.5">
                {editableCriteria.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    {tt("No assessment criteria defined yet.", "尚未定义评分标准。")}
                  </p>
                ) : (
                  editableCriteria.map((c, i) => (
                    <div key={i} className={`group flex items-start gap-2 rounded-md border px-3 py-2 transition-all ${editingCriterionIndex !== i ? "hover:border-primary/30" : ""}`}>
                      {editingCriterionIndex === i ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            value={c.name}
                            onChange={(e) =>
                              setEditableCriteria((prev) =>
                                prev.map((cr, idx) => idx === i ? { ...cr, name: e.target.value } : cr)
                              )
                            }
                            placeholder={tt("Criterion name...", "标准名称...")}
                            className="h-8 text-sm font-medium"
                            autoFocus
                          />
                          <Textarea
                            value={c.description}
                            onChange={(e) =>
                              setEditableCriteria((prev) =>
                                prev.map((cr, idx) => idx === i ? { ...cr, description: e.target.value } : cr)
                              )
                            }
                            placeholder={tt("What this criterion measures...", "此标准衡量什么...")}
                            rows={2}
                            className="resize-y text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  {tt("Delete", "删除")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tt("Delete criterion?", "删除评分标准？")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {tt(
                                      "This will permanently remove this assessment criterion. This action cannot be undone.",
                                      "将永久删除此评分标准，操作不可撤销。",
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tt("Cancel", "取消")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setEditableCriteria((prev) => prev.filter((_, idx) => idx !== i));
                                      setEditingCriterionIndex(null);
                                      criterionSnapshotRef.current = null;
                                    }}
                                  >
                                    {tt("Delete", "删除")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-foreground/50 hover:bg-foreground/5"
                              onClick={() => {
                                const snapshot = criterionSnapshotRef.current;
                                criterionSnapshotRef.current = null;
                                if (snapshot) {
                                  setEditableCriteria((prev) =>
                                    prev.map((cr, idx) =>
                                      idx === i ? snapshot : cr,
                                    ),
                                  );
                                } else {
                                  setEditableCriteria((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  );
                                }
                                setEditingCriterionIndex(null);
                              }}
                            >
                              <X className="mr-1 h-3 w-3" />
                              {tt("Cancel", "取消")}
                            </Button>
                            <Button size="sm" onClick={() => {
                              criterionSnapshotRef.current = null;
                              setEditingCriterionIndex(null);
                            }}>
                              <Check className="mr-1 h-3 w-3" />
                              {tt("Done", "完成")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              criterionSnapshotRef.current = structuredClone(editableCriteria[i]);
                              setEditingCriterionIndex(i);
                            }}
                          >
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.description}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              className="p-0.5 text-muted-foreground/80 hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                criterionSnapshotRef.current = structuredClone(editableCriteria[i]);
                                setEditingCriterionIndex(i);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="p-0.5 text-muted-foreground/80 hover:text-destructive transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tt("Delete criterion?", "删除评分标准？")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {tt(
                                      "This will permanently remove this assessment criterion. This action cannot be undone.",
                                      "将永久删除此评分标准，操作不可撤销。",
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tt("Cancel", "取消")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setEditableCriteria((prev) => prev.filter((_, idx) => idx !== i));
                                      setEditingCriterionIndex(null);
                                      criterionSnapshotRef.current = null;
                                    }}
                                  >
                                    {tt("Delete", "删除")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => {
                  setEditableCriteria((prev) => [...prev, { name: "", description: "" }]);
                  setEditingCriterionIndex(editableCriteria.length);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                {tt("Add Criterion", "添加评分标准")}
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* AI feedback refinement */}
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MessageSquareText className="h-4 w-4" />
                {tt("Refine with AI", "用 AI 优化")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {tt(
                  "Describe what you'd like to change and AI will update the questions.",
                  "描述你希望修改的内容，AI 会更新题目。",
                )}
              </p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={tt(
                  'e.g. "Make the questions harder", "Add more behavioral questions", "Remove the ice-breaker"...',
                  '例如："把题目难度提高一些"、"多加几道行为面试题"、"去掉破冰问题"...',
                )}
                rows={2}
                className="resize-none bg-background"
              />
              <AiButton
                wrapperClassName="w-fit"
                size="sm"
                loading={refining}
                disabled={!feedback.trim()}
                onClick={handleRefine}
              >
                {!refining && <Sparkles className="mr-2 h-3.5 w-3.5" />}
                {refining
                  ? streamPhase === "thinking"
                    ? tt("Thinking...", "思考中...")
                    : streamPhase === "writing"
                      ? tt("Writing...", "撰写中...")
                      : tt("Refining...", "优化中...")
                  : tt("Refine Questions", "优化题目")}
              </AiButton>

              {/* Refine streaming display */}
              {refining && (thinkingText || contentText) && (
                <Card className="border-dashed">
                  <CardContent className="space-y-3 pt-4 pb-3">
                    {thinkingText && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          {streamPhase === "thinking" && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          <span>{streamPhase === "thinking" ? tt("Thinking...", "思考中...") : tt("Thinking complete", "思考完成")}</span>
                        </div>
                        <div
                          ref={thinkingRef}
                          className={cn(
                            "overflow-y-auto rounded-md bg-muted/50 px-3 py-2 code-scrollbar",
                            streamPhase === "thinking" ? "max-h-40" : "max-h-20"
                          )}
                        >
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {thinkingText}
                          </p>
                        </div>
                      </div>
                    )}
                    {contentText && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          {streamPhase === "writing" && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          <span>{streamPhase === "writing" ? tt("Writing interview...", "撰写面试...") : tt("Finalizing...", "整理中...")}</span>
                        </div>
                        <div ref={contentRef} className="max-h-40 overflow-y-auto rounded-md bg-muted/50 px-3 py-2 code-scrollbar">
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {contentText}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <div ref={streamEndRef} />
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t pt-4">
              <Button data-tour="accept-create" onClick={handleAccept} disabled={saving || editableQuestions.length === 0}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {tt("Accept & Create", "确认并创建")}
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {tt("Regenerate All", "全部重新生成")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Import Dialog (local-state variant for Create Interview)           */
/* ------------------------------------------------------------------ */

function ImportDialog({
  open,
  onOpenChange,
  onImport,
  existingTexts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: GeneratedQuestion[]) => void;
  existingTexts: string[];
}) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allQuestions = trpc.question.listAll.useQuery(
    { limit: 200 },
    { enabled: open },
  );

  const existing = useMemo(
    () => new Set(existingTexts.map((t) => t.toLowerCase())),
    [existingTexts],
  );

  const filteredQuestions = useMemo(() => {
    let result = (allQuestions.data?.questions ?? []).filter(
      (q) => !existing.has(q.text.toLowerCase()),
    );
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.text.toLowerCase().includes(s) ||
          (q.description ?? "").toLowerCase().includes(s) ||
          q.interview.title.toLowerCase().includes(s),
      );
    }
    return result;
  }, [allQuestions.data, existing, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const selected = filteredQuestions.filter((q) => selectedIds.has(q.id));
    const mapped: GeneratedQuestion[] = selected.map((q) => ({
      order: 0,
      text: q.text,
      type: q.type as GeneratedQuestion["type"],
      description: q.description ?? "",
      isRequired: true,
      options: q.options as GeneratedQuestion["options"],
      starterCode: q.starterCode as GeneratedQuestion["starterCode"],
    }));
    onImport(mapped);
    setSelectedIds(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedIds(new Set());
      setSearch("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tt("Import Existing Questions", "导入已有题目")}</DialogTitle>
          <DialogDescription>
            {tt(
              "Select questions from your existing interviews to add here.",
              "从已有面试中选择题目添加到这里。",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tt("Search questions...", "搜索题目...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto rounded-lg border code-scrollbar">
            {allQuestions.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search.trim()
                  ? tt("No questions match your search.", "没有匹配的题目。")
                  : tt("No questions available to import.", "暂无可导入的题目。")}
              </p>
            ) : (
              <div className="divide-y">
                {filteredQuestions.map((q) => {
                  const style =
                    QUESTION_TYPE_STYLES[q.type] ??
                    QUESTION_TYPE_STYLES.OPEN_ENDED;
                  const TypeIcon = style.icon;
                  return (
                    <label
                      key={q.id}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedIds.has(q.id)}
                        onCheckedChange={() => toggleSelect(q.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          {q.text}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", style.badgeClass)}
                          >
                            <TypeIcon className="mr-0.5 h-2.5 w-2.5" />
                            {style.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {q.interview.title}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {tt("Cancel", "取消")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            {tt(`Import (${selectedIds.size})`, `导入 (${selectedIds.size})`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

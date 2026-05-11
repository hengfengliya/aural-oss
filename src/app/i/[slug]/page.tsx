"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { PreparingScreen } from "@/components/session/preparing-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle2, Link2Off, Loader2, Lock, MessageSquare, Mic, Plus, RotateCcw } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "aural_session_";

export default function PublicInterviewPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const sidParam = searchParams.get("sid");
  const { toast } = useToast();
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);

  useEffect(() => {
    if (isPreview && sidParam) {
      router.replace(`/i/${slug}/session?sid=${sidParam}&preview=true`);
    }
  }, [isPreview, sidParam, slug, router]);

  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [completed] = useState(false);

  // ── Existing session detection ─────────────────────────────────
  const [storedSessionId, setStoredSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + slug);
      if (stored) setStoredSessionId(stored);
    } catch {
      // localStorage may be unavailable
    }
  }, [slug]);

  const existingSession = trpc.session.getById.useQuery(
    { id: storedSessionId! },
    { enabled: !!storedSessionId, retry: false },
  );

  useEffect(() => {
    if (!storedSessionId) return;
    if (existingSession.isError || (existingSession.data && existingSession.data.status !== "IN_PROGRESS")) {
      try { localStorage.removeItem(STORAGE_PREFIX + slug); } catch { /* noop */ }
      setStoredSessionId(null);
    }
  }, [existingSession.data, existingSession.isError, storedSessionId, slug]);

  const canResume = !!storedSessionId && existingSession.data?.status === "IN_PROGRESS";

  const interview = trpc.interview.getBySlug.useQuery({ slug }, { retry: false });

  const createSession = trpc.session.create.useMutation({
    onSuccess: (data) => {
      try { localStorage.setItem(STORAGE_PREFIX + slug, data.sessionId); } catch { /* noop */ }
      goToSession(data.sessionId);
    },
    onError: (err) => {
      toast({
        title: tt("Failed to start interview", "面试启动失败"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    router.prefetch(`/i/${slug}/session`);
  }, [router, slug]);

  const goToSession = useCallback((sid: string) => {
    router.push(`/i/${slug}/session?sid=${sid}`);
  }, [router, slug]);

  // ── Resume / Start-new handlers ────────────────────────────────
  const handleResume = useCallback(() => {
    if (!existingSession.data || !storedSessionId) return;
    goToSession(storedSessionId);
  }, [existingSession.data, storedSessionId, goToSession]);

  const handleStartNew = useCallback(() => {
    try { localStorage.removeItem(STORAGE_PREFIX + slug); } catch { /* noop */ }
    setStoredSessionId(null);
  }, [slug]);

  if (isPreview && sidParam) {
    return <PreparingScreen />;
  }

  if (interview.isLoading) {
    return <PreparingScreen />;
  }

  if (interview.isError || !interview.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Link2Off className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">{tt("Interview Not Available", "面试不可用")}</h2>
            <p className="text-muted-foreground mt-2">
              {tt(
                "This interview may have been removed or is no longer accepting responses.",
                "面试可能已被移除，或当前不再接受答题。",
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    try { localStorage.removeItem(STORAGE_PREFIX + slug); } catch { /* noop */ }
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-secondary-500" />
            <h2 className="mt-4 text-2xl font-bold">{tt("Thank you!", "感谢参与！")}</h2>
            <p className="mt-2 text-muted-foreground">
              {tt(
                "Your interview has been completed successfully. We appreciate your time and thoughtful responses.",
                "面试已顺利结束，感谢你的时间和用心回答。",
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (storedSessionId && existingSession.isLoading) {
    return <PreparingScreen />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-6 w-6" />
          </div>
          <CardTitle className="font-heading text-2xl">{interview.data.title}</CardTitle>
          {interview.data.description && (
            <CardDescription>{interview.data.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {/* ── Invite-only notice ───────────────────────── */}
          {interview.data.requireInvite && !isPreview && !canResume && (
            <div className="py-6 text-center">
              <Lock className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-medium">{tt("Invite only", "仅邀请")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tt(
                  "This interview is accessible only through a personal invite link. Please check your email for the link from the interviewer.",
                  "本面试仅通过专属邀请链接访问。请到邮箱里查看面试方发送的链接。",
                )}
              </p>
            </div>
          )}

          {/* ── Resume banner ──────────────────────────────── */}
          {canResume && (
            <div className="mb-6 space-y-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium">
                  {tt("You have an unfinished interview session.", "你有一个未完成的面试会话。")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tt("Pick up right where you left off, or start fresh.", "可以从上次中断的地方继续，或者重新开始。")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1" onClick={handleResume}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {tt("Continue Interview", "继续面试")}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleStartNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tt("Start New", "重新开始")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Start form ────────────────────────────────── */}
          {(!interview.data.requireInvite || isPreview) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSession.mutate({
                  interviewSlug: slug,
                  participantName,
                  participantEmail,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">
                  {tt("Your Name", "你的姓名")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder={tt("Enter your name", "请输入姓名")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {tt("Your Email", "你的邮箱")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  placeholder={tt("Enter your email", "请输入邮箱")}
                  required
                />
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>
                  {interview.data.questions.length} {tt("questions", "道题")} &middot;{" "}
                  {interview.data.timeLimitMinutes
                    ? `${interview.data.timeLimitMinutes} ${tt("min", "分钟")}`
                    : tt("No time limit", "不限时")}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
                {interview.data.voiceEnabled ? (
                  <>
                    <Mic className="h-4 w-4 text-primary" />
                    <span>
                      {interview.data.chatEnabled
                        ? tt(
                            "This interview supports voice and text chat",
                            "本面试支持语音和文字两种作答方式",
                          )
                        : tt(
                            "This interview uses voice mode (requires Chrome or Edge)",
                            "本面试使用语音模式（需要 Chrome 或 Edge 浏览器）",
                          )}
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span>{tt("This interview uses text chat", "本面试通过文字进行")}</span>
                  </>
                )}
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={
                  !participantName.trim() ||
                  !participantEmail.trim() ||
                  createSession.isLoading
                }
              >
                {createSession.isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tt("Begin Interview", "开始面试")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

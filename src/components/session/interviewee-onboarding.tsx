"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { PreparingScreen } from "@/components/session/preparing-screen";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuralLogo } from "@/components/ui/aural-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { InterviewContext } from "@/hooks/use-voice";
import { getMicTestMessage, getSpeechSynthesisLocale } from "@/lib/i18n";
import {
    setCameraSkipped,
    setScreenSkipped,
    setStoredScreenStream,
} from "@/lib/media-stream-store";
import {
  buildRelayTargets,
  isRecoverableRelayErrorMessage,
  RelayConnector,
  resolveRelayPrimaryPreference,
} from "@/lib/voice/relay-routing";
import { cn } from "@/lib/utils";
import {
    AlertCircle,
    AudioLines,
    Camera,
    CheckCircle2,
    Loader2,
    Mic,
    Monitor,
    RefreshCw,
    RotateCcw,
    ScreenShare,
    User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInterface } from "./chat-interface";
import { IntervieweeTourOverlay } from "./interviewee-tour-overlay";
import { IntervieweeTourProvider, useIntervieweeTour } from "./interviewee-tour-provider";
import { VoiceInterface } from "./voice-interface";

interface IntervieweeOnboardingProps {
  interviewTitle: string;
  interviewDescription?: string | null;
  questionCount: number;
  timeLimitMinutes?: number | null;
  language?: string;
  antiCheatingEnabled?: boolean;
  voiceEnabled?: boolean;
  chatEnabled?: boolean;
  aiName?: string;
  questionTypes?: string[];
  onComplete: () => void;
}

type OnboardingStep = "info" | "checklist" | "howItWorks";

const STEPS = [
  { key: "info" as const, label: "Interview Info", labelZh: "面试信息" },
  { key: "checklist" as const, label: "Checklist", labelZh: "准备清单" },
  { key: "enter" as const, label: "Start", labelZh: "开始" },
];

function WelcomeIllustration() {
  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-orange-50 px-6 pt-6 pb-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/marketing/channel-screenshot-sm.webp"
        alt="Interview interface preview"
        className="block w-full rounded-t-lg"
      />
      <div className="absolute -bottom-px left-0 right-0 h-6 bg-gradient-to-t from-white/90 to-transparent" />
    </div>
  );
}

export function PreviewWrapper({
  onReady,
  children,
}: {
  onReady: () => void;
  children: React.ReactNode;
}) {
  const tour = useIntervieweeTour();
  const tourDone = tour?.finished ?? false;
  const [welcomed, setWelcomed] = useState(false);
  const showWelcome = !welcomed && !tour?.active && !tourDone;
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);

  const handleStartTour = useCallback(() => {
    setWelcomed(true);
    tour?.restart();
  }, [tour]);

  const handleSkipTour = useCallback(() => {
    setWelcomed(true);
    tour?.skip();
  }, [tour]);

  return (
    <div className="relative flex h-screen flex-col bg-background">
      {children}

      {/* Welcome overlay */}
      {showWelcome && (
        <div className="absolute inset-0 z-[9997] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border/30 bg-white shadow-2xl">
            <WelcomeIllustration />
            <div className="space-y-3 px-8 pb-8 pt-2 text-center">
              <h3 className="text-xl font-bold text-gray-900">{tt("Welcome to your interview!", "欢迎参加面试！")}</h3>
              <p className="text-[15px] font-medium text-gray-700">
                {tt("Take a quick tour of the interview interface.", "先快速了解一下面试界面吧。")}
              </p>
              <p className="text-sm leading-relaxed text-gray-500">
                {tt(
                  "We'll walk you through the key features — voice controls, transcript, whiteboard, and more — so you know exactly where everything is.",
                  "我们会带你看一遍主要功能——语音控制、对话记录、白板等，让你清楚每样东西在哪。",
                )}
              </p>
              <div className="flex items-stretch gap-3 pt-3">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground"
                  onClick={handleSkipTour}
                >
                  {tt("Skip for now", "暂不查看")}
                </Button>
                <Button className="flex-1" size="lg" onClick={handleStartTour}>
                  {tt("Take a quick tour", "快速浏览")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tour complete overlay */}
      {tourDone && (
        <div className="absolute inset-0 z-[9997] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{tt("You're all set!", "都准备好了！")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {tt(
                  "You can start the interview now, or restart the tour if you'd like another look.",
                  "可以开始面试了，也可以重新看一遍引导。",
                )}
              </p>
            </div>
            <div className="flex items-stretch gap-3">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => tour?.restart()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {tt("Restart tour", "重新引导")}
              </Button>
              <Button className="flex-1" size="lg" onClick={onReady}>
                {tt("Start Interview", "开始面试")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: OnboardingStep }) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const stepIdxMap: Record<OnboardingStep, number> = { info: 0, checklist: 1, howItWorks: 2 };
  const currentIdx = Math.min(stepIdxMap[current], STEPS.length - 1);

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEPS.map((step, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  "h-px w-12 sm:w-20",
                  isComplete ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "border border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isCurrent
                    ? "font-medium text-foreground"
                    : isComplete
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {isZh ? step.labelZh : step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CameraCheck({
  done,
  onDone,
  allowSkip = true,
}: {
  done: boolean;
  onDone: () => void;
  allowSkip?: boolean;
}) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [streaming]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setPhoto(null);
      setStreaming(true);
    } catch {
      setError(tt("Unable to access camera. Please check permissions.", "无法访问摄像头，请检查权限。"));
    }
  }, [tt]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    setPhoto(dataUrl);
    onDone();
  }, [stopCamera, onDone]);

  const retake = useCallback(() => {
    setPhoto(null);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-36 w-44 overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/50">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Captured photo"
                className="h-full w-full object-cover"
              />
            ) : streaming ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <User className="h-10 w-10 text-muted-foreground/30" />
                <span className="text-[11px] text-muted-foreground/50">
                  {tt("Keep your eyes on the camera", "请正视摄像头")}
                </span>
              </div>
            )}
          </div>
          {!photo && !streaming && !done && (
            <Button size="sm" onClick={startCamera} className="w-full">
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              {tt("Start Collecting", "开始采集")}
            </Button>
          )}
          {streaming && (
            <Button size="sm" onClick={capture} className="w-full">
              {tt("Capture", "拍照")}
            </Button>
          )}
          {photo && (
            <Button size="sm" variant="outline" onClick={retake} className="w-full">
              <RefreshCw className="mr-1 h-3 w-3" />
              {tt("Retake", "重拍")}
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">
            {tt(
              "The photo will be compared with snapshots during the interview, so please keep your face visible.",
              "面试过程中会拍快照与本照片对比，请保持脸部可见。",
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {tt(
              "Photo collection requires authorization, please operate according to browser prompts.",
              "采集照片需要授权，请按浏览器提示操作。",
            )}
          </p>
          {error && (
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
              <button type="button" className="ml-auto font-medium underline" onClick={startCamera}>
                {tt("Retry", "重试")}
              </button>
            </div>
          )}
          {allowSkip && !error && !photo && !streaming && !done && (
            <p className="text-xs text-muted-foreground">
              {tt("No camera?", "没有摄像头？")}{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowSkipDialog(true)}>
                {tt("Skip", "跳过")}
              </button>
            </p>
          )}
          {!allowSkip && !error && !photo && !streaming && !done && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {tt("Camera is required for this interview.", "本场面试需要摄像头。")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center self-start pt-0.5">
          {done ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              <CheckCircle2 className="h-4 w-4" />
              {tt("Collect photo", "采集照片")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2" />
              {tt("Collect photo", "采集照片")}
            </span>
          )}
        </div>
      </CardContent>
      <canvas ref={canvasRef} className="hidden" />
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("Skip photo collection?", "跳过照片采集？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt(
                "Skipping photo collection is not recommended. The photo is used to verify your identity during the interview. Skipping may affect your interview results.",
                "不建议跳过照片采集。这张照片会用于面试期间核验身份，跳过可能影响面试结果。",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("Go back", "返回")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCameraSkipped(true); onDone(); }}>
              {tt("Skip anyway", "仍要跳过")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

type MicPhase = "idle" | "requesting" | "playing" | "listening" | "analyzing" | "confirm";

function MicCheck({ done, onDone, language, allowSkip = true }: { done: boolean; onDone: () => void; language?: string; allowSkip?: boolean }) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [transcript, setTranscript] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const relayConnectorRef = useRef<RelayConnector<Record<string, unknown>> | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const languageRef = useRef(language);
  languageRef.current = language;

  const stopAll = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    relayConnectorRef.current?.close();
    relayConnectorRef.current = null;
    if (micCtxRef.current) {
      micCtxRef.current.close().catch(() => {});
      micCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  const analyzeResponse = useCallback((text: string) => {
    setPhase("analyzing");
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      setPhase("idle");
      onDoneRef.current();
      return;
    }
    setPhase("confirm");
  }, []);

  const getSpeechSynthesisApi = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    return window.speechSynthesis;
  }, []);

  const stopTtsPlayback = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    getSpeechSynthesisApi()?.cancel();
  }, [getSpeechSynthesisApi]);

  const startListening = useCallback((quiet = false) => {
    if (!quiet) {
      setPhase("listening");
      setTranscript("");
    }

    let lastAsrText = "";
    let handled = false;
    let micStarted = false;

    const finish = (text: string) => {
      if (handled) return;
      handled = true;
      stopTtsPlayback();
      if (micCtxRef.current) {
        micCtxRef.current.close().catch(() => {});
        micCtxRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      relayConnectorRef.current?.close();
      relayConnectorRef.current = null;
      if (text.trim()) {
        analyzeResponse(text);
      } else if (!quiet) {
        analyzeResponse("");
      }
    };

    const startMicCapture = async () => {
      if (micStarted || handled) return;
      micStarted = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: 16000 });
        micCtxRef.current = ctx;

        const workletCode = `
          class MicProcessor extends AudioWorkletProcessor {
            constructor() { super(); this._buf = new Float32Array(4096); this._pos = 0; }
            process(inputs) {
              const ch = inputs[0]?.[0];
              if (!ch) return true;
              for (let i = 0; i < ch.length; i++) {
                this._buf[this._pos++] = ch[i];
                if (this._pos >= 4096) { this.port.postMessage(this._buf); this._buf = new Float32Array(4096); this._pos = 0; }
              }
              return true;
            }
          }
          registerProcessor('mic-processor', MicProcessor);
        `;
        const blob = new Blob([workletCode], { type: "application/javascript" });
        const workletUrl = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const source = ctx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(ctx, "mic-processor");
        source.connect(worklet);
        worklet.connect(ctx.destination);

        worklet.port.onmessage = (e) => {
          if (handled || !relayConnectorRef.current?.isReady) return;
          const input = e.data as Float32Array;
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
          }
          const bytes = new Uint8Array(pcm.buffer);
          let hex = "";
          for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, "0");
          }
          relayConnectorRef.current?.sendJson({ type: "audio", data: hex });
        };
      } catch {
        finish("");
      }
    };

    const connector = new RelayConnector<Record<string, unknown>>({
      targets: buildRelayTargets({
        language: languageRef.current,
        voiceRelayUrl: process.env.NEXT_PUBLIC_VOICE_RELAY_URL,
        openAiRelayUrl: process.env.NEXT_PUBLIC_OPENAI_VOICE_RELAY_URL,
        primaryPreference: resolveRelayPrimaryPreference(
          process.env.NEXT_PUBLIC_VOICE_RELAY_PRIMARY,
        ),
        browserProtocol: window.location.protocol,
        browserHost: window.location.host,
      }),
      buildInitMessage: () => ({ type: "mic_test", language: languageRef.current }),
      onConnected: () => {
        void startMicCapture();
      },
      onJsonMessage: (msg, { connector: activeConnector }) => {
        if (handled) return;
        if (msg.type === "asr") {
          const data = msg.data as { results?: Array<{ text?: string }> } | undefined;
          const results = data?.results || [];
          if (results.length > 0 && results[0].text) {
            lastAsrText = results[0].text;
            setTranscript(lastAsrText);
            stopTtsPlayback();
            setPhase("listening");
          }
        } else if (msg.type === "asr_ended") {
          const text = ((msg.text as string) || lastAsrText).trim();
          if (text) {
            finish(text);
          }
        } else if (msg.type === "disconnected") {
          if (activeConnector.canFailover) {
            void activeConnector.failover("mic test relay disconnected");
          } else {
            finish(lastAsrText);
          }
        } else if (msg.type === "error") {
          const message = (msg.message as string) || "";
          if (
            isRecoverableRelayErrorMessage(message) &&
            activeConnector.canFailover
          ) {
            return;
          }
          finish(lastAsrText);
        } else if (msg.type === "timeout") {
          finish(lastAsrText);
        }
      },
      onPermanentFailure: () => {
        if (!handled) finish(lastAsrText);
      },
    });

    relayConnectorRef.current = connector;
    void connector.connect().catch(() => {
      if (!handled) finish(lastAsrText);
    });

    setTimeout(() => {
      if (!handled) finish(lastAsrText);
    }, 25000);
  }, [analyzeResponse, stopTtsPlayback]);

  const playTTS = useCallback(async () => {
    setError(null);
    setPhase("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError(tt("Unable to access microphone. Please check permissions.", "无法访问麦克风，请检查权限。"));
      setPhase("idle");
      return;
    }

    startListening(true);
    setPhase("playing");

    const msg = getMicTestMessage(language);

    // Try S2S streaming endpoint first (same voice as interview)
    try {
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch("/api/voice/tts-s2s", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, language: languageRef.current }),
        signal: abort.signal,
      });

      if (res.ok && res.body) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        audioCtxRef.current = ctx;
        const reader = res.body.getReader();
        let playTime = ctx.currentTime;
        let leftover: Uint8Array | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone || !value || value.length === 0) break;

          // Merge leftover bytes from previous chunk to maintain
          // float32 sample alignment (4 bytes per sample).
          let bytes: Uint8Array;
          if (leftover) {
            bytes = new Uint8Array(leftover.length + value.length);
            bytes.set(leftover);
            bytes.set(value, leftover.length);
            leftover = null;
          } else {
            bytes = value;
          }

          const remainder = bytes.length % 4;
          const usable = bytes.length - remainder;
          if (remainder > 0) {
            leftover = bytes.slice(usable);
          }
          if (usable === 0) continue;

          // Copy into a properly-aligned ArrayBuffer for Float32Array
          const aligned = new ArrayBuffer(usable);
          new Uint8Array(aligned).set(bytes.subarray(0, usable));
          const float32 = new Float32Array(aligned);

          if (float32.length === 0) continue;

          const buf = ctx.createBuffer(1, float32.length, 24000);
          buf.getChannelData(0).set(float32);
          const source = ctx.createBufferSource();
          source.buffer = buf;
          source.connect(ctx.destination);

          const startAt = Math.max(ctx.currentTime, playTime);
          source.start(startAt);
          playTime = startAt + buf.duration;
        }

        // Wait for all scheduled audio to finish, then listen
        const remaining = playTime - ctx.currentTime;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining * 1000 + 100));
        }
        ctx.close().catch(() => {});
        audioCtxRef.current = null;
        abortRef.current = null;
        if (relayConnectorRef.current?.isReady) {
          setPhase("listening");
        } else {
          startListening();
        }
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // S2S unavailable, fall back to browser SpeechSynthesis
    }

    fallbackToSpeechSynthesis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListening]);

  const fallbackToSpeechSynthesis = useCallback(() => {
    const speechSynthesisApi = getSpeechSynthesisApi();
    if (!speechSynthesisApi || typeof SpeechSynthesisUtterance === "undefined") {
      startListening();
      return;
    }

    setPhase("playing");
    const msg = getMicTestMessage(language);
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = getSpeechSynthesisLocale(language);
    utterance.onend = () => { if (relayConnectorRef.current?.isReady) { setPhase("listening"); } else { startListening(); } };
    utterance.onerror = () => { if (relayConnectorRef.current?.isReady) { setPhase("listening"); } else { startListening(); } };
    speechSynthesisApi.speak(utterance);
  }, [getSpeechSynthesisApi, startListening, language]);

  useEffect(() => {
    return () => {
      stopAll();
      getSpeechSynthesisApi()?.cancel();
    };
  }, [getSpeechSynthesisApi, stopAll]);

  const isBusy = phase === "requesting" || phase === "playing" || phase === "listening" || phase === "analyzing";

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-36 w-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/50">
            <AudioLines
              className={cn(
                "h-10 w-10 transition-colors",
                isBusy ? "text-primary" : "text-muted-foreground/30"
              )}
            />
            {phase === "playing" && (
              <div className="flex h-5 w-28 items-end justify-center gap-[3px]">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 animate-pulse rounded-full bg-primary"
                    style={{
                      height: `${4 + Math.random() * 14}px`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                ))}
              </div>
            )}
            {phase === "listening" && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  <span className="text-[11px] font-medium text-destructive">{tt("Listening...", "正在听…")}</span>
                </div>
                {transcript && (
                  <span className="max-w-[10rem] truncate text-[10px] text-muted-foreground">
                    &quot;{transcript}&quot;
                  </span>
                )}
              </div>
            )}
            {phase === "analyzing" && (
              <span className="text-[11px] text-muted-foreground">{tt("Analyzing...", "分析中…")}</span>
            )}
            {phase === "idle" && !done && (
              <span className="text-[11px] text-muted-foreground/50">
                {tt("Speaker & Microphone", "扬声器与麦克风")}
              </span>
            )}
            {done && !skipped && (
              <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                {tt("Audio confirmed", "音频已确认")}
              </span>
            )}
          </div>
          {phase === "idle" && !done && (
            <Button size="sm" onClick={playTTS} className="w-full">
              <Mic className="mr-1.5 h-3.5 w-3.5" />
              {tt("Test Microphone", "测试麦克风")}
            </Button>
          )}
          {phase === "requesting" && (
            <Button size="sm" disabled className="w-full">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              {tt("Requesting access...", "正在请求权限…")}
            </Button>
          )}
          {phase === "playing" && (
            <Button size="sm" variant="outline" onClick={() => { stopAll(); setPhase("idle"); }} className="w-full">
              {tt("Stop", "停止")}
            </Button>
          )}
          {phase === "listening" && (
            <Button size="sm" variant="outline" disabled className="w-full">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              {tt("Listening...", "正在听…")}
            </Button>
          )}
          {phase === "analyzing" && (
            <Button size="sm" disabled className="w-full">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              {tt("Analyzing...", "分析中…")}
            </Button>
          )}
          {phase === "confirm" && !done && (
            <Button size="sm" onClick={playTTS} className="w-full">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {tt("Play again", "再播放一次")}
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">
            {tt(
              "Test your speaker and microphone to ensure audio is working properly.",
              "测试扬声器和麦克风，确认音频工作正常。",
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {phase === "idle" && !done && tt(
              "Click \"Test Microphone\" to hear a message from the voice agent. Then speak your response to confirm the audio works — just like in the actual interview.",
              "点击「测试麦克风」，你会听到一段语音消息，请像正式面试一样大声回答以确认音频正常。",
            )}
            {phase === "requesting" && tt("Granting microphone access...", "正在授权麦克风…")}
            {phase === "playing" && tt("The voice agent is speaking — listen carefully...", "AI 正在说话，请仔细听…")}
            {phase === "listening" && tt('Please say "yes" or "I can hear you" to confirm.', "请说「是」或「我听到了」以确认。")}
            {phase === "analyzing" && tt("Checking your response...", "正在检查你的回答…")}
            {phase === "confirm" && !done && allowSkip && tt("We couldn't detect your voice. Try again, or ", "没有检测到声音，请再试一次，或者 ")}
            {phase === "confirm" && !done && allowSkip && (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowSkipDialog(true)}>
                {tt("skip this step", "跳过这一步")}
              </button>
            )}
            {phase === "confirm" && !done && allowSkip && tt(".", "。")}
            {phase === "confirm" && !done && !allowSkip && tt("We couldn't detect your voice. Please try again.", "没有检测到声音，请再试一次。")}
            {done && tt("Audio test passed. Your speaker and microphone are working.", "音频测试通过，扬声器和麦克风工作正常。")}
          </p>
          {error && (
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
              <button type="button" className="ml-auto font-medium underline" onClick={playTTS}>
                {tt("Retry", "重试")}
              </button>
            </div>
          )}
          {allowSkip && !error && phase === "idle" && !done && (
            <p className="text-xs text-muted-foreground">
              {tt("No microphone?", "没有麦克风？")}{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowSkipDialog(true)}>
                {tt("Skip", "跳过")}
              </button>
            </p>
          )}
          {!allowSkip && !error && phase === "idle" && !done && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {tt("Microphone is required for this interview.", "本场面试需要麦克风。")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center self-start pt-0.5">
          {done ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              <CheckCircle2 className="h-4 w-4" />
              {tt("Microphone", "麦克风")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2" />
              {tt("Microphone", "麦克风")}
            </span>
          )}
        </div>
      </CardContent>
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("Skip microphone test?", "跳过麦克风测试？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt(
                "Skipping the microphone test is not recommended. If your speaker or microphone is not working properly, it may affect your interview experience and results.",
                "不建议跳过麦克风测试。若扬声器或麦克风存在问题，可能影响面试体验和结果。",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("Go back", "返回")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPhase("idle"); setSkipped(true); onDone(); }}>
              {tt("Skip anyway", "仍要跳过")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ScreenCheck({
  done,
  onDone,
  allowSkip = true,
}: {
  done: boolean;
  onDone: () => void;
  allowSkip?: boolean;
}) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [error, setError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // getDisplayMedia is unavailable on iOS Safari and most mobile browsers
  const [isSupported, setIsSupported] = useState(true);
  const autoSkippedRef = useRef(false);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getDisplayMedia;
    setIsSupported(supported);
    if (!supported && !done && !autoSkippedRef.current) {
      autoSkippedRef.current = true;
      setScreenSkipped(true);
      onDone();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestShare = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Validate that the user shared the entire screen, not a tab or window
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings() as MediaTrackSettings & { displaySurface?: string };
      if (settings.displaySurface && settings.displaySurface !== "monitor") {
        stream.getTracks().forEach((t) => t.stop());
        setError(
          tt(
            'Please share your entire screen, not a window or tab. Click "Share Screen" and select "Entire Screen".',
            "请分享整个屏幕，而不是某个窗口或标签页。点击「分享屏幕」并选择「整个屏幕」。",
          ),
        );
        return;
      }

      const videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();

      await new Promise((r) => setTimeout(r, 300));

      const canvas = document.createElement("canvas");
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      canvas.getContext("2d")?.drawImage(videoEl, 0, 0);
      setThumbnail(canvas.toDataURL("image/jpeg", 0.7));

      // Keep the stream alive for the interview recording to reuse
      setStoredScreenStream(stream);
      videoEl.srcObject = null;
      onDone();
    } catch {
      setError(tt("Screen capture was denied or cancelled.", "屏幕共享被拒绝或已取消。"));
    }
  }, [onDone]);

  if (!isSupported) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Monitor className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{tt("Screen sharing unavailable", "屏幕共享不可用")}</p>
              <p className="text-xs text-muted-foreground">
                {tt(
                  "Screen sharing requires a desktop browser (Chrome recommended). This step has been automatically skipped on your device.",
                  "屏幕共享需要桌面浏览器（推荐 Chrome）。在你的设备上这一步已自动跳过。",
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center self-start pt-0.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              <CheckCircle2 className="h-4 w-4" />
              {tt("Skipped", "已跳过")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-36 w-44 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/50">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt="Screen capture preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ScreenShare className="h-10 w-10 text-muted-foreground/30" />
                <span className="text-[11px] text-muted-foreground/50">
                  {tt("Entire screen", "整个屏幕")}
                </span>
              </div>
            )}
          </div>
          {!done && (
            <Button size="sm" onClick={requestShare} className="w-full">
              <Monitor className="mr-1.5 h-3.5 w-3.5" />
              {tt("Share Screen", "分享屏幕")}
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">
            {tt("Screen capture requires authorization.", "屏幕共享需要授权。")}
          </p>
          <p className="text-xs text-muted-foreground">
            {isZh ? (
              <>点击「分享屏幕」后，在弹窗中选择 <span className="font-medium text-foreground">「整个屏幕」</span>，再点击「分享」。</>
            ) : (
              <>After clicking &quot;Share Screen&quot;, please select{" "}
              <span className="font-medium text-foreground">&quot;Entire Screen&quot;</span>{" "}
              in the pop-up window and click &quot;Share&quot;.</>
            )}
          </p>
          {error && (
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
              <button type="button" className="ml-auto font-medium underline" onClick={requestShare}>
                {tt("Retry", "重试")}
              </button>
            </div>
          )}
          {allowSkip && !error && !done && (
            <p className="text-xs text-muted-foreground">
              {tt("Can't share screen?", "无法共享屏幕？")}{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowSkipDialog(true)}>
                {tt("Skip", "跳过")}
              </button>
            </p>
          )}
          {!allowSkip && !error && !done && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {tt("Screen sharing is required for this interview.", "本场面试需要屏幕共享。")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center self-start pt-0.5">
          {done ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              <CheckCircle2 className="h-4 w-4" />
              {tt("Screen Capture", "屏幕共享")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2" />
              {tt("Screen Capture", "屏幕共享")}
            </span>
          )}
        </div>
      </CardContent>
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("Skip screen sharing?", "跳过屏幕共享？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt(
                "Skipping screen sharing is not recommended. Screen capture is used to monitor your interview environment. Skipping may affect your interview results.",
                "不建议跳过屏幕共享。它用于监控面试环境，跳过可能影响面试结果。",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("Go back", "返回")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setScreenSkipped(true); onDone(); }}>
              {tt("Skip anyway", "仍要跳过")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function IntervieweeOnboarding({
  interviewTitle,
  interviewDescription,
  questionCount,
  timeLimitMinutes,
  language,
  antiCheatingEnabled = false,
  voiceEnabled = false,
  chatEnabled = false,
  aiName = "AI Interviewer",
  questionTypes = [],
  onComplete,
}: IntervieweeOnboardingProps) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const tt = (en: string, zh: string) => (isZh ? zh : en);
  const [step, setStep] = useState<OnboardingStep>("info");
  const [agreed, setAgreed] = useState(false);

  const [cameraDone, setCameraDone] = useState(false);
  const [micDone, setMicDone] = useState(false);
  const [screenDone, setScreenDone] = useState(false);
  const [starting, setStarting] = useState(false);

  const allChecksDone = cameraDone && micDone && screenDone;

  const handleComplete = useCallback(() => {
    setStarting(true);
    onComplete();
  }, [onComplete]);

  const header = (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-1">
        <AuralLogo size={28} className="shrink-0" />
        <span className="font-heading text-base font-bold tracking-[2px]">HZ</span>
      </div>
    </header>
  );

  if (step === "info") {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        {header}
        <StepIndicator current="info" />
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 sm:px-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold">{interviewTitle}</h2>

              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <span className="font-medium">{tt("Description", "面试说明")}</span>
                  <p className="mt-1 text-muted-foreground">
                    {interviewDescription || tt("No additional description.", "暂无更多说明。")}
                  </p>
                </div>
              </div>

              <div className="mt-2 text-sm text-muted-foreground">
                {questionCount} {tt("questions", "道题")} &middot;{" "}
                {timeLimitMinutes
                  ? `${timeLimitMinutes} ${tt("min", "分钟")}`
                  : tt("No time limit", "不限时")}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="space-y-3 p-4 sm:p-6">
              <h3 className="font-semibold">{tt("Integrity Notices", "诚信须知")}</h3>
              {antiCheatingEnabled ? (
                <>
                  <div className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    {tt(
                      "To ensure fairness, the following integrity measures will be actively enforced throughout this session.",
                      "为保证公平，本场面试将持续执行以下诚信措施。",
                    )}
                  </div>
                  <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                    <li>{tt("To ensure that the interview runs properly, please use the latest version of Chrome.", "为保证面试正常运行，请使用最新版 Chrome 浏览器。")}</li>
                    <li>{tt("After completing your answers, please make sure that you have submitted them to all questions. Otherwise it will affect your results.", "答完后请确认所有题目都已提交，否则会影响结果。")}</li>
                    <li>
                      <span className="font-medium text-foreground">{tt("Tab switching and focus tracking:", "切屏与焦点监测：")}</span>{" "}
                      {isZh ? (
                        <>离开面试页面或切到其他窗口会被自动记录。如果离开超过 <span className="font-medium text-primary">3</span> 次，会话会被标记为待复核。</>
                      ) : (
                        <>Leaving the interview page or switching to another window will be automatically detected and recorded. If you leave more than <span className="font-medium text-primary">3</span> times, your session will be flagged for review.</>
                      )}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">{tt("External paste blocked:", "拦截外部粘贴：")}</span>{" "}
                      {tt("Pasting content from outside the interview page is not allowed. You can copy and paste freely within the page.", "不能从面试页面外粘贴内容，页面内复制粘贴不受限制。")}
                    </li>
                    <li>
                      <span className="font-medium text-foreground">{tt("Multiple screen detection:", "多屏检测：")}</span>{" "}
                      {tt("The system will detect if you have multiple monitors connected. Please unplug or turn off additional screens before starting.", "系统会检测是否连接了多个显示器，开始前请断开或关闭其它屏幕。")}
                    </li>
                    <li>{tt("This interview requires a camera to collect your registration photo and capture your behavior. All photos are privacy protected.", "本面试需要摄像头采集报名照片并记录行为，所有照片均做隐私保护。")}</li>
                    <li>{tt("The interview will screen capture throughout. Screen capture requires authorization.", "面试期间会全程屏幕共享，需要授权。")}</li>
                  </ol>
                </>
              ) : (
                <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  <li>{tt("To ensure that the interview runs properly, please use the latest version of Chrome.", "为保证面试正常运行，请使用最新版 Chrome 浏览器。")}</li>
                  <li>{tt("After completing your answers, please make sure that you have submitted them to all questions. Otherwise it will affect your results.", "答完后请确认所有题目都已提交，否则会影响结果。")}</li>
                  <li>{tt("Before the interview starts, please shut down any software or web page with ads, message pop-ups. Please do not leave the interview page during the whole process.", "面试开始前请关闭含弹窗、广告或消息提示的软件或网页。整个过程中请勿离开面试页面。")}</li>
                  <li>{tt("This interview requires a camera to collect your registration photo and capture your behavior. All photos are privacy protected.", "本面试需要摄像头采集报名照片并记录行为，所有照片均做隐私保护。")}</li>
                  <li>{tt("The interview will screen capture throughout. Screen capture requires authorization.", "面试期间会全程屏幕共享，需要授权。")}</li>
                </ol>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-col items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
              {tt("I agree to the above notice and interview guidelines", "我已阅读并同意上述须知与面试规范")}
            </label>
            <Button
              disabled={!agreed}
              onClick={() => setStep("checklist")}
              className="w-40"
            >
              {tt("Next", "下一步")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (starting) {
    return <PreparingScreen />;
  }

  if (step === "howItWorks") {
    const mode = voiceEnabled ? "voice" : "chat";

    const mockContext: InterviewContext = {
      title: interviewTitle,
      aiName: aiName ?? "AI Interviewer",
      aiTone: "professional",
      language: language ?? "en-US",
      followUpDepth: "medium",
      questions: Array.from({ length: questionCount }, (_, i) => ({
        text: `Question ${i + 1}`,
        type: questionTypes?.[i] ?? "OPEN_ENDED",
        order: i,
      })),
    };

    return (
      <IntervieweeTourProvider mode={mode}>
        <PreviewWrapper onReady={handleComplete}>
          {mode === "voice" ? (
            <VoiceInterface
              sessionId="__preview__"
              interviewId="__preview__"
              interviewTitle={interviewTitle}
              aiName={aiName ?? "AI Interviewer"}
              questionCount={questionCount}
              interviewContext={mockContext}
              durationMinutes={timeLimitMinutes ?? undefined}
              chatEnabled={chatEnabled}
              onComplete={() => {}}
              preview
            />
          ) : (
            <ChatInterface
              sessionId="__preview__"
              interview={{
                id: "__preview__",
                title: interviewTitle,
                aiName: aiName ?? "AI Interviewer",
                mode: "CHAT",
                questions: mockContext.questions.map((q, i) => ({
                  id: `preview-q-${i}`,
                  text: q.text,
                  type: q.type,
                })),
              }}
              durationMinutes={timeLimitMinutes ?? undefined}
              onComplete={() => {}}
              preview
            />
          )}
        </PreviewWrapper>
        <IntervieweeTourOverlay />
      </IntervieweeTourProvider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {header}
      <StepIndicator current="checklist" />
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pb-8">
        <CameraCheck done={cameraDone} onDone={() => setCameraDone(true)} allowSkip={!antiCheatingEnabled} />
        <MicCheck done={micDone} onDone={() => setMicDone(true)} language={language} allowSkip={!antiCheatingEnabled} />
        <ScreenCheck done={screenDone} onDone={() => setScreenDone(true)} allowSkip={!antiCheatingEnabled} />

        <div className="flex items-center justify-center gap-3 pt-4">
          <Button variant="outline" onClick={() => setStep("info")}>
            {tt("Back", "上一步")}
          </Button>
          <Button disabled={!allChecksDone} onClick={() => setStep("howItWorks")}>
            {tt("Next", "下一步")}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {tt("Chrome is recommended for a better experience.", "推荐使用 Chrome 浏览器以获得更好体验。")}
        </p>
      </div>
    </div>
  );
}

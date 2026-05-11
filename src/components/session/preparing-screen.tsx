"use client";

import { Loader2 } from "lucide-react";
import { AuralLogo } from "@/components/ui/aural-logo";
import { useAppLocale } from "@/components/app-locale-provider";

export function PreparingScreen() {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-6">
        <div className="flex items-center gap-1">
          <AuralLogo size={28} className="shrink-0" />
          <span className="font-heading text-base font-bold tracking-[2px]">AURAL</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium">
          {isZh ? "正在准备面试…" : "Preparing your interview..."}
        </p>
        <p className="text-sm text-muted-foreground">
          {isZh ? "马上就好。" : "This will only take a moment."}
        </p>
      </div>
    </div>
  );
}

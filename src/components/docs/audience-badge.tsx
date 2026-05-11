"use client";

import type { Audience } from "@/content/docs/types";
import { useAppLocale } from "@/components/app-locale-provider";

const config: Record<Audience, { label: string; labelZh: string; className: string }> = {
  creators: {
    label: "For Creators",
    labelZh: "面向出题方",
    className:
      "bg-mk-terracotta/10 text-mk-terracotta border-mk-terracotta/20",
  },
  interviewees: {
    label: "For Interviewees",
    labelZh: "面向候选人",
    className: "bg-mk-info/10 text-mk-info border-mk-info/20",
  },
  both: {
    label: "For Everyone",
    labelZh: "面向所有人",
    className: "bg-mk-success/10 text-mk-success border-mk-success/20",
  },
};

export function AudienceBadge({ audience }: { audience: Audience }) {
  const { locale } = useAppLocale();
  const isZh = locale === "zh";
  const { label, labelZh, className } = config[audience];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}
    >
      {isZh ? labelZh : label}
    </span>
  );
}

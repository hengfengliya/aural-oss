export const LANGUAGES = [
  { value: "en", label: "English", labelZh: "英文" },
  { value: "zh", label: "Chinese (中文)", labelZh: "中文" },
  { value: "es", label: "Spanish", labelZh: "西班牙语" },
  { value: "fr", label: "French", labelZh: "法语" },
] as const;

export const AI_TONES = [
  { value: "CASUAL", label: "Casual", labelZh: "随和" },
  { value: "PROFESSIONAL", label: "Professional", labelZh: "专业" },
  { value: "FORMAL", label: "Formal", labelZh: "正式" },
  { value: "FRIENDLY", label: "Friendly", labelZh: "友善" },
] as const;

export const FOLLOW_UP_DEPTHS = [
  { value: "LIGHT", label: "Light", description: "no follow-up", labelZh: "浅", descriptionZh: "不追问" },
  { value: "MODERATE", label: "Moderate", description: "1-2 follow-ups", labelZh: "中", descriptionZh: "1-2 次追问" },
  { value: "DEEP", label: "Deep", description: "3-5 follow-ups", labelZh: "深", descriptionZh: "3-5 次追问" },
] as const;

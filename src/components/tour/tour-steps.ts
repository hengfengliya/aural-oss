export interface TourStep {
  id: string;
  /** CSS selector for the target element (uses data-tour attribute) */
  selector: string;
  title: string;
  description: string;
  /** Chinese localization */
  titleZh?: string;
  descriptionZh?: string;
  /** URL pattern the step belongs to (exact match or prefix) */
  page: string;
  /** Where the tooltip appears relative to the target */
  placement: "top" | "bottom" | "left" | "right";
  /**
   * If set, clicking "Next" navigates to this URL before activating
   * the next step. Useful when the next step is on a different page.
   */
  advanceTo?: string;
  /** Wait for an element matching this selector before showing the step */
  waitFor?: string;
  /** If true, clicking the target does NOT auto-advance the tour */
  noAutoAdvance?: boolean;
  /**
   * CSS selector for an input/textarea. When set, "Next" is disabled
   * until the matched element has a non-empty value.
   */
  requireInput?: string;
  /**
   * CSS selector — auto-advance the tour when an element matching this
   * selector appears in the DOM (e.g. a dropdown menu item after opening).
   */
  advanceOnAppear?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "new-interview",
    selector: '[data-tour="new-interview"]',
    title: "Create a new interview",
    titleZh: "创建新面试",
    description:
      'Click **"+ New Interview"** to set up your first AI-powered interview.',
    descriptionZh:
      '点击 **"+ 新建面试"** 创建你的第一场 AI 面试。',
    page: "/dashboard",
    placement: "bottom",
  },
  {
    id: "interview-prompt",
    selector: '[data-tour="interview-prompt"]',
    title: "Describe your interview",
    titleZh: "描述你的面试",
    description:
      "**Type a description** of the interview you need. Be specific about the role and skills you want to assess.",
    descriptionZh:
      "**输入面试描述**，说清楚岗位和想考察的能力。",
    page: "/interviews/new",
    placement: "bottom",
    noAutoAdvance: true,
    requireInput: "#ai-description",
  },
  {
    id: "generate-interview",
    selector: '[data-tour="generate-interview"]',
    title: "Generate with AI",
    titleZh: "用 AI 生成",
    description:
      'Click **"Generate"** to let AI create a complete interview structure with questions and assessment criteria.',
    descriptionZh:
      '点击 **"生成面试"**，AI 会自动生成完整的题目和评分标准。',
    page: "/interviews/new",
    placement: "top",
  },
  {
    id: "accept-create",
    selector: '[data-tour="accept-create"]',
    title: "Accept & create",
    titleZh: "确认并创建",
    description:
      'Review the AI-generated questions, then click **"Accept & create"** to create the interview.',
    descriptionZh:
      '检查 AI 生成的题目，然后点击 **"确认并创建"** 完成创建。',
    page: "/interviews/new",
    placement: "top",
    waitFor: '[data-tour="accept-create"]',
  },
  {
    id: "add-session",
    selector: '[data-tour="add-session"]',
    title: "Add candidates",
    titleZh: "添加候选人",
    description:
      'Click **"+ Add"** to invite candidates to your interview.',
    descriptionZh:
      '点击 **"+ 添加"** 邀请候选人参加面试。',
    page: "/edit/sessions",
    placement: "top",
    noAutoAdvance: true,
    advanceOnAppear: '[data-tour="create-individually"]',
  },
  {
    id: "create-individually",
    selector: '[data-tour="create-individually"]',
    title: "Create individually",
    titleZh: "单个添加",
    description:
      'Select **"Create individually"** to add a new candidate to your interview.',
    descriptionZh:
      '选择 **"单个添加"** 给面试添加一位候选人。',
    page: "/edit/sessions",
    placement: "left",
    waitFor: '[data-tour="create-individually"]',
  },
  {
    id: "save-candidate",
    selector: '[data-tour="save-candidate"]',
    title: "Save candidate details",
    titleZh: "保存候选人信息",
    description:
      'Fill in the candidate\'s name and details, then click **"Save and add"**.',
    descriptionZh:
      '填写候选人姓名和详情，然后点击 **"保存并添加"**。',
    page: "/edit/sessions",
    placement: "left",
    noAutoAdvance: true,
    waitFor: '[data-tour="save-candidate"]',
    advanceOnAppear: '[data-tour="copy-link"]',
  },
  {
    id: "copy-link",
    selector: '[data-tour="copy-link"]',
    title: "Share the invite link",
    titleZh: "分享面试链接",
    description:
      'Click **"Copy link"** to copy the interview invite URL. Share it with your candidate to start the interview.',
    descriptionZh:
      '点击 **"复制链接"**，把面试地址发给候选人开始面试。',
    page: "/edit/sessions",
    placement: "left",
    waitFor: '[data-tour="copy-link"]',
  },
];

export const TOUR_STORAGE_KEY = "aural_onboarding_tour";
export const TOUR_EDIT_URL_KEY = "aural_tour_last_edit_url";

export interface TourState {
  currentStep: number;
  completed: boolean;
  dismissed: boolean;
}

export function getStoredTourState(): TourState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredTourState(state: TourState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
}

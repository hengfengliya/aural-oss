export interface IntervieweeTourStep {
  id: string;
  selector: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  placement: "top" | "bottom" | "left" | "right";
  /** When true, this step is skipped if the target element is not in the DOM */
  optional?: boolean;
}

export const VOICE_TOUR_STEPS: IntervieweeTourStep[] = [
  {
    id: "voice-status",
    selector: '[data-tour="voice-status"]',
    title: "Your AI Interviewer",
    titleZh: "AI 面试官",
    description:
      "This is your AI interviewer. It will speak to you and listen to your responses in real time.",
    descriptionZh:
      "这是你的 AI 面试官。它会实时说话并听取你的回答。",
    placement: "right",
  },
  {
    id: "voice-mic",
    selector: '[data-tour="voice-mic"]',
    title: "Microphone Control",
    titleZh: "麦克风",
    description:
      "Click to mute or unmute your microphone. Speak naturally when unmuted — the AI will respond automatically.",
    descriptionZh:
      "点击可以静音或解除静音。开麦后正常说话即可，AI 会自动回应。",
    placement: "top",
  },
  {
    id: "voice-chat",
    selector: '[data-tour="voice-chat"]',
    title: "Text Chat Channel",
    titleZh: "文字通道",
    description:
      "Prefer typing? Open the chat panel to send text messages alongside the voice conversation.",
    descriptionZh:
      "想打字？打开聊天面板，可以在语音对话之外用文字补充。",
    placement: "top",
    optional: true,
  },
  {
    id: "voice-tools",
    selector: '[data-tour="voice-tools"]',
    title: "Whiteboard & Code Editor",
    titleZh: "白板与代码编辑器",
    description:
      "Use the Whiteboard for diagrams or the Code Editor for coding questions. They open as side panels.",
    descriptionZh:
      "用白板画图，或用代码编辑器写代码题。点击后会从侧边展开。",
    placement: "top",
  },
  {
    id: "voice-transcript",
    selector: '[data-tour="voice-transcript"]',
    title: "Conversation Transcript",
    titleZh: "对话记录",
    description:
      "Your full conversation transcript appears here. Use it to review what was said.",
    descriptionZh:
      "完整的对话记录会显示在这里，方便你回看刚刚的内容。",
    placement: "left",
  },
  {
    id: "voice-progress",
    selector: '[data-tour="voice-progress"]',
    title: "Question Progress",
    titleZh: "进度",
    description:
      "Track your progress here. Use Previous/Next to navigate between questions, or click End when finished.",
    descriptionZh:
      "在这里查看进度。用「上一题/下一题」切换问题，结束时点「结束」。",
    placement: "top",
  },
];

export const CHAT_TOUR_STEPS: IntervieweeTourStep[] = [
  {
    id: "chat-question",
    selector: '[data-tour="chat-question"]',
    title: "Current Question",
    titleZh: "当前题目",
    description:
      "The current question appears here. The AI interviewer will guide you through each one and may ask follow-ups.",
    descriptionZh:
      "当前题目显示在这里。AI 面试官会逐题引导你，并可能追问。",
    placement: "bottom",
  },
  {
    id: "chat-input",
    selector: '[data-tour="chat-input"]',
    title: "Type Your Response",
    titleZh: "输入回答",
    description:
      "Type your answer here and press Enter or click Send. Take your time to compose thoughtful responses.",
    descriptionZh:
      "在这里输入回答，按回车或点「发送」。可以慢慢写，把回答想清楚。",
    placement: "top",
  },
  {
    id: "chat-tools",
    selector: '[data-tour="chat-tools"]',
    title: "Whiteboard & Code Editor",
    titleZh: "白板与代码编辑器",
    description:
      "Open the Whiteboard for diagrams or the Code Editor for coding questions. They appear above the chat.",
    descriptionZh:
      "打开白板画图，或用代码编辑器答代码题。它们会显示在聊天上方。",
    placement: "bottom",
  },
  {
    id: "chat-progress",
    selector: '[data-tour="chat-progress"]',
    title: "Question Progress",
    titleZh: "进度",
    description:
      "Track your progress with the progress bar. The question counter shows how far along you are.",
    descriptionZh:
      "用进度条跟踪进度，计数器会显示已经答到第几题。",
    placement: "bottom",
  },
  {
    id: "chat-timer",
    selector: '[data-tour="chat-timer"]',
    title: "Timer & Navigation",
    titleZh: "计时与导航",
    description:
      "Keep an eye on the timer if one is set. Use the back arrow to revisit previous questions.",
    descriptionZh:
      "如果有计时，注意一下倒计时。点返回箭头可以回看之前的题目。",
    placement: "bottom",
  },
];

export const TOUR_STORAGE_KEY = "aural_interviewee_tour_done";

export function markTourCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}

export interface TemplateQuestion {
  text: string;
  textZh?: string;
  description?: string;
  descriptionZh?: string;
  type: "OPEN_ENDED" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "CODING" | "WHITEBOARD";
  options?: unknown;
  optionsZh?: { label: string; value: string }[];
  order: number;
  probeOnShort?: boolean;
  isRequired?: boolean;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  objective: string;
  objectiveZh?: string;
  icon: string;
  aiTone: "CASUAL" | "PROFESSIONAL" | "FORMAL" | "FRIENDLY";
  followUpDepth: "LIGHT" | "MODERATE" | "DEEP";
  assessmentCriteria: {
    name: string;
    nameZh?: string;
    description: string;
    descriptionZh?: string;
  }[];
  chatEnabled: boolean;
  voiceEnabled: boolean;
  videoEnabled: boolean;
  timeLimitMinutes?: number;
  questions: TemplateQuestion[];
}

export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  {
    id: "technical-screen",
    title: "Technical Screen",
    titleZh: "技术初筛",
    description: "Evaluate software engineering fundamentals with a mix of coding, system design, and problem-solving questions.",
    descriptionZh: "结合编程题、系统设计与问题解决题，考察软件工程基础。",
    objective: "Assess the candidate's technical depth, coding ability, and approach to system design within a structured screening format.",
    objectiveZh: "在结构化的初筛流程中评估候选人的技术深度、编码能力和系统设计思路。",
    icon: "Code2",
    aiTone: "PROFESSIONAL",
    followUpDepth: "DEEP",
    assessmentCriteria: [
      { name: "Problem Solving", nameZh: "问题解决", description: "Ability to break down complex problems, identify edge cases, and arrive at efficient solutions.", descriptionZh: "能拆解复杂问题、识别边界情况，并得出高效的解决方案。" },
      { name: "Code Quality", nameZh: "代码质量", description: "Clean, readable code with appropriate use of data structures, algorithms, and design patterns.", descriptionZh: "代码整洁可读，能恰当使用数据结构、算法和设计模式。" },
      { name: "System Design", nameZh: "系统设计", description: "Understanding of scalable architecture, trade-offs, and component interactions.", descriptionZh: "理解可扩展架构、权衡取舍和组件交互。" },
      { name: "Technical Communication", nameZh: "技术沟通", description: "Clarity in explaining technical decisions, trade-offs, and reasoning.", descriptionZh: "能清晰解释技术决策、权衡过程和推理思路。" },
    ],
    chatEnabled: true,
    voiceEnabled: true,
    videoEnabled: true,
    timeLimitMinutes: 30,
    questions: [
      { order: 0, text: "Walk me through a recent project where you solved a challenging technical problem. What was the problem, your approach, and the outcome?", textZh: "请讲一下你最近解决过的一个有挑战的技术问题——问题是什么、你的思路、最终结果如何？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 1, text: "Given an array of integers, write a function that returns the length of the longest consecutive sequence. For example, [100, 4, 200, 1, 3, 2] should return 4 (the sequence 1, 2, 3, 4).", textZh: "给定一个整数数组，写一个函数返回最长连续序列的长度。例如 [100, 4, 200, 1, 3, 2] 应返回 4（即序列 1, 2, 3, 4）。", description: "Focus on time complexity — an O(n) solution is expected.", descriptionZh: "重点关注时间复杂度——期望给出 O(n) 解法。", type: "CODING", probeOnShort: true, isRequired: true },
      { order: 2, text: "How would you design a URL shortening service like bit.ly? Describe the key components, storage strategy, and how you would handle high traffic.", textZh: "如何设计一个类似 bit.ly 的短链服务？请说明核心组件、存储策略以及如何应对高流量。", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 3, text: "Which of the following best describes the time complexity of inserting an element into a balanced binary search tree?", textZh: "向平衡二叉搜索树中插入元素的时间复杂度是？", type: "SINGLE_CHOICE", options: [{ label: "O(1)", value: "O(1)" }, { label: "O(log n)", value: "O(log n)" }, { label: "O(n)", value: "O(n)" }, { label: "O(n log n)", value: "O(n log n)" }], optionsZh: [{ label: "O(1)", value: "O(1)" }, { label: "O(log n)", value: "O(log n)" }, { label: "O(n)", value: "O(n)" }, { label: "O(n log n)", value: "O(n log n)" }], isRequired: true },
      { order: 4, text: "Describe your experience with CI/CD pipelines. How do you ensure code quality and reliable deployments?", textZh: "请描述你使用 CI/CD 流水线的经验，如何保证代码质量和部署稳定性？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
    ],
  },
  {
    id: "behavioral",
    title: "Behavioral Interview",
    titleZh: "行为面试",
    description: "Explore leadership, teamwork, and communication skills through structured behavioral questions.",
    descriptionZh: "通过结构化的行为问题，考察领导力、团队协作与沟通能力。",
    objective: "Understand the candidate's past behavior in professional situations to predict future performance in collaboration, leadership, and conflict resolution.",
    objectiveZh: "通过候选人过往的职场行为预测未来在协作、领导和冲突处理上的表现。",
    icon: "Users",
    aiTone: "FRIENDLY",
    followUpDepth: "MODERATE",
    assessmentCriteria: [
      { name: "Leadership", nameZh: "领导力", description: "Demonstrates initiative, influence, and the ability to guide others toward shared goals.", descriptionZh: "展现主动性、影响力，并能带领他人朝共同目标推进。" },
      { name: "Teamwork & Collaboration", nameZh: "团队协作", description: "Works effectively with others, shares credit, and navigates interpersonal dynamics.", descriptionZh: "能与他人高效协作，懂得分享功劳，并妥善处理人际关系。" },
      { name: "Adaptability", nameZh: "适应力", description: "Responds constructively to change, feedback, and ambiguous situations.", descriptionZh: "能积极应对变化、反馈和不确定情境。" },
      { name: "Communication", nameZh: "沟通能力", description: "Articulates ideas clearly, listens actively, and adjusts style to the audience.", descriptionZh: "表达清晰、能主动倾听，并能根据对象调整沟通方式。" },
    ],
    chatEnabled: true,
    voiceEnabled: true,
    videoEnabled: true,
    timeLimitMinutes: 30,
    questions: [
      { order: 0, text: "Tell me about a time you had to influence a decision without having direct authority. How did you approach it?", textZh: "请举一个例子：当时你没有直接决策权，但需要影响一个决策，你是怎么做的？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 1, text: "Describe a situation where you received critical feedback. How did you respond, and what did you change?", textZh: "请描述一次你收到批评性反馈的经历——你当时是如何回应的，后来做了哪些改变？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 2, text: "Give an example of a time you had to manage competing priorities with a tight deadline. What trade-offs did you make?", textZh: "请举一个例子：在紧迫的截止时间下你需要处理相互冲突的优先级，你做了哪些取舍？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 3, text: "How do you prefer to receive feedback from your manager?", textZh: "你更希望以哪种方式从主管那里获得反馈？", type: "SINGLE_CHOICE", options: [{ label: "Regular 1-on-1 meetings", value: "regular_1on1" }, { label: "Written feedback after milestones", value: "written_milestones" }, { label: "Real-time, in the moment", value: "realtime" }, { label: "Formal periodic reviews", value: "formal_reviews" }], optionsZh: [{ label: "定期 1 对 1 会议", value: "regular_1on1" }, { label: "里程碑后书面反馈", value: "written_milestones" }, { label: "实时即时反馈", value: "realtime" }, { label: "正式的周期性评估", value: "formal_reviews" }], isRequired: true },
      { order: 4, text: "Tell me about a project that didn't go as planned. What happened, and what would you do differently?", textZh: "请讲一个没有按计划进行的项目——当时发生了什么，如果重来你会怎么做？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
    ],
  },
  {
    id: "user-research",
    title: "User Research",
    titleZh: "用户调研",
    description: "Uncover user behaviors, pain points, and unmet needs through open-ended discovery questions.",
    descriptionZh: "通过开放式探索问题，挖掘用户行为、痛点和未被满足的需求。",
    objective: "Gain deep qualitative insights into how users interact with the product, what frustrates them, and what opportunities exist for improvement.",
    objectiveZh: "深入获取定性洞察：用户如何使用产品、被什么困扰、有哪些改进机会。",
    icon: "Search",
    aiTone: "CASUAL",
    followUpDepth: "DEEP",
    assessmentCriteria: [
      { name: "Depth of Insight", nameZh: "洞察深度", description: "Provides specific, detailed examples rather than vague generalizations about their experience.", descriptionZh: "能提供具体、详细的案例，而不是笼统泛泛的描述。" },
      { name: "Pain Point Clarity", nameZh: "痛点清晰度", description: "Clearly articulates frustrations and unmet needs with concrete context.", descriptionZh: "能结合具体情境清晰表达困扰和未被满足的需求。" },
      { name: "Workflow Awareness", nameZh: "工作流认知", description: "Demonstrates understanding of their own processes, tools, and workarounds.", descriptionZh: "对自己的工作流程、工具和绕行方案有清晰理解。" },
      { name: "Openness & Honesty", nameZh: "开放与坦诚", description: "Shares genuine feedback, including negative experiences, without hesitation.", descriptionZh: "愿意坦诚分享真实反馈，包括负面体验。" },
    ],
    chatEnabled: true,
    voiceEnabled: true,
    videoEnabled: true,
    timeLimitMinutes: 30,
    questions: [
      { order: 0, text: "Walk me through a typical day when you use our product (or a similar tool). What are you trying to accomplish?", textZh: "请讲一个使用我们产品（或类似工具）的典型日常——你在尝试完成什么任务？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 1, text: "What's the most frustrating part of your current workflow? Can you describe a specific instance?", textZh: "你当前工作流程中最让你抓狂的部分是什么？能举一个具体例子吗？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 2, text: "If you could change one thing about the product, what would it be and why?", textZh: "如果只能改进产品的一个地方，你会改什么？为什么？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 3, text: "How do you currently work around limitations you've encountered? Describe any hacks or alternative tools you use.", textZh: "你目前是怎么绕开遇到的限制的？有什么小技巧或者替代工具？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 4, text: "What would make you recommend this product to a colleague? What's currently holding you back?", textZh: "什么情况下你会把这个产品推荐给同事？现在又是什么阻止你这么做？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
    ],
  },
  {
    id: "case-study",
    title: "Case Study",
    titleZh: "案例分析",
    description: "Test analytical thinking and structured problem-solving through a realistic business or product scenario.",
    descriptionZh: "用一个真实的业务或产品场景，测试结构化分析和问题解决能力。",
    objective: "Evaluate the candidate's ability to break down ambiguous problems, structure an approach, and communicate a recommendation under constraints.",
    objectiveZh: "评估候选人在约束条件下拆解模糊问题、搭建分析框架并给出建议的能力。",
    icon: "BrainCircuit",
    aiTone: "PROFESSIONAL",
    followUpDepth: "DEEP",
    assessmentCriteria: [
      { name: "Analytical Thinking", nameZh: "分析思维", description: "Breaks down ambiguous problems into structured components and identifies key drivers.", descriptionZh: "能把模糊问题拆解为结构化要素，并识别关键驱动因素。" },
      { name: "Prioritization", nameZh: "优先级判断", description: "Distinguishes high-impact areas from noise and focuses investigation accordingly.", descriptionZh: "能区分高影响因素和噪音，把精力放在重点上。" },
      { name: "Recommendation Quality", nameZh: "建议质量", description: "Proposes actionable, well-reasoned solutions backed by data or logic.", descriptionZh: "能基于数据或逻辑提出可执行、有说服力的方案。" },
      { name: "Communication & Structure", nameZh: "沟通与结构", description: "Presents analysis in a clear, logical framework that is easy to follow.", descriptionZh: "能用清晰的逻辑框架呈现分析过程，让人易于理解。" },
    ],
    chatEnabled: true,
    voiceEnabled: true,
    videoEnabled: true,
    timeLimitMinutes: 40,
    questions: [
      { order: 0, text: "A mid-size e-commerce company has seen a 15% drop in conversion rate over the last quarter. What framework would you use to diagnose the root cause?", textZh: "一家中型电商公司过去一个季度转化率下降了 15%。你会用什么框架来诊断根因？", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 1, text: "Based on the scenario above, sketch a decision tree or flow diagram showing how you would prioritize which areas to investigate first.", textZh: "基于上述场景，画一个决策树或流程图，展示你会如何排序优先调查的领域。", type: "WHITEBOARD", probeOnShort: true, isRequired: true },
      { order: 2, text: "Which of the following metrics would you prioritize first when investigating the conversion drop?", textZh: "调查转化率下降时，你会优先关注下面哪些指标？", type: "MULTIPLE_CHOICE", options: [{ label: "Traffic source breakdown", value: "traffic_source" }, { label: "Funnel drop-off rates by step", value: "funnel_dropoff" }, { label: "Average order value trend", value: "aov_trend" }, { label: "Page load time by device", value: "page_load" }, { label: "Customer support ticket volume", value: "support_tickets" }], optionsZh: [{ label: "流量来源拆解", value: "traffic_source" }, { label: "漏斗各步骤流失率", value: "funnel_dropoff" }, { label: "客单价趋势", value: "aov_trend" }, { label: "各设备页面加载时长", value: "page_load" }, { label: "客服工单数量", value: "support_tickets" }], isRequired: true },
      { order: 3, text: "Suppose your analysis reveals that mobile checkout abandonment increased 25%. Propose a concrete plan to address this, including what you'd measure to validate success.", textZh: "假设分析显示移动端结账流失率上升了 25%。请提出一个具体的改进方案，并说明你会用哪些指标验证效果。", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
    ],
  },
  {
    id: "screening-call",
    title: "Screening Call",
    titleZh: "初筛电话",
    description: "A quick initial screen to verify basic qualifications, motivation, and communication skills.",
    descriptionZh: "快速初筛：核对基本资历、求职动机和沟通能力。",
    objective: "Efficiently determine whether the candidate meets the minimum bar for the role and should advance to the next interview stage.",
    objectiveZh: "高效判断候选人是否达到岗位最低门槛、是否值得进入下一轮面试。",
    icon: "Briefcase",
    aiTone: "FRIENDLY",
    followUpDepth: "LIGHT",
    assessmentCriteria: [
      { name: "Role Fit", nameZh: "岗位匹配度", description: "Background and experience align with the position's core requirements.", descriptionZh: "背景和经验与岗位核心要求匹配。" },
      { name: "Motivation", nameZh: "求职动机", description: "Demonstrates genuine interest in the role and a clear reason for applying.", descriptionZh: "对岗位有真实兴趣，并能清晰说明应聘原因。" },
      { name: "Communication", nameZh: "沟通能力", description: "Expresses ideas concisely and professionally in a conversational setting.", descriptionZh: "在对话中能简洁、专业地表达想法。" },
      { name: "Availability & Logistics", nameZh: "到岗与条件", description: "Timeline, salary expectations, and work arrangement preferences are compatible.", descriptionZh: "到岗时间、薪资期望和工作方式与岗位条件相符。" },
    ],
    chatEnabled: true,
    voiceEnabled: true,
    videoEnabled: true,
    timeLimitMinutes: 20,
    questions: [
      { order: 0, text: "Tell me briefly about your background and what drew you to this role.", textZh: "请简单介绍一下你的背景，以及是什么吸引你来应聘这个岗位。", type: "OPEN_ENDED", probeOnShort: true, isRequired: true },
      { order: 1, text: "What is your current employment status?", textZh: "你目前的求职状态是？", type: "SINGLE_CHOICE", options: [{ label: "Employed — actively looking", value: "employed_looking" }, { label: "Employed — open to opportunities", value: "employed_open" }, { label: "Between roles", value: "between_roles" }, { label: "Freelancing / contracting", value: "freelancing" }], optionsZh: [{ label: "在职 — 正在主动求职", value: "employed_looking" }, { label: "在职 — 看机会中", value: "employed_open" }, { label: "目前空窗", value: "between_roles" }, { label: "自由职业 / 外包", value: "freelancing" }], isRequired: true },
      { order: 2, text: "What are your salary expectations for this role?", textZh: "你对这个岗位的薪资期望是？", type: "OPEN_ENDED", probeOnShort: false, isRequired: true },
      { order: 3, text: "When would you be available to start if offered the position?", textZh: "如果拿到 offer，你最快什么时候可以到岗？", type: "OPEN_ENDED", probeOnShort: false, isRequired: true },
      { order: 4, text: "Is there anything about the role or company you'd like to ask about?", textZh: "关于岗位或公司，你有什么想问的吗？", type: "OPEN_ENDED", probeOnShort: false, isRequired: false },
    ],
  },
];

export type AppLocale = "en" | "zh";

export function pickTemplateLocale(
  template: InterviewTemplate,
  locale: AppLocale,
): {
  title: string;
  description: string;
  objective: string;
  assessmentCriteria: { name: string; description: string }[];
  questions: {
    text: string;
    description?: string;
    type: TemplateQuestion["type"];
    options?: unknown;
    order: number;
    probeOnShort?: boolean;
    isRequired?: boolean;
  }[];
} {
  const isZh = locale === "zh";
  return {
    title: isZh && template.titleZh ? template.titleZh : template.title,
    description: isZh && template.descriptionZh ? template.descriptionZh : template.description,
    objective: isZh && template.objectiveZh ? template.objectiveZh : template.objective,
    assessmentCriteria: template.assessmentCriteria.map((c) => ({
      name: isZh && c.nameZh ? c.nameZh : c.name,
      description: isZh && c.descriptionZh ? c.descriptionZh : c.description,
    })),
    questions: template.questions.map((q) => ({
      text: isZh && q.textZh ? q.textZh : q.text,
      description: isZh && q.descriptionZh ? q.descriptionZh : q.description,
      type: q.type,
      options: isZh && q.optionsZh ? q.optionsZh : q.options,
      order: q.order,
      probeOnShort: q.probeOnShort,
      isRequired: q.isRequired,
    })),
  };
}

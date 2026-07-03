import { generateFestivalPlan, generateTravelPlan } from "./budget";
import { generateMonthlyInsight } from "./insights";
import type { WorkspaceData } from "./types";

export const demoContacts = [
  {
    id: "c-daughter",
    name: "李小满",
    relation: "女儿",
    labels: ["家人", "儿童"],
    birthday: "2021-07-10",
    calendarType: "solar" as const,
    preferences: [
      { category: "gift" as const, label: "粉色乐高", source: "manual" as const, confidence: 0.96 },
      { category: "food" as const, label: "草莓蛋糕", source: "manual" as const, confidence: 0.92 },
      { category: "avoid" as const, label: "芒果过敏", source: "manual" as const, confidence: 1 },
    ],
    compliance: {
      riskTags: [],
      policyNote: "家庭关系，无商务合规限制。",
    },
    lastInteractionAt: "2026-06-21T11:20:00+08:00",
    aiMemoryHealth: 94,
  },
  {
    id: "c-client",
    name: "周明",
    relation: "重要客户",
    labels: ["重要客户", "国企高管"],
    birthday: "1979-10-18",
    calendarType: "solar" as const,
    preferences: [
      { category: "food" as const, label: "不吃香菜", source: "ai" as const, confidence: 0.87 },
      { category: "hobby" as const, label: "高尔夫", source: "manual" as const, confidence: 0.81 },
      { category: "gift" as const, label: "实用办公类", source: "receipt" as const, confidence: 0.74 },
    ],
    compliance: {
      riskTags: ["国企高管"],
      giftLimitCny: 200,
      hospitalityLimitCny: 500,
      policyNote: "触发商务合规限制：礼品建议不超过 200 元，宴请建议不超过 500 元。",
    },
    lastInteractionAt: "2026-06-28T19:00:00+08:00",
    aiMemoryHealth: 86,
  },
  {
    id: "c-mother",
    name: "陈兰",
    relation: "母亲",
    labels: ["家人", "长辈"],
    birthday: "1962-08-15",
    calendarType: "lunar" as const,
    preferences: [
      { category: "food" as const, label: "低糖", source: "manual" as const, confidence: 0.93 },
      { category: "hobby" as const, label: "体检提醒", source: "ai" as const, confidence: 0.78 },
    ],
    compliance: {
      riskTags: [],
      policyNote: "家庭关系，无商务合规限制。",
    },
    lastInteractionAt: "2026-06-25T08:30:00+08:00",
    aiMemoryHealth: 89,
  },
];

export const demoEvents = [
  {
    id: "e-daughter-birthday",
    title: "李小满5岁生日",
    date: "2026-07-10",
    contactId: "c-daughter",
    calendarType: "solar" as const,
    rrule: "RRULE:FREQ=YEARLY",
    reminderLevel: "level_2" as const,
    status: "scheduled" as const,
    budgetCny: 2000,
    source: "ai" as const,
  },
  {
    id: "e-client-dinner",
    title: "周明客户宴请",
    date: "2026-07-03",
    contactId: "c-client",
    location: "广州天河",
    calendarType: "solar" as const,
    reminderLevel: "level_1" as const,
    status: "scheduled" as const,
    budgetCny: 500,
    source: "manual" as const,
  },
  {
    id: "e-mortgage",
    title: "房贷扣款",
    date: "2026-07-02",
    calendarType: "solar" as const,
    reminderLevel: "level_1" as const,
    status: "confirmed" as const,
    budgetCny: 12800,
    source: "bill" as const,
  },
];

export const demoTransactions = [
  {
    id: "t-mortgage",
    title: "房贷",
    amountCny: 12800,
    category: "fixed" as const,
    occurredAt: "2026-06-30",
    source: "sms" as const,
  },
  {
    id: "t-gift",
    title: "端午礼盒",
    amountCny: 468,
    category: "relationship" as const,
    contactId: "c-client",
    occurredAt: "2026-06-18",
    source: "receipt" as const,
  },
  {
    id: "t-travel",
    title: "上海差旅",
    amountCny: 3420,
    category: "travel" as const,
    occurredAt: "2026-06-22",
    source: "manual" as const,
  },
  {
    id: "t-food",
    title: "日常餐饮",
    amountCny: 2180,
    category: "daily" as const,
    occurredAt: "2026-06-29",
    source: "ai" as const,
  },
];

const festivalPlan = generateFestivalPlan(demoEvents[0], demoContacts[0], 2000);
const travelPlan = generateTravelPlan({
  title: "广州商务差旅方案",
  startDate: "2026-07-08",
  endDate: "2026-07-10",
  destination: "广州",
  dailyLimitCny: 2400,
});

export const demoWorkspace: WorkspaceData = {
  contacts: demoContacts,
  events: demoEvents,
  budgets: [
    { id: "b-fixed", label: "刚需固定", category: "fixed", totalCny: 18000, spentCny: 12800, period: "2026-07" },
    { id: "b-relationship", label: "人情关怀", category: "relationship", totalCny: 6000, spentCny: 2468, period: "2026-07" },
    { id: "b-travel", label: "差旅出行", category: "travel", totalCny: 12000, spentCny: 3420, period: "2026-07" },
    { id: "b-elastic", label: "日常弹性", category: "elastic", totalCny: 8000, spentCny: 2180, period: "2026-07" },
  ],
  plans: [festivalPlan, travelPlan],
  captures: [],
  transactions: demoTransactions,
  recurringBills: [
    { id: "rb-mortgage", title: "房贷", amountCny: 12800, dueDay: 2, accountLabel: "招商银行尾号 8621", reminderLevel: "level_1", enabled: true },
    { id: "rb-phone", title: "手机/宽带", amountCny: 328, dueDay: 18, accountLabel: "家庭通信账户", reminderLevel: "level_2", enabled: true },
  ],
  notificationLogs: [
    {
      id: "n-1",
      eventId: "e-mortgage",
      title: "房贷扣款",
      channel: "push",
      status: "confirmed",
      level: "level_1",
      sentAt: "2026-07-01T08:30:00+08:00",
      acknowledgedAt: "2026-07-01T08:37:00+08:00",
      providerMessage: "用户已确认，停止短信与语音升级。",
    },
    {
      id: "n-2",
      eventId: "e-client-dinner",
      title: "周明客户宴请",
      channel: "sms",
      status: "sent",
      level: "level_1",
      sentAt: "2026-07-01T09:00:00+08:00",
      providerMessage: "MockSMS 已发送。",
    },
  ],
  aiMemories: [
    { id: "m-1", contactId: "c-client", content: "周明不吃香菜，偏好安静包间。", source: "ai", confidence: 0.87 },
    { id: "m-2", contactId: "c-daughter", content: "李小满喜欢粉色乐高，芒果过敏。", source: "manual", confidence: 0.98 },
  ],
  privacy: {
    piiMasking: true,
    cloudModelEnabled: false,
    webPushEnabled: true,
    smsEnabled: true,
    voiceCallEnabled: false,
    thirdPartyLinksEnabled: true,
    notificationPhone: "13800000000",
  },
  insight: generateMonthlyInsight({
    period: "2026-06",
    transactions: demoTransactions,
    recurringBills: [
      { id: "rb-mortgage", title: "房贷", amountCny: 12800, dueDay: 2, accountLabel: "招商银行尾号 8621", reminderLevel: "level_1", enabled: true },
    ],
    nextMonthEvents: demoEvents,
  }),
};

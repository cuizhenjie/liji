import { addDays, differenceInCalendarDays, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

import type { CalendarEvent, Contact, WorkspaceData } from "./types";

export type LevelTwoRecommendationCard = {
  id: string;
  eventId: string;
  contactId?: string;
  title: string;
  date: string;
  daysUntil: number;
  priority: "today" | "soon" | "planning";
  recommendation: string;
  budgetCny?: number;
  actions: string[];
  warnings: string[];
};

function eventDay(event: CalendarEvent) {
  return parseISO(`${event.date}T00:00:00`);
}

function preferenceText(contact: Contact | undefined, category: "gift" | "food" | "avoid") {
  const preferences = contact?.preferences
    .filter((item) => item.category === category)
    .map((item) => item.label);

  return preferences?.length ? preferences.join("、") : undefined;
}

function recommendationForEvent(event: CalendarEvent, contact: Contact | undefined) {
  const gift = preferenceText(contact, "gift");
  const food = preferenceText(contact, "food");
  const avoid = preferenceText(contact, "avoid");
  const base = gift || food
    ? `优先按 ${[gift, food].filter(Boolean).join("，")} 生成礼物/餐饮方案。`
    : "先确认偏好，再生成礼物、餐饮或问候方案。";

  return avoid ? `${base} 规避：${avoid}。` : base;
}

export function buildLevelTwoRecommendationCards(params: {
  data: Pick<WorkspaceData, "events" | "contacts">;
  now?: Date;
  horizonDays?: number;
}) {
  const now = startOfDay(params.now ?? new Date());
  const horizon = addDays(now, params.horizonDays ?? 15);
  const dayKey = format(now, "yyyy-MM-dd");

  return params.data.events
    .filter((event) => event.reminderLevel === "level_2")
    .filter((event) => event.status !== "done" && event.status !== "missed")
    .map((event) => {
      const day = eventDay(event);
      const contact = params.data.contacts.find((item) => item.id === event.contactId);
      const daysUntil = differenceInCalendarDays(day, now);

      return {
        event,
        contact,
        daysUntil,
        inWindow: !isBefore(day, now) && !isAfter(day, horizon),
      };
    })
    .filter((item) => item.inWindow)
    .sort((left, right) => left.daysUntil - right.daysUntil)
    .map(({ event, contact, daysUntil }) => ({
      id: `level2-${event.id}-${dayKey}`,
      eventId: event.id,
      contactId: event.contactId,
      title: `${event.title} 推荐卡`,
      date: event.date,
      daysUntil,
      priority: daysUntil === 0 ? "today" : daysUntil <= 3 ? "soon" : "planning",
      recommendation: recommendationForEvent(event, contact),
      budgetCny: event.budgetCny,
      actions: [
        "生成履约方案",
        "确认预算",
        contact ? `复核 ${contact.name} 偏好` : "补充联系人画像",
      ],
      warnings: contact?.compliance.riskTags.length
        ? [`触发合规标签：${contact.compliance.riskTags.join("、")}`]
        : [],
    } satisfies LevelTwoRecommendationCard));
}

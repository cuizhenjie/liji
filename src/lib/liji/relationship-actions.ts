import type { CalendarEvent, Contact, WorkspaceData } from "./types";

export type RelationshipActionPriority = "critical" | "high" | "normal";
export type RelationshipActionScenario =
  | "event"
  | "compliance"
  | "profile"
  | "memory"
  | "follow_up";

export type RelationshipAction = {
  id: string;
  contactId: string;
  contactName: string;
  priority: RelationshipActionPriority;
  scenario: RelationshipActionScenario;
  title: string;
  detail: string;
  evidence: string;
  cta: string;
};

function dateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function daysBetween(date: string, now: Date) {
  return Math.round((dateKey(date) - dateKey(dateOnly(now))) / 86_400_000);
}

function isRiskyContact(contact: Contact) {
  return /公职|国企|高管|客户|合作|商务/.test([contact.relation, ...contact.labels].join(" "));
}

function preferenceSummary(contact: Contact) {
  const labels = contact.preferences.map((preference) => preference.label);
  return labels.length > 0 ? labels.slice(0, 3).join("、") : "暂无偏好";
}

function complianceLimit(contact: Contact) {
  const limits = [
    contact.compliance.giftLimitCny ? `礼品 ${contact.compliance.giftLimitCny} 元` : "",
    contact.compliance.hospitalityLimitCny ? `宴请 ${contact.compliance.hospitalityLimitCny} 元` : "",
  ].filter(Boolean);

  return limits.length > 0 ? limits.join(" / ") : "未配置限额";
}

function upcomingEvents(data: WorkspaceData, contact: Contact, now: Date) {
  return data.events
    .filter((event) => event.contactId === contact.id && event.status !== "done" && event.status !== "missed")
    .map((event) => ({ event, daysUntil: daysBetween(event.date, now) }))
    .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 15)
    .sort((left, right) => left.daysUntil - right.daysUntil);
}

function lastInteractionDays(contact: Contact, now: Date) {
  if (!contact.lastInteractionAt) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((dateKey(dateOnly(now)) - dateKey(contact.lastInteractionAt.slice(0, 10))) / 86_400_000));
}

function eventAction(contact: Contact, event: CalendarEvent, daysUntil: number): RelationshipAction {
  const isLevelOne = event.reminderLevel === "level_1";
  const isBirthday = /生日|纪念日/.test(event.title);

  if (isLevelOne || isRiskyContact(contact)) {
    return {
      id: `event:${contact.id}:${event.id}`,
      contactId: contact.id,
      contactName: contact.name,
      priority: isLevelOne && daysUntil <= 3 ? "critical" : "high",
      scenario: "compliance",
      title: `确认 ${event.title} 的合规与偏好`,
      detail: `提前核对 ${preferenceSummary(contact)}，并按 ${complianceLimit(contact)} 控制方案。`,
      evidence: `${event.date} · ${daysUntil} 天后 · ${event.reminderLevel}`,
      cta: "核对安排",
    };
  }

  return {
    id: `event:${contact.id}:${event.id}`,
    contactId: contact.id,
    contactName: contact.name,
    priority: isBirthday && daysUntil <= 15 ? "high" : "normal",
    scenario: "event",
    title: `准备 ${event.title}`,
    detail: `基于 ${preferenceSummary(contact)} 先锁定礼物、餐饮或关怀动作。`,
    evidence: `${event.date} · ${daysUntil} 天后`,
    cta: "准备方案",
  };
}

function contactActions(data: WorkspaceData, contact: Contact, now: Date): RelationshipAction[] {
  const actions: RelationshipAction[] = [];
  const [nextEvent] = upcomingEvents(data, contact, now);
  const needsMemoryReview = data.aiMemories.some((memory) =>
    memory.contactId === contact.id &&
    (memory.reviewStatus === "review_required" || memory.reviewStatus === "stale")
  );
  const interactionDays = lastInteractionDays(contact, now);

  if (nextEvent) {
    actions.push(eventAction(contact, nextEvent.event, nextEvent.daysUntil));
  }

  if (isRiskyContact(contact) && !contact.compliance.policyNote) {
    actions.push({
      id: `compliance:${contact.id}`,
      contactId: contact.id,
      contactName: contact.name,
      priority: "high",
      scenario: "compliance",
      title: `补齐 ${contact.name} 的商务合规边界`,
      detail: "重要客户、公职或国企高管需要礼品与宴请限额后再进入推荐。",
      evidence: "缺少 policyNote",
      cta: "补合规",
    });
  }

  if (contact.preferences.length < 2) {
    actions.push({
      id: `profile:${contact.id}`,
      contactId: contact.id,
      contactName: contact.name,
      priority: "normal",
      scenario: "profile",
      title: `补齐 ${contact.name} 的偏好矩阵`,
      detail: "至少沉淀 2 条饮食、兴趣、礼品或避雷线索，后续推荐才稳定。",
      evidence: `${contact.preferences.length}/2 条偏好`,
      cta: "补画像",
    });
  }

  if (needsMemoryReview || contact.aiMemoryHealth < 90) {
    actions.push({
      id: `memory:${contact.id}`,
      contactId: contact.id,
      contactName: contact.name,
      priority: needsMemoryReview ? "high" : "normal",
      scenario: "memory",
      title: `复核 ${contact.name} 的 AI 记忆`,
      detail: "把低置信或陈旧记忆修正后，再沉淀到长期偏好资产。",
      evidence: `记忆健康度 ${contact.aiMemoryHealth}`,
      cta: "复核记忆",
    });
  }

  if (interactionDays >= 30) {
    actions.push({
      id: `follow-up:${contact.id}`,
      contactId: contact.id,
      contactName: contact.name,
      priority: interactionDays >= 60 ? "high" : "normal",
      scenario: "follow_up",
      title: `安排 ${contact.name} 的关系触达`,
      detail: "长期未互动的 VIP 建议补一次问候、近况或健康关怀，保持关系温度。",
      evidence: Number.isFinite(interactionDays) ? `${interactionDays} 天未互动` : "缺少最近互动记录",
      cta: "安排触达",
    });
  }

  return actions;
}

export function buildRelationshipActions(
  data: WorkspaceData,
  now = new Date("2026-07-01T09:00:00+08:00"),
  limit = 6
): RelationshipAction[] {
  const priorityWeight: Record<RelationshipActionPriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
  };

  return data.contacts
    .flatMap((contact) => contactActions(data, contact, now))
    .sort((left, right) => {
      const byPriority = priorityWeight[left.priority] - priorityWeight[right.priority];
      if (byPriority !== 0) return byPriority;
      return left.contactName.localeCompare(right.contactName, "zh-CN");
    })
    .slice(0, limit);
}

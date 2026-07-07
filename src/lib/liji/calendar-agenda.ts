import type { CalendarEvent, Contact, FulfillmentPlan } from "./types";

export type CalendarAgendaStatus = "urgent" | "action" | "done";

export type CalendarAgendaScenario = "relationship" | "hospitality" | "travel" | "bill" | "general";

export type CalendarAgendaAction =
  | {
      kind: "confirm_event";
      eventId: string;
    }
  | {
      kind: "confirm_plan";
      planId: string;
    }
  | {
      kind: "generate_festival_plan";
      eventId: string;
    }
  | {
      kind: "generate_travel_plan";
    }
  | {
      kind: "open_section";
      section: "dashboard" | "contacts" | "calendar" | "fulfillment" | "finance" | "ops" | "privacy";
    };

export type CalendarAgendaItem = {
  id: string;
  eventId: string;
  title: string;
  date: string;
  contactName?: string;
  scenario: CalendarAgendaScenario;
  status: CalendarAgendaStatus;
  assetState: string;
  nextStep: string;
  evidence: string;
  cta: string;
  action: CalendarAgendaAction;
};

function contactName(contacts: Contact[], contactId: string | undefined) {
  return contacts.find((contact) => contact.id === contactId)?.name;
}

function scenarioFromEvent(event: CalendarEvent): CalendarAgendaScenario {
  if (event.source === "bill" || /房贷|扣款|账单|水电|话费/.test(event.title)) return "bill";
  if (event.source === "travel" || /差旅|出差|行程/.test(event.title)) return "travel";
  if (/宴请|客户|会议|会面/.test(event.title)) return "hospitality";
  if (/生日|纪念日|节日/.test(event.title)) return "relationship";
  return "general";
}

function matchingPlan(event: CalendarEvent, plans: FulfillmentPlan[]) {
  return plans.find((plan) =>
    plan.eventId === event.id ||
    (plan.scenario === "festival" && /生日|纪念日|节日/.test(event.title)) ||
    (plan.scenario === "travel" && (event.source === "travel" || /差旅|出差|行程/.test(event.title)))
  );
}

function isPlanSettled(plan: FulfillmentPlan | undefined) {
  return plan?.status === "confirmed" || plan?.status === "bookmarked";
}

function agendaItem(params: {
  event: CalendarEvent;
  contactName?: string;
  scenario: CalendarAgendaScenario;
  status: CalendarAgendaStatus;
  assetState: string;
  nextStep: string;
  evidence: string;
  cta: string;
  action: CalendarAgendaAction;
}): CalendarAgendaItem {
  return {
    id: `agenda:${params.event.id}`,
    eventId: params.event.id,
    title: params.event.title,
    date: params.event.date,
    contactName: params.contactName,
    scenario: params.scenario,
    status: params.status,
    assetState: params.assetState,
    nextStep: params.nextStep,
    evidence: params.evidence,
    cta: params.cta,
    action: params.action,
  };
}

function buildEventAgendaItem(
  event: CalendarEvent,
  contacts: Contact[],
  plans: FulfillmentPlan[]
): CalendarAgendaItem {
  const scenario = scenarioFromEvent(event);
  const name = contactName(contacts, event.contactId);
  const plan = matchingPlan(event, plans);
  const eventConfirmed = event.status === "confirmed" || event.status === "done";
  const settledPlan = isPlanSettled(plan);
  const baseEvidence = `${event.date} · ${event.reminderLevel}${name ? ` · ${name}` : ""}`;

  if (!eventConfirmed && event.reminderLevel === "level_1") {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: "urgent",
      assetState: "待沉淀提醒资产",
      nextStep: "先确认红线提醒，停止短信或语音升级。",
      evidence: baseEvidence,
      cta: "确认红线提醒",
      action: {
        kind: "confirm_event",
        eventId: event.id,
      },
    });
  }

  if (scenario === "relationship" && plan && !settledPlan) {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: "action",
      assetState: "待沉淀履约资产",
      nextStep: "确认生日/节日方案后进入履约和复盘。",
      evidence: `${baseEvidence} · 方案 ${plan.status}`,
      cta: "确认生日方案",
      action: {
        kind: "confirm_plan",
        planId: plan.id,
      },
    });
  }

  if (scenario === "relationship" && !plan) {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: "action",
      assetState: "待生成履约方案",
      nextStep: "生成礼物、蛋糕和餐饮拆解方案。",
      evidence: baseEvidence,
      cta: "生成生日方案",
      action: {
        kind: "generate_festival_plan",
        eventId: event.id,
      },
    });
  }

  if (scenario === "travel" && plan && !settledPlan) {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: "action",
      assetState: "待沉淀差旅资产",
      nextStep: "确认交通、住宿和预算后进入行前秘书包。",
      evidence: `${baseEvidence} · 方案 ${plan.status}`,
      cta: "确认差旅方案",
      action: {
        kind: "confirm_plan",
        planId: plan.id,
      },
    });
  }

  if (scenario === "travel" && !plan) {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: "action",
      assetState: "待生成差旅资产",
      nextStep: "生成交通、住宿和弹性预算方案。",
      evidence: baseEvidence,
      cta: "生成差旅方案",
      action: {
        kind: "generate_travel_plan",
      },
    });
  }

  if (scenario === "bill") {
    return agendaItem({
      event,
      contactName: name,
      scenario,
      status: eventConfirmed ? "done" : "action",
      assetState: eventConfirmed ? "账单提醒已沉淀" : "待确认账单提醒",
      nextStep: eventConfirmed ? "进入账单复盘和下月预留预算。" : "确认扣款提醒并关联周期账单。",
      evidence: baseEvidence,
      cta: "查看账单",
      action: {
        kind: "open_section",
        section: "finance",
      },
    });
  }

  return agendaItem({
    event,
    contactName: name,
    scenario,
    status: eventConfirmed || settledPlan ? "done" : "action",
    assetState: settledPlan ? "履约资产已沉淀" : eventConfirmed ? "日程资产已沉淀" : "待确认日程资产",
    nextStep: settledPlan || eventConfirmed ? "持续跟踪投递和复盘。" : "确认日程后进入提醒和复盘。",
    evidence: baseEvidence,
    cta: settledPlan ? "查看方案" : "查看日程",
    action: {
      kind: "open_section",
      section: settledPlan ? "fulfillment" : "calendar",
    },
  });
}

export function buildCalendarAgenda(params: {
  contacts: Contact[];
  events: CalendarEvent[];
  plans: FulfillmentPlan[];
  limit?: number;
}): CalendarAgendaItem[] {
  const statusWeight: Record<CalendarAgendaStatus, number> = {
    urgent: 0,
    action: 1,
    done: 2,
  };
  const scenarioWeight: Record<CalendarAgendaScenario, number> = {
    hospitality: 0,
    relationship: 1,
    travel: 2,
    bill: 3,
    general: 4,
  };

  return params.events
    .map((event) => buildEventAgendaItem(event, params.contacts, params.plans))
    .sort((left, right) => {
      const byStatus = statusWeight[left.status] - statusWeight[right.status];
      if (byStatus !== 0) return byStatus;
      const byScenario = scenarioWeight[left.scenario] - scenarioWeight[right.scenario];
      if (byScenario !== 0) return byScenario;
      return left.date.localeCompare(right.date);
    })
    .slice(0, params.limit ?? 6);
}

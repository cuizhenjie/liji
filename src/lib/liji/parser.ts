import { resolveRelativeChineseDate } from "./calendar";
import { createUuid } from "./ids";
import { maskPii } from "./pii";
import {
  type CaptureItem,
  type CaptureSource,
  type Contact,
  type ParsedInput,
  parsedInputSchema,
} from "./types";

function inferContact(input: string, contacts: Contact[]) {
  return contacts.find(
    (contact) => input.includes(contact.name) || input.includes(contact.relation)
  );
}

function extractAmount(input: string) {
  const budgetMatch = input.match(/(?:预算|额度|限额)\s*(\d+(?:\.\d+)?)/i);
  if (budgetMatch) {
    return Number(budgetMatch[1]);
  }

  const match = input.match(/(\d+(?:\.\d+)?)\s*(?:元|块|RMB)/i);
  return match ? Number(match[1]) : undefined;
}

export function parseNaturalLanguageInput(
  rawText: string,
  contacts: Contact[] = [],
  now = new Date("2026-07-01T09:00:00+08:00"),
  sourceType: CaptureSource = "text"
): CaptureItem {
  const pii = maskPii(rawText, contacts);
  const contact = inferContact(rawText, contacts);
  const amount = extractAmount(rawText);
  let parsed: ParsedInput;

  if (/出差|差旅|去.+周.*回|机票|高铁|酒店/.test(rawText)) {
    const date = resolveRelativeChineseDate(rawText, now);
    const endDate = rawText.includes("周五回")
      ? resolveRelativeChineseDate("下周五", now)
      : undefined;

    parsed = {
      intent: "travel",
      title: rawText.includes("广州") ? "广州商务差旅" : "商务差旅",
      date,
      endDate,
      location: rawText.match(/去([\u4e00-\u9fa5]{2,4})/)?.[1] ?? "目的地待确认",
      amountCny: amount,
      budgetCny: amount ?? 2400,
      reminderLevel: "level_1",
      notes: "自动识别为差旅规划，需确认出发地和交通偏好。",
      confidence: 0.82,
    };
  } else if (/生日|纪念日|节日/.test(rawText)) {
    const age = rawText.match(/(\d+)\s*岁/)?.[1];
    const relation = contact?.relation ?? rawText.match(/(女儿|儿子|母亲|父亲|伴侣|客户)/)?.[1];

    parsed = {
      intent: "event",
      title: `${relation ?? contact?.name ?? "重要对象"}${age ? `${age}岁` : ""}生日`,
      targetName: contact?.name,
      relation,
      date: resolveRelativeChineseDate(rawText, now),
      amountCny: amount,
      budgetCny: amount ?? 2000,
      reminderLevel: relation === "客户" ? "level_1" : "level_2",
      frequency: "RRULE:FREQ=YEARLY",
      notes: "建议生成礼物、蛋糕、餐饮三段式履约方案。",
      confidence: 0.88,
    };
  } else if (/房贷|水电|话费|保费|扣款/.test(rawText)) {
    parsed = {
      intent: "bill",
      title: rawText.includes("房贷") ? "房贷扣款" : "周期账单",
      date: resolveRelativeChineseDate(rawText, now),
      amountCny: amount,
      reminderLevel: "level_1",
      notes: "识别为周期性生活账单，建议写入账单托管。",
      confidence: 0.8,
    };
  } else if (/花了|消费|支出|买了/.test(rawText)) {
    parsed = {
      intent: "transaction",
      title: rawText.includes("吃饭") ? "餐饮消费" : "日常消费",
      date: resolveRelativeChineseDate(rawText, now),
      amountCny: amount ?? 0,
      reminderLevel: "level_3",
      notes: "识别为记账流水，确认后写入日常账单。",
      confidence: 0.76,
    };
  } else {
    parsed = {
      intent: "memory",
      title: contact ? `${contact.name} 偏好记忆` : "待确认记忆",
      targetName: contact?.name,
      relation: contact?.relation,
      reminderLevel: "level_3",
      notes: "识别为关系记忆，确认后进入 AI 记忆纠偏列表。",
      confidence: 0.64,
    };
  }

  return {
    id: createUuid(),
    rawText,
    maskedText: pii.maskedText,
    sourceType,
    status: "pending",
    parsed: parsedInputSchema.parse(parsed),
    piiTokens: pii.tokens,
    createdAt: now.toISOString(),
  };
}

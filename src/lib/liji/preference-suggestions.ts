import type { AiMemory, Contact, Preference, WorkspaceData } from "./types";

export type PreferenceSuggestion = {
  id: string;
  memoryId: string;
  contactId: string;
  contactName: string;
  category: Preference["category"];
  label: string;
  confidence: number;
  evidence: string;
};

type ExtractedPreference = {
  category: Preference["category"];
  label: string;
};

function normalizeLabel(label: string) {
  return label.replace(/[，。,.；;！!\s]+$/g, "").trim();
}

function hasPreference(contact: Contact, label: string) {
  return contact.preferences.some((preference) => preference.label === label);
}

function categoryForLabel(label: string): Preference["category"] {
  if (/高铁|机票|航班|酒店|靠窗|出差|差旅|住宿/.test(label)) return "travel";
  if (/礼物|礼品|乐高|办公|香水|茶叶|包装/.test(label)) return "gift";
  if (/高尔夫|阅读|体检|运动|音乐|收藏/.test(label)) return "hobby";
  return "food";
}

function pushPreference(
  preferences: ExtractedPreference[],
  category: Preference["category"],
  label: string
) {
  const normalized = normalizeLabel(label);
  if (normalized) {
    preferences.push({ category, label: normalized });
  }
}

function extractPreferences(memory: AiMemory): ExtractedPreference[] {
  const text = memory.content;
  const preferences: ExtractedPreference[] = [];

  for (const match of text.matchAll(/不吃([^，。,.；;！!\s]{1,12})/g)) {
    pushPreference(preferences, "avoid", `不吃${match[1]}`);
  }
  for (const match of text.matchAll(/不喝([^，。,.；;！!\s]{1,12})/g)) {
    pushPreference(preferences, "avoid", `不喝${match[1]}`);
  }
  for (const match of text.matchAll(/([^，。,.；;！!\s]{1,12})过敏/g)) {
    pushPreference(preferences, "avoid", `${match[1]}过敏`);
  }
  for (const match of text.matchAll(/避免([^，。,.；;！!\s]{1,16})/g)) {
    pushPreference(preferences, "avoid", `避免${match[1]}`);
  }
  for (const match of text.matchAll(/偏好([^，。,.；;！!\s]{1,16})/g)) {
    const label = normalizeLabel(match[1]);
    pushPreference(preferences, categoryForLabel(label), label);
  }
  for (const match of text.matchAll(/喜欢([^，。,.；;！!\s]{1,16})/g)) {
    const label = normalizeLabel(match[1]);
    pushPreference(preferences, categoryForLabel(label), label);
  }

  return Array.from(
    new Map(
      preferences.map((preference) => [
        `${preference.category}:${preference.label}`,
        preference,
      ])
    ).values()
  );
}

export function buildPreferenceSuggestions(data: WorkspaceData): PreferenceSuggestion[] {
  return data.aiMemories.flatMap((memory) => {
    if (!memory.contactId) return [];

    const contact = data.contacts.find((item) => item.id === memory.contactId);
    if (!contact) return [];

    return extractPreferences(memory)
      .map((preference) => ({
        id: `${memory.id}:${preference.category}:${preference.label}`,
        memoryId: memory.id,
        contactId: contact.id,
        contactName: contact.name,
        category: preference.category,
        label: preference.label,
        confidence: memory.confidence,
        evidence: memory.content,
      }))
      .filter((suggestion) => !hasPreference(contact, suggestion.label));
  });
}

import { parseInputWithProvider } from "./ai";
import type { CaptureItem, Contact } from "./types";

export type SmsImportMessage = {
  text: string;
  receivedAt?: string;
  sender?: string;
};

export type SmsImportResult = {
  captures: CaptureItem[];
  skipped: number;
};

export async function importSmsBillMessages(params: {
  messages: SmsImportMessage[];
  contacts: Contact[];
  allowCloudModel?: boolean;
  now?: Date;
}) {
  const captures: CaptureItem[] = [];
  let skipped = 0;

  for (const message of params.messages) {
    if (!message.text.trim()) {
      skipped += 1;
      continue;
    }

    const receivedAt = message.receivedAt ? new Date(message.receivedAt) : undefined;
    const parsed = await parseInputWithProvider({
      text: message.sender ? `${message.sender}：${message.text}` : message.text,
      contacts: params.contacts,
      source: "bill",
      allowCloudModel: params.allowCloudModel,
      now: Number.isNaN(receivedAt?.getTime()) ? params.now : receivedAt ?? params.now,
    });

    captures.push(parsed.capture);
  }

  return {
    captures,
    skipped,
  } satisfies SmsImportResult;
}

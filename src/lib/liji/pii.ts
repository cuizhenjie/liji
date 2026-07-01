import type { Contact, PiiMaskResult, PiiToken } from "./types";

const PHONE_RE = /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ADDRESS_RE = /[\u4e00-\u9fa5A-Za-z0-9]{2,}(?:路|街|大道|小区|中心|大厦|园区|广场|酒店|机场|车站)[\u4e00-\u9fa5A-Za-z0-9-]*/g;
const COMPANY_RE = /[\u4e00-\u9fa5A-Za-z0-9]{2,}(?:公司|集团|银行|医院|学校|政府|委员会|国资委)/g;

function pushToken(
  tokens: PiiToken[],
  original: string,
  kind: PiiToken["kind"]
) {
  const existing = tokens.find(
    (token) => token.original === original && token.kind === kind
  );
  if (existing) {
    return existing.token;
  }

  const token = `[${kind.toUpperCase()}_${tokens.length + 1}]`;
  tokens.push({ token, original, kind });
  return token;
}

function replaceMatches(
  text: string,
  pattern: RegExp,
  kind: PiiToken["kind"],
  tokens: PiiToken[]
) {
  return text.replace(pattern, (match) => pushToken(tokens, match, kind));
}

export function maskPii(input: string, contacts: Contact[] = []): PiiMaskResult {
  const tokens: PiiToken[] = [];
  let maskedText = input;

  for (const contact of contacts) {
    if (contact.name.length < 2) {
      continue;
    }
    maskedText = maskedText.replaceAll(
      contact.name,
      pushToken(tokens, contact.name, "name")
    );
  }

  maskedText = replaceMatches(maskedText, PHONE_RE, "phone", tokens);
  maskedText = replaceMatches(maskedText, EMAIL_RE, "email", tokens);
  maskedText = replaceMatches(maskedText, COMPANY_RE, "company", tokens);
  maskedText = replaceMatches(maskedText, ADDRESS_RE, "address", tokens);

  return { maskedText, tokens };
}

export function restorePii(input: string, tokens: PiiToken[]) {
  return tokens.reduce(
    (text, token) => text.replaceAll(token.token, token.original),
    input
  );
}

import type { ComplianceProfile, Contact } from "./types";

const PUBLIC_OFFICIAL_LABELS = new Set(["公职人员", "国企高管", "政府", "监管"]);

export function deriveComplianceProfile(labels: string[]): ComplianceProfile {
  const riskyLabels = labels.filter((label) => PUBLIC_OFFICIAL_LABELS.has(label));

  if (riskyLabels.length > 0) {
    return {
      riskTags: riskyLabels,
      giftLimitCny: 200,
      hospitalityLimitCny: 500,
      policyNote: "触发商务合规限制：礼品建议不超过 200 元，宴请建议不超过 500 元。",
    };
  }

  if (labels.includes("重要客户")) {
    return {
      riskTags: ["重要客户"],
      giftLimitCny: 500,
      hospitalityLimitCny: 800,
      policyNote: "重要客户建议保留预算与发票记录，避免现金或储值卡类礼品。",
    };
  }

  return {
    riskTags: [],
    policyNote: "暂无强合规限制，仍建议保留履约记录。",
  };
}

export function getComplianceWarnings(contact: Contact | undefined, amountCny: number) {
  if (!contact?.compliance.giftLimitCny) {
    return [];
  }

  if (amountCny <= contact.compliance.giftLimitCny) {
    return [];
  }

  return [
    `${contact.name} 的礼品限额为 ${contact.compliance.giftLimitCny} 元，当前方案 ${amountCny} 元需要替换或审批。`,
  ];
}

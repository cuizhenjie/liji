/**
 * Compliance Skill - 合规检查技能
 * 
 * 检查礼品/宴请是否符合合规限额和禁忌要求
 */

import type { SkillDefinition, SkillContext, SkillResult } from './registry';
import type { ComplianceProfile } from '../types';

// ============================================================================
// 合规规则定义
// ============================================================================

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  giftLimitCny?: number;
  hospitalityLimitCny?: number;
  riskTags: string[];
  policyNote: string;
  festivalMultiplier?: number; // 节日限额倍数
}

// 预置合规规则
const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'rule-soe-executive',
    name: '国企高管合规',
    description: '国有企业高管商务往来合规限制',
    giftLimitCny: 200,
    hospitalityLimitCny: 500,
    riskTags: ['国企高管', '政府官员'],
    policyNote: '触发商务合规限制：礼品不超过200元，宴请不超过500元。',
    festivalMultiplier: 1.5,
  },
  {
    id: 'rule-listed-company',
    name: '上市公司合规',
    description: '上市公司董监高商务往来合规限制',
    giftLimitCny: 500,
    hospitalityLimitCny: 1000,
    riskTags: ['上市公司高管', '重要客户'],
    policyNote: '商务关系，建议控制礼品和宴请预算。',
    festivalMultiplier: 1.2,
  },
  {
    id: 'rule-family',
    name: '家庭关系',
    description: '家庭成员之间无商务合规限制',
    riskTags: [],
    policyNote: '家庭关系，无商务合规限制。',
  },
  {
    id: 'rule-friend',
    name: '朋友关系',
    description: '私人朋友之间无商务合规限制',
    riskTags: [],
    policyNote: '私人关系，无商务合规限制。',
  },
];

// ============================================================================
// 合规检查输入/输出
// ============================================================================

interface ComplianceCheckInput {
  amount: number;
  type: 'gift' | 'hospitality' | 'travel' | 'other';
  contactTags?: string[];
  festivalId?: string;
  complianceProfile?: ComplianceProfile;
}

interface ComplianceCheckOutput {
  passed: boolean;
  applicableRule?: ComplianceRule;
  limit?: number;
  remaining?: number;
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Skill 实现
// ============================================================================

export const complianceSkill: SkillDefinition = {
  id: 'compliance-check',
  name: '合规检查',
  version: '1.0.0',
  description: '检查礼品/宴请是否符合合规限额和禁忌要求',
  category: 'business',

  async execute(context: SkillContext): Promise<SkillResult> {
    const input = context as unknown as ComplianceCheckInput & SkillContext;
    
    // 参数验证
    if (typeof input.amount !== 'number' || input.amount < 0) {
      return {
        success: false,
        error: 'Invalid amount: must be a non-negative number',
      };
    }

    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 1. 匹配适用的合规规则
    const applicableRule = findApplicableRule(
      input.contactTags || [],
      input.complianceProfile
    );

    if (!applicableRule) {
      // 无适用规则，默认通过
      return {
        success: true,
        data: {
          passed: true,
          applicableRule: undefined,
          limit: undefined,
          remaining: undefined,
          warnings: [],
          suggestions: ['无适用合规规则，建议自行判断合理性。'],
        } satisfies ComplianceCheckOutput,
      };
    }

    // 2. 确定限额
    let limit: number | undefined;
    if (input.type === 'gift') {
      limit = applicableRule.giftLimitCny;
    } else if (input.type === 'hospitality') {
      limit = applicableRule.hospitalityLimitCny;
    }

    // 3. 节日倍数调整
    if (limit && input.festivalId && applicableRule.festivalMultiplier) {
      const originalLimit = limit;
      limit = Math.round(limit * applicableRule.festivalMultiplier);
      warnings.push(
        `节日期间限额上浮${Math.round((applicableRule.festivalMultiplier - 1) * 100)}%：${originalLimit}元 → ${limit}元`
      );
    }

    // 4. 检查是否超限
    const passed = limit === undefined || input.amount <= limit;
    const remaining = limit !== undefined ? limit - input.amount : undefined;

    if (!passed) {
      warnings.push(
        `超出合规限额：预算${input.amount}元 > 限额${limit}元，超出${Math.abs(remaining || 0)}元`
      );
      suggestions.push(
        `建议将预算调整至${limit}元以内`
      );
      suggestions.push(
        '或选择合规限额内的替代方案'
      );
    } else if (limit && input.amount > limit * 0.8) {
      warnings.push(
        `预算接近合规限额：${input.amount}元 / ${limit}元（${Math.round(input.amount / limit * 100)}%）`
      );
    }

    // 5. 风险标签检查
    if (applicableRule.riskTags.length > 0) {
      warnings.push(
        `合规提示：${applicableRule.policyNote}`
      );
    }

    return {
      success: true,
      data: {
        passed,
        applicableRule,
        limit,
        remaining,
        warnings,
        suggestions,
      } satisfies ComplianceCheckOutput,
      warnings,
    };
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

function findApplicableRule(
  contactTags: string[],
  complianceProfile?: ComplianceProfile
): ComplianceRule | undefined {
  // 优先使用显式传入的合规配置
  if (complianceProfile?.giftLimitCny !== undefined) {
    return {
      id: 'custom',
      name: '自定义合规',
      description: '用户自定义合规配置',
      giftLimitCny: complianceProfile.giftLimitCny,
      hospitalityLimitCny: complianceProfile.hospitalityLimitCny,
      riskTags: complianceProfile.riskTags || [],
      policyNote: complianceProfile.policyNote || '自定义合规规则。',
    };
  }

  // 按风险标签匹配规则
  for (const rule of COMPLIANCE_RULES) {
    if (rule.riskTags.length === 0) continue;
    const hasMatch = contactTags.some(tag => 
      rule.riskTags.some(riskTag => tag.includes(riskTag) || riskTag.includes(tag))
    );
    if (hasMatch) return rule;
  }

  // 默认无规则
  return undefined;
}

// 导出规则供外部使用
export { COMPLIANCE_RULES, findApplicableRule };
export type { ComplianceCheckInput, ComplianceCheckOutput, ComplianceRule };

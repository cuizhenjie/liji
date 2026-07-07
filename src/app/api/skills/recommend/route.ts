/**
 * Skills Recommend API
 * 
 * POST /api/skills/recommend - 基于 Skill 体系生成推荐方案
 * 
 * 整合身份模板、节日模板、合规检查、LLM推荐
 */

import { NextRequest, NextResponse } from 'next/server';
import { SkillRegistry } from '@/lib/liji/skills/registry';
import { presetIdentityTemplates, presetFestivalTemplates, presetGiftTemplates } from '@/lib/liji/skills/preset-templates';
import type { IdentityTemplate, FestivalTemplate, GiftTemplate } from '@/lib/liji/skills/template-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      contactName,
      contactTags = [],
      occasion,
      budget,
      preferences = [],
      avoidTags = [],
      festivalId,
      identityTemplateId,
    } = body;

    if (!occasion) {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: occasion' },
        { status: 400 }
      );
    }

    // 1. 匹配身份模板
    let identityTemplate: IdentityTemplate | undefined;
    if (identityTemplateId) {
      identityTemplate = presetIdentityTemplates.find(t => t.id === identityTemplateId);
    }
    if (!identityTemplate) {
      // 按标签自动匹配
      identityTemplate = presetIdentityTemplates.find(t =>
        t.compliance.riskTags.some(tag => contactTags.includes(tag))
      );
    }
    if (!identityTemplate) {
      // 默认使用"亲密朋友"模板
      identityTemplate = presetIdentityTemplates.find(t => t.id === 'identity-private-friend');
    }

    // 2. 匹配节日模板
    let festivalTemplate: FestivalTemplate | undefined;
    if (festivalId) {
      festivalTemplate = presetFestivalTemplates.find(t => t.id === festivalId);
    }

    // 3. 合规检查
    const complianceResult = await SkillRegistry.execute('compliance-check', {
      amount: budget || identityTemplate?.recommendation.budgetRange.max || 500,
      type: 'gift',
      contactTags,
      festivalId,
      complianceProfile: identityTemplate ? {
        giftLimitCny: identityTemplate.compliance.giftLimitCny,
        hospitalityLimitCny: identityTemplate.compliance.hospitalityLimitCny,
        riskTags: identityTemplate.compliance.riskTags,
        policyNote: identityTemplate.compliance.policyNote,
      } : undefined,
    });

    // 4. 获取适用场景的节日推荐
    let festivalScenario = null;
    if (festivalTemplate) {
      const identityCategory = identityTemplate?.category || 'social';
      festivalScenario = festivalTemplate.scenarios.find(
        s => s.identityCategory === identityCategory
      ) || festivalTemplate.scenarios[0];
    }

    // 5. 获取礼品模板推荐
    const applicableGiftTemplates = presetGiftTemplates.filter(template => {
      // 匹配场景
      if (!template.occasions.includes(occasion) && !template.occasions.includes('birthday')) {
        return false;
      }
      // 匹配身份类别
      const category = identityTemplate?.category || 'social';
      if (!template.identityCategories.includes(category) && !template.identityCategories.includes('social')) {
        return false;
      }
      return true;
    });

    // 6. 生成推荐方案
    const effectiveBudget = budget || identityTemplate?.recommendation.budgetRange.max || 500;
    const recommendations = generateRecommendations({
      contactName: contactName || '对方',
      occasion,
      budget: effectiveBudget,
      identityTemplate: identityTemplate!,
      festivalScenario,
      giftTemplates: applicableGiftTemplates,
      preferences,
      avoidTags: [...avoidTags, ...(identityTemplate?.recommendation.avoidCategories || [])],
    });

    // 7. 生成问候语
    const greetings = generateGreetings({
      contactName: contactName || '对方',
      occasion,
      festivalScenario,
    });
    const compliance = complianceResult.success && complianceResult.data && typeof complianceResult.data === 'object'
      ? complianceResult.data
      : {
          passed: true,
          warnings: [],
          suggestions: ['合规检查暂未返回结果，请人工复核。'],
        };
    const responseData = {
      identityTemplate: {
        id: identityTemplate?.id,
        name: identityTemplate?.name,
        compliance: identityTemplate?.compliance,
      },
      festivalTemplate: festivalTemplate ? {
        id: festivalTemplate.id,
        name: festivalTemplate.name,
      } : null,
      compliance,
      recommendations,
      greetings,
      budget: {
        requested: budget,
        effective: effectiveBudget,
        limit: identityTemplate?.compliance.giftLimitCny,
      },
    };

    return NextResponse.json({
      ok: true,
      data: responseData,
      compliance,
      recommendations,
      greetings,
      greeting: greetings[0] ?? '',
      budget: responseData.budget,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 推荐生成逻辑
// ============================================================================

interface RecommendationInput {
  contactName: string;
  occasion: string;
  budget: number;
  identityTemplate: IdentityTemplate;
  festivalScenario: FestivalTemplate['scenarios'][0] | null;
  giftTemplates: GiftTemplate[];
  preferences: string[];
  avoidTags: string[];
}

interface RecommendationItem {
  name: string;
  price: number;
  provider: string;
  rationale: string;
  confidence: number;
  category: string;
  url?: string;
}

function generateRecommendations(input: RecommendationInput): RecommendationItem[] {
  const {
    contactName,
    occasion,
    budget,
    identityTemplate,
    festivalScenario,
    giftTemplates,
    preferences,
    avoidTags,
  } = input;

  const recommendations: RecommendationItem[] = [];
  const budgetRange = identityTemplate.recommendation.budgetRange;
  const effectiveMax = Math.min(budget, budgetRange.max);

  // 1. 从节日场景获取推荐
  if (festivalScenario) {
    for (const suggestion of festivalScenario.giftSuggestions.slice(0, 2)) {
      if (suggestion.priceRange[0] <= effectiveMax) {
        recommendations.push({
          name: suggestion.label,
          price: suggestion.priceRange[1],
          provider: suggestion.providers[0],
          rationale: `${contactName}的${occasion}推荐：${suggestion.description || suggestion.label}，价格适中，适合${occasion}场景。`,
          confidence: 0.85,
          category: 'festival',
        });
      }
    }
  }

  // 2. 从礼品模板获取推荐
  for (const template of giftTemplates.slice(0, 2)) {
    const suitableTier = template.tiers.find(
      tier => tier.priceRange.min >= budgetRange.min && tier.priceRange.max <= effectiveMax
    ) || template.tiers[0];

    if (suitableTier && suitableTier.items.length > 0) {
      const item = suitableTier.items[0];
      if (!avoidTags.some(tag => template.name.includes(tag) || template.category.includes(tag))) {
        recommendations.push({
          name: item.name,
          price: item.price,
          provider: item.provider,
          rationale: generateRationale(item.name, template.category, preferences, contactName, occasion),
          confidence: 0.75,
          category: template.category,
        });
      }
    }
  }

  // 3. 基于偏好生成推荐
  if (preferences.length > 0 && recommendations.length < 3) {
    const prefCategory = preferences[0];
    recommendations.push({
      name: `${prefCategory}精选礼品`,
      price: Math.min(Math.round(effectiveMax * 0.6), budgetRange.max),
      provider: identityTemplate.recommendation.preferredProviders[0] || '京东',
      rationale: `根据${contactName}的偏好「${prefCategory}」推荐，${occasion}送礼贴心之选。`,
      confidence: 0.7,
      category: 'preference',
    });
  }

  // 4. 确保至少有3个推荐
  if (recommendations.length < 3) {
    const fallbackItems = [
      { name: '精选水果礼篮', price: Math.min(200, effectiveMax), provider: '美团', category: 'food' },
      { name: '定制贺卡+鲜花', price: Math.min(150, effectiveMax), provider: '美团', category: 'gift' },
      { name: '品质零食礼盒', price: Math.min(100, effectiveMax), provider: '京东', category: 'food' },
    ];

    for (const item of fallbackItems) {
      if (recommendations.length >= 3) break;
      if (item.price <= effectiveMax) {
        recommendations.push({
          name: item.name,
          price: item.price,
          provider: item.provider,
          rationale: `${contactName}${occasion}的实用之选，品质保证。`,
          confidence: 0.6,
          category: item.category,
        });
      }
    }
  }

  // 按置信度排序
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

function generateRationale(
  itemName: string,
  category: string,
  preferences: string[],
  contactName: string,
  occasion: string,
): string {
  const hasPreferenceMatch = preferences.some(p => 
    itemName.includes(p) || category.includes(p)
  );

  if (hasPreferenceMatch) {
    return `根据${contactName}的偏好推荐，${itemName}非常适合作为${occasion}礼物。`;
  }

  const categoryDescriptions: Record<string, string> = {
    gift: '经典礼品，适合多种场合',
    food: '美食之选，分享快乐',
    health: '健康关怀，贴心之选',
    experience: '体验类礼品，创造美好回忆',
    digital: '数码好物，实用又时尚',
  };

  return `${categoryDescriptions[category] || '精选礼品'}，适合${contactName}的${occasion}。`;
}

function generateGreetings(input: {
  contactName: string;
  occasion: string;
  festivalScenario: FestivalTemplate['scenarios'][0] | null;
}): string[] {
  const { contactName, occasion, festivalScenario } = input;

  if (festivalScenario && festivalScenario.greetingTemplates.length > 0) {
    return festivalScenario.greetingTemplates.map(t => 
      t.replace('X总', contactName)
    );
  }

  // 通用问候语
  const genericGreetings: Record<string, string[]> = {
    birthday: [
      `${contactName}，生日快乐！愿您新的一岁一切顺遂。`,
      `祝${contactName}生日快乐，心想事成！`,
      `${contactName}，今天是您的生日，送上最真挚的祝福！`,
    ],
    festival: [
      `祝${contactName}节日快乐，阖家幸福！`,
      `${contactName}，佳节将至，祝您一切顺利。`,
    ],
    thanks: [
      `${contactName}，感谢您的帮助，一点心意请收下。`,
      `感谢${contactName}一直以来的支持！`,
    ],
  };

  return genericGreetings[occasion] || genericGreetings.festival;
}

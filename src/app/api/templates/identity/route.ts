/**
 * Identity Templates API
 * 
 * GET /api/templates/identity - 列出所有身份模板
 * POST /api/templates/identity - 创建自定义身份模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetIdentityTemplates } from '@/lib/liji/skills/preset-templates';
import type { IdentityTemplate } from '@/lib/liji/skills/template-types';

// 内存存储（生产环境应使用 Supabase）
const customTemplates: IdentityTemplate[] = [];

export async function GET() {
  try {
    const allTemplates = [...presetIdentityTemplates, ...customTemplates];
    
    return NextResponse.json({
      ok: true,
      data: allTemplates,
      meta: {
        total: allTemplates.length,
        preset: presetIdentityTemplates.length,
        custom: customTemplates.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.name || !body.category) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, category' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newTemplate: IdentityTemplate = {
      id: `identity-custom-${Date.now()}`,
      name: body.name,
      category: body.category || 'social',
      description: body.description || '',
      compliance: {
        giftLimitCny: body.compliance?.giftLimitCny,
        hospitalityLimitCny: body.compliance?.hospitalityLimitCny,
        riskTags: body.compliance?.riskTags || [],
        policyNote: body.compliance?.policyNote || '',
      },
      reminder: {
        birthdayAdvanceDays: body.reminder?.birthdayAdvanceDays || [15, 7, 1],
        festivalAdvanceDays: body.reminder?.festivalAdvanceDays || [7, 1],
        escalationChain: body.reminder?.escalationChain || ['level_1', 'level_2'],
      },
      recommendation: {
        giftCategories: body.recommendation?.giftCategories || [],
        avoidCategories: body.recommendation?.avoidCategories || [],
        budgetRange: body.recommendation?.budgetRange || { min: 100, max: 500 },
        preferredProviders: body.recommendation?.preferredProviders || ['京东'],
      },
      scenarioTemplates: body.scenarioTemplates || [],
      createdAt: now,
      updatedAt: now,
      isPreset: false,
    };

    customTemplates.push(newTemplate);

    return NextResponse.json({
      ok: true,
      data: newTemplate,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

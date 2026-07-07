/**
 * Festival Templates API
 * 
 * GET /api/templates/festival - 列出所有节日模板
 * GET /api/templates/festival?upcoming=true - 获取即将到来的节日
 */

import { NextRequest, NextResponse } from 'next/server';
import { presetFestivalTemplates } from '@/lib/liji/skills/preset-templates';
import { lunarToSolar, getMothersDay, getFathersDay } from '@/lib/liji/skills/calendar-skill';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') === 'true';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    let templates = [...presetFestivalTemplates];

    if (upcoming) {
      const now = new Date();
      const today = new Date(year, now.getMonth(), now.getDate());
      
      // 计算每个节日的下一个日期
      const withDates = templates.map(template => {
        let nextDate: Date | null = null;

        if (template.dateType === 'solar' && template.date) {
          const [month, day] = template.date.split('-').map(Number);
          nextDate = new Date(year, month - 1, day);
          if (nextDate < today) {
            nextDate = new Date(year + 1, month - 1, day);
          }
        } else if (template.dateType === 'lunar' && template.lunarDate) {
          const [month, day] = template.lunarDate.split('-').map(Number);
          try {
            const solar = lunarToSolar(year, month, day);
            nextDate = new Date(solar.year, solar.month - 1, solar.day);
            if (nextDate < today) {
              const nextSolar = lunarToSolar(year + 1, month, day);
              nextDate = new Date(nextSolar.year, nextSolar.month - 1, nextSolar.day);
            }
          } catch {
            // 农历转换失败，跳过
          }
        } else if (template.dateType === 'variable' && template.rule) {
          // 处理浮动日期（母亲节、父亲节等）
          if (template.id === 'festival-mothers-day') {
            const md = getMothersDay(year);
            nextDate = new Date(year, md.month - 1, md.day);
            if (nextDate < today) {
              const nextMd = getMothersDay(year + 1);
              nextDate = new Date(year + 1, nextMd.month - 1, nextMd.day);
            }
          } else if (template.id === 'festival-fathers-day') {
            const fd = getFathersDay(year);
            nextDate = new Date(year, fd.month - 1, fd.day);
            if (nextDate < today) {
              const nextFd = getFathersDay(year + 1);
              nextDate = new Date(year + 1, nextFd.month - 1, nextFd.day);
            }
          }
        }

        return {
          ...template,
          nextDate: nextDate ? nextDate.toISOString().split('T')[0] : null,
          daysUntil: nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : null,
        };
      });

      // 按距离排序
      templates = withDates
        .filter(t => t.daysUntil !== null && t.daysUntil >= 0)
        .sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0)) as typeof templates;
    }

    return NextResponse.json({
      ok: true,
      data: templates,
      meta: {
        total: templates.length,
        upcoming: upcoming,
        year,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

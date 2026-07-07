/**
 * Calendar Skill - 日历转换技能
 * 
 * 支持农历/公历转换、节日日期计算、RRULE 解析
 */

import type { SkillDefinition, SkillContext, SkillResult } from './registry';

// ============================================================================
// 农历数据表（2020-2050年）
// ============================================================================

// 农历数据编码规则：
// 每个年份用一个16进制数表示
// 高4位：闰月月份（0表示无闰月）
// 中间8位：12个月的大小月（1=30天，0=29天）
// 低4位：闰月大小（1=30天，0=29天）
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 2020-2029
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 2030-2039
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 2040-2049
  0x06566, // 2050
];

// 天干地支
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 农历月份名
const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

// ============================================================================
// 农历转换核心函数
// ============================================================================

/**
 * 返回农历年的总天数
 */
function lunarYearDays(y: number): number {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[y - 2020] & i) ? 1 : 0;
  }
  return sum + leapMonthDays(y);
}

/**
 * 返回农历闰月的天数
 */
function leapMonthDays(y: number): number {
  if (leapMonth(y)) {
    return (LUNAR_INFO[y - 2020] & 0x1) ? 30 : 29;
  }
  return 0;
}

/**
 * 返回农历年的闰月月份，0表示无闰月
 */
function leapMonth(y: number): number {
  return LUNAR_INFO[y - 2020] & 0xf;
}

/**
 * 返回农历某月的天数
 */
function lunarMonthDays(y: number, m: number): number {
  return (LUNAR_INFO[y - 2020] & (0x10000 >> m)) ? 30 : 29;
}

/**
 * 公历转农历
 */
export function solarToLunar(year: number, month: number, day: number): {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  yearGanZhi: string;
  zodiac: string;
  monthName: string;
  dayName: string;
} {
  // 基准日期：2020年1月25日 = 农历2020年正月初一
  const baseDate = new Date(2020, 0, 25);
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

  let lunarYear = 2020;
  let lunarMonth = 1;
  let lunarDay = 1;
  let isLeap = false;

  // 计算农历年
  while (offset > 0) {
    const daysInYear = lunarYearDays(lunarYear);
    if (offset < daysInYear) break;
    offset -= daysInYear;
    lunarYear++;
  }
  while (offset < 0) {
    lunarYear--;
    offset += lunarYearDays(lunarYear);
  }

  // 计算农历月
  const leap = leapMonth(lunarYear);
  let monthOffset = 0;
  
  for (let i = 1; i <= 12; i++) {
    // 普通月
    const days = lunarMonthDays(lunarYear, i);
    if (offset < days) {
      lunarMonth = i;
      lunarDay = offset + 1;
      break;
    }
    offset -= days;

    // 闰月
    if (i === leap) {
      const leapDays = leapMonthDays(lunarYear);
      if (offset < leapDays) {
        lunarMonth = i;
        lunarDay = offset + 1;
        isLeap = true;
        break;
      }
      offset -= leapDays;
    }
    
    monthOffset = i;
  }

  if (monthOffset >= 12) {
    lunarMonth = 12;
    lunarDay = offset + 1;
  }

  // 天干地支
  const ganIndex = (lunarYear - 4) % 10;
  const zhiIndex = (lunarYear - 4) % 12;
  const yearGanZhi = GAN[ganIndex] + ZHI[zhiIndex];
  const zodiac = ZODIAC[zhiIndex];

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
    yearGanZhi,
    zodiac,
    monthName: (isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1] + '月',
    dayName: LUNAR_DAY_NAMES[lunarDay - 1],
  };
}

/**
 * 农历转公历
 */
export function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap = false): {
  year: number;
  month: number;
  day: number;
} {
  // 基准日期：2020年1月25日 = 农历2020年正月初一
  const baseDate = new Date(2020, 0, 25);
  let offset = 0;

  // 计算年份偏移
  for (let y = 2020; y < lunarYear; y++) {
    offset += lunarYearDays(y);
  }
  for (let y = lunarYear; y < 2020; y++) {
    offset -= lunarYearDays(y);
  }

  // 计算月份偏移
  const leap = leapMonth(lunarYear);
  for (let m = 1; m < lunarMonth; m++) {
    offset += lunarMonthDays(lunarYear, m);
    if (m === leap) {
      offset += leapMonthDays(lunarYear);
    }
  }

  // 如果是闰月，加上当月天数
  if (isLeap && lunarMonth === leap) {
    offset += lunarMonthDays(lunarYear, lunarMonth);
  }

  // 加上日期偏移
  offset += lunarDay - 1;

  // 计算公历日期
  const result = new Date(baseDate.getTime() + offset * 86400000);
  return {
    year: result.getFullYear(),
    month: result.getMonth() + 1,
    day: result.getDate(),
  };
}

/**
 * 获取某个公历日期对应的农历节日名称（如果有）
 */
export function getLunarFestivalName(year: number, month: number, day: number): string | null {
  const lunar = solarToLunar(year, month, day);
  
  const festivals: Record<string, string> = {
    '1-1': '春节',
    '1-15': '元宵节',
    '2-2': '龙抬头',
    '5-5': '端午节',
    '7-7': '七夕节',
    '7-15': '中元节',
    '8-15': '中秋节',
    '9-9': '重阳节',
    '12-8': '腊八节',
    '12-23': '小年',
    '12-30': '除夕',
    '12-29': '除夕', // 小月时除夕在29
  };

  const key = `${lunar.lunarMonth}-${lunar.lunarDay}`;
  return festivals[key] || null;
}

/**
 * 获取某个公历日期对应的公历节日名称（如果有）
 */
export function getSolarFestivalName(month: number, day: number): string | null {
  const festivals: Record<string, string> = {
    '1-1': '元旦',
    '2-14': '情人节',
    '3-8': '妇女节',
    '3-12': '植树节',
    '4-1': '愚人节',
    '5-1': '劳动节',
    '5-4': '青年节',
    '6-1': '儿童节',
    '7-1': '建党节',
    '8-1': '建军节',
    '9-10': '教师节',
    '10-1': '国庆节',
    '12-25': '圣诞节',
  };

  const key = `${month}-${day}`;
  return festivals[key] || null;
}

/**
 * 计算母亲节日期（5月第二个周日）
 */
export function getMothersDay(year: number): { month: number; day: number } {
  const may1 = new Date(year, 4, 1);
  const dayOfWeek = may1.getDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const secondSunday = firstSunday + 7;
  return { month: 5, day: secondSunday };
}

/**
 * 计算父亲节日期（6月第三个周日）
 */
export function getFathersDay(year: number): { month: number; day: number } {
  const june1 = new Date(year, 5, 1);
  const dayOfWeek = june1.getDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const thirdSunday = firstSunday + 14;
  return { month: 6, day: thirdSunday };
}

// ============================================================================
// Skill 定义
// ============================================================================

export interface CalendarConvertInput {
  type: 'solar-to-lunar' | 'lunar-to-solar' | 'get-festival' | 'get-next-festival';
  year: number;
  month: number;
  day: number;
  isLeap?: boolean;
}

export const calendarSkill: SkillDefinition = {
  id: 'calendar-convert',
  name: '日历转换',
  version: '1.0.0',
  description: '支持农历/公历转换、节日日期计算',
  category: 'base',

  async execute(context: SkillContext): Promise<SkillResult> {
    const input = context as unknown as CalendarConvertInput & SkillContext;

    try {
      switch (input.type) {
        case 'solar-to-lunar': {
          const lunar = solarToLunar(input.year, input.month, input.day);
          const festival = getLunarFestivalName(input.year, input.month, input.day) 
            || getSolarFestivalName(input.month, input.day);
          
          return {
            success: true,
            data: {
              ...lunar,
              festival,
              formatted: `${lunar.yearGanZhi}年(${lunar.zodiac}) ${lunar.monthName}${lunar.dayName}`,
            },
          };
        }

        case 'lunar-to-solar': {
          const solar = lunarToSolar(input.year, input.month, input.day, input.isLeap);
          return {
            success: true,
            data: {
              year: solar.year,
              month: solar.month,
              day: solar.day,
              formatted: `${solar.year}年${solar.month}月${solar.day}日`,
            },
          };
        }

        case 'get-festival': {
          const lunarFestival = getLunarFestivalName(input.year, input.month, input.day);
          const solarFestival = getSolarFestivalName(input.month, input.day);
          return {
            success: true,
            data: {
              lunarFestival,
              solarFestival,
              isFestivalDay: !!(lunarFestival || solarFestival),
            },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown conversion type: ${input.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

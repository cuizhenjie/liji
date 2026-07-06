/**
 * Preset Templates - 预置模板数据
 * 
 * 包含预置的身份模板、节日模板、礼品模板和场景模板
 */

import type {
  IdentityTemplate,
  FestivalTemplate,
  GiftTemplate,
  ScenarioTemplate,
} from './template-types';

const now = new Date().toISOString();

// ============================================================================
// 预置身份模板
// ============================================================================

export const presetIdentityTemplates: IdentityTemplate[] = [
  {
    id: 'identity-soe-executive',
    name: '国企高管',
    category: 'business',
    description: '国有企业高管，需严格遵守商务合规限制',
    compliance: {
      giftLimitCny: 200,
      hospitalityLimitCny: 500,
      riskTags: ['国企高管', '政府官员'],
      policyNote: '触发商务合规限制：礼品不超过200元，宴请不超过500元。',
    },
    reminder: {
      birthdayAdvanceDays: [60, 15, 3],
      festivalAdvanceDays: [30, 7, 1],
      escalationChain: ['level_1', 'level_2', 'level_3'],
    },
    recommendation: {
      giftCategories: ['办公用品', '茶叶', '书籍', '文创'],
      avoidCategories: ['奢侈品', '现金卡', '酒精'],
      budgetRange: { min: 100, max: 200 },
      preferredProviders: ['京东'],
    },
    scenarioTemplates: ['scenario-business-birthday', 'scenario-business-festival'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'identity-listed-company',
    name: '上市公司高管',
    category: 'business',
    description: '上市公司董监高，需遵守证券合规要求',
    compliance: {
      giftLimitCny: 500,
      hospitalityLimitCny: 1000,
      riskTags: ['上市公司高管', '重要客户'],
      policyNote: '商务关系，建议控制礼品和宴请预算。',
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 3, 1],
      festivalAdvanceDays: [15, 7, 3, 1],
      escalationChain: ['level_1', 'level_2', 'level_3'],
    },
    recommendation: {
      giftCategories: ['茶叶', '红酒', '高端办公', '地方特产'],
      avoidCategories: ['过于私人化', '现金等价物'],
      budgetRange: { min: 200, max: 500 },
      preferredProviders: ['京东', '美团'],
    },
    scenarioTemplates: ['scenario-client-birthday', 'scenario-client-entertainment'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'identity-family-elder',
    name: '家庭长辈',
    category: 'family',
    description: '父母、祖父母等家庭长辈，注重健康关怀',
    compliance: {
      riskTags: [],
      policyNote: '家庭关系，无商务合规限制。',
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 1],
      festivalAdvanceDays: [15, 7, 1],
      escalationChain: ['level_2', 'level_3'],
    },
    recommendation: {
      giftCategories: ['保健品', '体检套餐', '保暖用品', '低糖食品', '按摩器材'],
      avoidCategories: ['酒精', '高糖食品', '生冷食品'],
      budgetRange: { min: 200, max: 2000 },
      preferredProviders: ['京东', '美团'],
    },
    scenarioTemplates: ['scenario-family-birthday', 'scenario-family-festival', 'scenario-health-care'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'identity-family-child',
    name: '家庭晚辈',
    category: 'family',
    description: '子女、侄女等家庭晚辈，注重成长和教育',
    compliance: {
      riskTags: [],
      policyNote: '家庭关系，无商务合规限制。',
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 1],
      festivalAdvanceDays: [15, 7, 1],
      escalationChain: ['level_2'],
    },
    recommendation: {
      giftCategories: ['玩具', '绘本', '教育课程', '运动装备', '电子产品'],
      avoidCategories: ['成人用品', '高糖零食'],
      budgetRange: { min: 100, max: 1000 },
      preferredProviders: ['京东', '淘宝'],
    },
    scenarioTemplates: ['scenario-child-birthday', 'scenario-children-day'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'identity-private-friend',
    name: '亲密朋友',
    category: 'social',
    description: '关系亲密的朋友，注重个性化和心意',
    compliance: {
      riskTags: [],
      policyNote: '私人关系，无商务合规限制。',
    },
    reminder: {
      birthdayAdvanceDays: [15, 7, 1],
      festivalAdvanceDays: [7, 1],
      escalationChain: ['level_2'],
    },
    recommendation: {
      giftCategories: ['个性化礼品', '体验类', '美食', '文创', '数码配件'],
      avoidCategories: [],
      budgetRange: { min: 100, max: 800 },
      preferredProviders: ['淘宝', '京东'],
    },
    scenarioTemplates: ['scenario-friend-birthday', 'scenario-friend-gathering'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'identity-private-client',
    name: '重要客户',
    category: 'business',
    description: '重要商务客户，需维护关系同时注意合规',
    compliance: {
      giftLimitCny: 500,
      hospitalityLimitCny: 1000,
      riskTags: ['重要客户'],
      policyNote: '商务关系，建议控制礼品和宴请预算。',
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 3, 1],
      festivalAdvanceDays: [15, 7, 3, 1],
      escalationChain: ['level_1', 'level_2', 'level_3'],
    },
    recommendation: {
      giftCategories: ['茶叶', '红酒', '高端办公', '地方特产', '定制礼品'],
      avoidCategories: ['过于私人化', '现金等价物'],
      budgetRange: { min: 200, max: 500 },
      preferredProviders: ['京东', '美团'],
    },
    scenarioTemplates: ['scenario-client-birthday', 'scenario-client-entertainment', 'scenario-client-festival'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
];

// ============================================================================
// 预置节日模板
// ============================================================================

export const presetFestivalTemplates: FestivalTemplate[] = [
  {
    id: 'festival-spring',
    name: '春节',
    dateType: 'lunar',
    lunarDate: '01-01',
    description: '中国传统新年，最重要的家庭团聚节日',
    advanceReminders: [30, 15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: 'family',
        giftSuggestions: [
          { label: '年货礼盒', priceRange: [200, 500], providers: ['京东', '淘宝'], description: '精选坚果、糕点组合' },
          { label: '红包/压岁钱', priceRange: [200, 2000], providers: ['微信'], description: '传统压岁钱习俗' },
          { label: '保健品', priceRange: [300, 1000], providers: ['京东'], description: '适合长辈的健康礼品' },
          { label: '新衣服', priceRange: [200, 800], providers: ['淘宝', '京东'], description: '新年穿新衣' },
        ],
        greetingTemplates: [
          '新春快乐！祝您和家人身体健康、万事如意。',
          '给您拜年了！新的一年事业顺利、阖家幸福。',
          '恭贺新禧，愿您新年新气象，好运连连！',
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 500, max: 5000, typical: 2000 },
      },
      {
        identityCategory: 'business',
        giftSuggestions: [
          { label: '茶叶礼盒', priceRange: [200, 500], providers: ['京东'], description: '品质茶叶，商务送礼首选' },
          { label: '地方特产', priceRange: [100, 300], providers: ['淘宝'], description: '特色地方美食' },
          { label: '办公文创', priceRange: [100, 200], providers: ['京东'], description: '高端办公用品' },
        ],
        greetingTemplates: [
          'X总，新春快乐！感谢过去一年的关照，祝新年事业更上一层楼。',
          '恭祝新春大吉，合作愉快，共创辉煌！',
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 200, max: 500, typical: 300 },
      },
    ],
    complianceOverride: {
      giftLimitMultiplier: 1.5,
      note: '春节期间商务礼品限额可上浮50%。',
    },
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'festival-mid-autumn',
    name: '中秋节',
    dateType: 'lunar',
    lunarDate: '08-15',
    description: '团圆佳节，赏月吃月饼',
    advanceReminders: [30, 15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: 'family',
        giftSuggestions: [
          { label: '月饼礼盒', priceRange: [100, 500], providers: ['京东', '美团'], description: '传统月饼礼盒' },
          { label: '水果礼篮', priceRange: [200, 500], providers: ['美团'], description: '新鲜水果礼篮' },
          { label: '大闸蟹', priceRange: [300, 800], providers: ['京东'], description: '应季大闸蟹' },
        ],
        greetingTemplates: [
          '月圆人团圆，祝您中秋快乐、阖家幸福！',
          '中秋佳节，愿您花好月圆人长久。',
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 300, max: 2000, typical: 800 },
      },
      {
        identityCategory: 'business',
        giftSuggestions: [
          { label: '品牌月饼', priceRange: [200, 500], providers: ['京东'], description: '知名品牌月饼' },
          { label: '茶叶+月饼组合', priceRange: [300, 500], providers: ['京东'], description: '茶饼搭配礼盒' },
        ],
        greetingTemplates: [
          'X总，中秋将至，祝您和家人团圆美满、事业圆满。',
        ],
        budgetGuidance: { min: 200, max: 500, typical: 300 },
      },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'festival-mothers-day',
    name: '母亲节',
    dateType: 'variable',
    rule: 'RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU',
    description: '感恩母亲的节日（5月第二个周日）',
    advanceReminders: [15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: 'family',
        giftSuggestions: [
          { label: '康乃馨花束', priceRange: [100, 300], providers: ['美团'], description: '母亲节经典花束' },
          { label: '护肤品套装', priceRange: [300, 800], providers: ['京东', '淘宝'], description: '适合妈妈的护肤品' },
          { label: '体检套餐', priceRange: [500, 2000], providers: ['美团'], description: '关爱妈妈健康' },
          { label: '按摩仪', priceRange: [300, 1000], providers: ['京东'], description: '缓解疲劳的按摩器材' },
        ],
        greetingTemplates: [
          '妈妈，母亲节快乐！感谢您一直以来的付出，我爱您。',
          '亲爱的妈妈，愿您健康长寿，笑口常开。',
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 300, max: 2000, typical: 800 },
      },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'festival-fathers-day',
    name: '父亲节',
    dateType: 'variable',
    rule: 'RRULE:FREQ=YEARLY;BYMONTH=6;BYDAY=3SU',
    description: '感恩父亲的节日（6月第三个周日）',
    advanceReminders: [15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: 'family',
        giftSuggestions: [
          { label: '皮带/钱包', priceRange: [200, 500], providers: ['京东'], description: '实用皮具礼品' },
          { label: '剃须刀', priceRange: [300, 1000], providers: ['京东'], description: '高端电动剃须刀' },
          { label: '茶叶', priceRange: [200, 500], providers: ['京东'], description: '好茶配好爸' },
          { label: '运动装备', priceRange: [200, 800], providers: ['京东'], description: '健康运动装备' },
        ],
        greetingTemplates: [
          '爸爸，父亲节快乐！您辛苦了，愿您健康长寿。',
          '老爸，节日快乐！感谢您的养育之恩。',
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 200, max: 1500, typical: 500 },
      },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'festival-dragon-boat',
    name: '端午节',
    dateType: 'lunar',
    lunarDate: '05-05',
    description: '纪念屈原，吃粽子赛龙舟',
    advanceReminders: [15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: 'family',
        giftSuggestions: [
          { label: '粽子礼盒', priceRange: [100, 300], providers: ['京东', '美团'], description: '传统粽子礼盒' },
          { label: '咸鸭蛋', priceRange: [50, 150], providers: ['京东'], description: '端午应季食品' },
        ],
        greetingTemplates: [
          '端午安康！愿您和家人平安健康。',
        ],
        budgetGuidance: { min: 100, max: 500, typical: 200 },
      },
      {
        identityCategory: 'business',
        giftSuggestions: [
          { label: '高端粽子礼盒', priceRange: [200, 500], providers: ['京东'], description: '商务送礼粽子礼盒' },
        ],
        greetingTemplates: [
          'X总，端午佳节，祝您安康顺遂。',
        ],
        budgetGuidance: { min: 100, max: 300, typical: 200 },
      },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
];

// ============================================================================
// 预置礼品模板
// ============================================================================

export const presetGiftTemplates: GiftTemplate[] = [
  {
    id: 'gift-tea-set',
    name: '茶叶礼盒',
    category: 'gift',
    description: '品质茶叶礼盒，商务送礼首选',
    occasions: ['birthday', 'festival', 'thanks', 'business'],
    identityCategories: ['business', 'social'],
    tiers: [
      {
        label: '经济',
        priceRange: { min: 100, max: 200 },
        items: [
          { name: '龙井茶100g', price: 128, provider: '京东' },
          { name: '铁观音250g', price: 158, provider: '京东' },
        ],
      },
      {
        label: '品质',
        priceRange: { min: 200, max: 400 },
        items: [
          { name: '西湖龙井礼盒', price: 268, provider: '京东' },
          { name: '武夷岩茶礼盒', price: 328, provider: '京东' },
        ],
      },
      {
        label: '高端',
        priceRange: { min: 400, max: 800 },
        items: [
          { name: '明前龙井精品', price: 588, provider: '京东' },
          { name: '老班章普洱', price: 688, provider: '京东' },
        ],
      },
    ],
    providers: [
      { name: '京东', searchUrl: 'https://search.jd.com/Search?keyword=茶叶礼盒' },
      { name: '淘宝', searchUrl: 'https://s.taobao.com/search?q=茶叶礼盒' },
    ],
    warnings: ['注意保质期', '避免高温存放'],
    seasonal: { spring: true, autumn: true },
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'gift-health-supplement',
    name: '保健品',
    category: 'health',
    description: '健康保健类礼品，适合长辈',
    occasions: ['birthday', 'festival', 'health'],
    identityCategories: ['family'],
    tiers: [
      {
        label: '基础',
        priceRange: { min: 100, max: 300 },
        items: [
          { name: '维生素套装', price: 168, provider: '京东' },
          { name: '钙片+鱼油', price: 198, provider: '京东' },
        ],
      },
      {
        label: '品质',
        priceRange: { min: 300, max: 600 },
        items: [
          { name: '燕窝礼盒', price: 388, provider: '京东' },
          { name: '灵芝孢子粉', price: 458, provider: '京东' },
        ],
      },
    ],
    providers: [
      { name: '京东', searchUrl: 'https://search.jd.com/Search?keyword=保健品礼盒' },
    ],
    warnings: ['注意保质期', '确认无过敏成分'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'gift-birthday-cake',
    name: '生日蛋糕',
    category: 'food',
    description: '生日庆祝必备蛋糕',
    occasions: ['birthday'],
    identityCategories: ['family', 'social'],
    tiers: [
      {
        label: '经典',
        priceRange: { min: 100, max: 200 },
        items: [
          { name: '8寸水果蛋糕', price: 128, provider: '美团' },
          { name: '8寸巧克力蛋糕', price: 158, provider: '美团' },
        ],
      },
      {
        label: '精品',
        priceRange: { min: 200, max: 400 },
        items: [
          { name: '10寸定制蛋糕', price: 268, provider: '美团' },
          { name: '慕斯蛋糕礼盒', price: 328, provider: '美团' },
        ],
      },
    ],
    providers: [
      { name: '美团', searchUrl: 'https://www.meituan.com/s/%E8%9B%8B%E7%B3%95' },
    ],
    warnings: ['需提前1天预订', '注意配送时间', '确认忌口/过敏'],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
];

// ============================================================================
// 预置场景模板
// ============================================================================

export const presetScenarioTemplates: ScenarioTemplate[] = [
  {
    id: 'scenario-client-birthday',
    name: '客户生日宴请方案',
    description: '为重要客户准备生日礼品和宴请的完整方案',
    triggers: {
      identityTemplateId: 'identity-private-client',
      occasion: 'birthday',
    },
    components: [
      { type: 'gift', required: true, budgetAllocation: 0.4 },
      { type: 'dining', required: true, budgetAllocation: 0.4 },
      { type: 'greeting', required: true, budgetAllocation: 0 },
      { type: 'transport', required: false, budgetAllocation: 0.2 },
    ],
    timeline: [
      { daysBefore: 30, action: '生成方案草稿', autoTrigger: true },
      { daysBefore: 15, action: '确认礼品选择', autoTrigger: false },
      { daysBefore: 7, action: '预订餐厅', autoTrigger: false },
      { daysBefore: 3, action: '确认所有安排', autoTrigger: true },
      { daysBefore: 1, action: '发送提醒', autoTrigger: true },
      { daysBefore: 0, action: '执行日', autoTrigger: false },
    ],
    checklist: [
      { item: '礼品已下单', autoVerifiable: true },
      { item: '餐厅已预订', autoVerifiable: false },
      { item: '确认忌口/过敏', autoVerifiable: false },
      { item: '合规限额检查', autoVerifiable: true },
      { item: '问候语已准备', autoVerifiable: false },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'scenario-family-birthday',
    name: '家庭生日庆祝方案',
    description: '为家庭成员准备生日庆祝的完整方案',
    triggers: {
      identityTemplateId: 'identity-family-elder',
      occasion: 'birthday',
    },
    components: [
      { type: 'gift', required: true, budgetAllocation: 0.5 },
      { type: 'dining', required: true, budgetAllocation: 0.3 },
      { type: 'greeting', required: true, budgetAllocation: 0 },
    ],
    timeline: [
      { daysBefore: 15, action: '开始准备', autoTrigger: true },
      { daysBefore: 7, action: '购买礼品', autoTrigger: false },
      { daysBefore: 3, action: '预订餐厅', autoTrigger: false },
      { daysBefore: 1, action: '确认安排', autoTrigger: true },
      { daysBefore: 0, action: '庆祝日', autoTrigger: false },
    ],
    checklist: [
      { item: '礼品已准备', autoVerifiable: false },
      { item: '蛋糕已预订', autoVerifiable: false },
      { item: '餐厅已预订', autoVerifiable: false },
      { item: '家人已通知', autoVerifiable: false },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
  {
    id: 'scenario-health-care',
    name: '长辈健康关怀方案',
    description: '为家庭长辈安排体检和健康关怀',
    triggers: {
      identityTemplateId: 'identity-family-elder',
      occasion: 'health',
    },
    components: [
      { type: 'gift', required: true, budgetAllocation: 0.6 },
      { type: 'greeting', required: true, budgetAllocation: 0 },
    ],
    timeline: [
      { daysBefore: 7, action: '预约体检', autoTrigger: false },
      { daysBefore: 3, action: '确认预约', autoTrigger: true },
      { daysBefore: 0, action: '体检日', autoTrigger: false },
      { daysBefore: -7, action: '跟进报告', autoTrigger: true },
    ],
    checklist: [
      { item: '体检已预约', autoVerifiable: false },
      { item: '空腹提醒已发送', autoVerifiable: true },
      { item: '陪同人员已安排', autoVerifiable: false },
    ],
    createdAt: now,
    updatedAt: now,
    isPreset: true,
  },
];

// ============================================================================
// 导出所有预置模板
// ============================================================================

export const allPresetTemplates = {
  identity: presetIdentityTemplates,
  festival: presetFestivalTemplates,
  gift: presetGiftTemplates,
  scenario: presetScenarioTemplates,
};

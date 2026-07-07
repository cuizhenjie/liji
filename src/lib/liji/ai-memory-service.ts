/**
 * AI 记忆增强 - 长期偏好学习
 * 基于用户历史行为学习偏好模式
 */

export interface UserPreference {
  id: string;
  userId: string;
  category: PreferenceCategory;
  key: string;
  value: string | number | boolean;
  confidence: number; // 0-1
  sampleCount: number;
  lastUpdated: string;
  createdAt: string;
}

export type PreferenceCategory = 
  | 'gift'           // 礼品偏好
  | 'restaurant'     // 餐厅偏好
  | 'budget'         // 预算偏好
  | 'timing'         // 时间偏好
  | 'communication'  // 沟通偏好
  | 'compliance';    // 合规偏好

export interface PreferencePattern {
  category: PreferenceCategory;
  pattern: string;
  frequency: number;
  examples: string[];
}

export interface MemoryEntry {
  id: string;
  userId: string;
  type: 'interaction' | 'preference' | 'event' | 'feedback';
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  createdAt: string;
  expiresAt?: string;
}

// 礼品偏好学习
export interface GiftPreference {
  preferredCategories: string[];
  preferredPriceRange: { min: number; max: number };
  avoidedItems: string[];
  seasonalPreferences: Record<string, string[]>;
  recipientPreferences: Record<string, string[]>;
}

// 餐厅偏好学习
export interface RestaurantPreference {
  preferredCuisines: string[];
  preferredPricePerPerson: number;
  preferredAmbiance: string[];
  avoidedCuisines: string[];
  preferredLocations: string[];
}

// 预算偏好学习
export interface BudgetPreference {
  monthlyBudget: number;
  categoryBudgets: Record<string, number>;
  spendingPattern: 'conservative' | 'moderate' | 'generous';
  festivalMultiplier: number;
}

// 模拟偏好数据库
const DEMO_PREFERENCES: UserPreference[] = [
  {
    id: 'pref-001',
    userId: 'user-001',
    category: 'gift',
    key: 'preferred_category',
    value: '茶叶,保健品,书籍',
    confidence: 0.85,
    sampleCount: 12,
    lastUpdated: '2026-06-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pref-002',
    userId: 'user-001',
    category: 'gift',
    key: 'price_range',
    value: '200-800',
    confidence: 0.9,
    sampleCount: 15,
    lastUpdated: '2026-06-20T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pref-003',
    userId: 'user-001',
    category: 'restaurant',
    key: 'preferred_cuisine',
    value: '中餐,日料,粤菜',
    confidence: 0.8,
    sampleCount: 8,
    lastUpdated: '2026-06-10T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'pref-004',
    userId: 'user-001',
    category: 'budget',
    key: 'monthly_budget',
    value: 5000,
    confidence: 0.95,
    sampleCount: 6,
    lastUpdated: '2026-06-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pref-005',
    userId: 'user-001',
    category: 'budget',
    key: 'spending_pattern',
    value: 'moderate',
    confidence: 0.88,
    sampleCount: 10,
    lastUpdated: '2026-06-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pref-006',
    userId: 'user-001',
    category: 'timing',
    key: 'reminder_advance_days',
    value: 7,
    confidence: 0.92,
    sampleCount: 20,
    lastUpdated: '2026-06-25T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// 模拟记忆条目
const DEMO_MEMORIES: MemoryEntry[] = [
  {
    id: 'mem-001',
    userId: 'user-001',
    type: 'interaction',
    content: '用户为女儿选择了迪士尼乐园作为生日礼物',
    metadata: { contact: '女儿', occasion: 'birthday', choice: 'theme_park' },
    createdAt: '2026-05-15T00:00:00Z',
  },
  {
    id: 'mem-002',
    userId: 'user-001',
    type: 'preference',
    content: '用户偏好高端茶叶作为商务礼品',
    metadata: { category: 'tea', price_range: '500-1000', occasion: 'business' },
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'mem-003',
    userId: 'user-001',
    type: 'feedback',
    content: '用户对上次推荐的餐厅表示满意',
    metadata: { restaurant: '全聚德', rating: 5 },
    createdAt: '2026-06-10T00:00:00Z',
  },
];

/**
 * 学习用户偏好
 */
export function learnPreference(
  userId: string,
  category: PreferenceCategory,
  key: string,
  value: string | number | boolean,
  weight: number = 1
): UserPreference {
  const existing = DEMO_PREFERENCES.find(
    p => p.userId === userId && p.category === category && p.key === key
  );

  if (existing) {
    // 更新现有偏好
    existing.confidence = Math.min(1, existing.confidence + 0.05 * weight);
    existing.sampleCount += 1;
    existing.lastUpdated = new Date().toISOString();
    return existing;
  }

  // 创建新偏好
  const newPref: UserPreference = {
    id: `pref-${Date.now()}`,
    userId,
    category,
    key,
    value,
    confidence: 0.5,
    sampleCount: 1,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  DEMO_PREFERENCES.push(newPref);
  return newPref;
}

/**
 * 获取用户偏好
 */
export function getUserPreferences(
  userId: string,
  category?: PreferenceCategory
): UserPreference[] {
  return DEMO_PREFERENCES.filter(
    p => p.userId === userId && (!category || p.category === category)
  );
}

/**
 * 获取礼品偏好
 */
export function getGiftPreference(userId: string): GiftPreference {
  const prefs = getUserPreferences(userId, 'gift');
  
  return {
    preferredCategories: prefs
      .find(p => p.key === 'preferred_category')
      ?.value.toString().split(',') || ['茶叶', '保健品'],
    preferredPriceRange: {
      min: 200,
      max: 800,
    },
    avoidedItems: ['烟酒'],
    seasonalPreferences: {
      spring: ['茶叶', '鲜花'],
      summer: ['水果', '冷饮'],
      autumn: ['保健品', '茶叶'],
      winter: ['保健品', '暖品'],
    },
    recipientPreferences: {
      elder: ['保健品', '茶叶'],
      peer: ['红酒', '书籍'],
      junior: ['书籍', '电子产品'],
    },
  };
}

/**
 * 获取餐厅偏好
 */
export function getRestaurantPreference(userId: string): RestaurantPreference {
  const prefs = getUserPreferences(userId, 'restaurant');
  
  return {
    preferredCuisines: ['中餐', '日料', '粤菜'],
    preferredPricePerPerson: 300,
    preferredAmbiance: ['安静', '私密', '商务'],
    avoidedCuisines: [],
    preferredLocations: ['市中心', '酒店内'],
  };
}

/**
 * 获取预算偏好
 */
export function getBudgetPreference(userId: string): BudgetPreference {
  const prefs = getUserPreferences(userId, 'budget');
  
  return {
    monthlyBudget: 5000,
    categoryBudgets: {
      gift: 2000,
      dining: 1500,
      travel: 1000,
      other: 500,
    },
    spendingPattern: 'moderate',
    festivalMultiplier: 1.5,
  };
}

/**
 * 记录记忆条目
 */
export function recordMemory(
  userId: string,
  type: MemoryEntry['type'],
  content: string,
  metadata: Record<string, unknown> = {}
): MemoryEntry {
  const entry: MemoryEntry = {
    id: `mem-${Date.now()}`,
    userId,
    type,
    content,
    metadata,
    createdAt: new Date().toISOString(),
  };

  DEMO_MEMORIES.push(entry);
  return entry;
}

/**
 * 获取相关记忆
 */
export function getRelevantMemories(
  userId: string,
  query: string,
  limit: number = 10
): MemoryEntry[] {
  // 简单的关键词匹配
  return DEMO_MEMORIES
    .filter(m => m.userId === userId)
    .filter(m => 
      m.content.includes(query) ||
      Object.values(m.metadata).some(v => 
        String(v).includes(query)
      )
    )
    .slice(0, limit);
}

/**
 * 分析偏好模式
 */
export function analyzePreferencePatterns(userId: string): PreferencePattern[] {
  const prefs = getUserPreferences(userId);
  const patterns: PreferencePattern[] = [];

  // 分析礼品偏好模式
  const giftPrefs = prefs.filter(p => p.category === 'gift');
  if (giftPrefs.length > 0) {
    patterns.push({
      category: 'gift',
      pattern: '偏好中高端礼品，注重品质',
      frequency: giftPrefs.reduce((sum, p) => sum + p.sampleCount, 0),
      examples: giftPrefs.map(p => `${p.key}: ${p.value}`),
    });
  }

  // 分析预算偏好模式
  const budgetPrefs = prefs.filter(p => p.category === 'budget');
  if (budgetPrefs.length > 0) {
    patterns.push({
      category: 'budget',
      pattern: '预算适中，节日会有所增加',
      frequency: budgetPrefs.reduce((sum, p) => sum + p.sampleCount, 0),
      examples: budgetPrefs.map(p => `${p.key}: ${p.value}`),
    });
  }

  return patterns;
}

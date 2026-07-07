/**
 * Template System Types - 模板系统类型定义
 * 
 * 定义身份模板、节日模板、礼品模板、场景模板的类型
 */

// ============================================================================
// 身份模板 (Identity Template)
// ============================================================================

export interface IdentityTemplate {
  id: string;
  name: string;
  category: 'business' | 'family' | 'social' | 'service';
  description: string;
  
  // 默认合规规则
  compliance: {
    giftLimitCny?: number;
    hospitalityLimitCny?: number;
    riskTags: string[];
    policyNote: string;
  };
  
  // 默认提醒策略
  reminder: {
    birthdayAdvanceDays: number[];
    festivalAdvanceDays: number[];
    escalationChain: string[];
  };
  
  // 默认推荐偏好
  recommendation: {
    giftCategories: string[];
    avoidCategories: string[];
    budgetRange: { min: number; max: number };
    preferredProviders: string[];
  };
  
  // 关联的场景模板
  scenarioTemplates: string[];
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isPreset: boolean;
}

// ============================================================================
// 节日模板 (Festival Template)
// ============================================================================

export interface FestivalTemplate {
  id: string;
  name: string;
  dateType: 'solar' | 'lunar' | 'variable';
  date?: string;           // MM-DD 格式
  lunarDate?: string;      // 农历日期 MM-DD
  rule?: string;           // RRULE 格式（如母亲节）
  description: string;
  
  // 提前提醒天数
  advanceReminders: number[];
  
  // 场景化推荐配置
  scenarios: FestivalScenario[];
  
  // 合规特殊规则
  complianceOverride?: {
    giftLimitMultiplier: number;
    note: string;
  };
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isPreset: boolean;
}

export interface FestivalScenario {
  identityCategory: string;
  giftSuggestions: GiftSuggestion[];
  greetingTemplates: string[];
  diningSuggestions?: boolean;
  budgetGuidance: { min: number; max: number; typical: number };
}

export interface GiftSuggestion {
  label: string;
  priceRange: [number, number];
  providers: string[];
  description?: string;
}

// ============================================================================
// 礼品模板 (Gift Template)
// ============================================================================

export interface GiftTemplate {
  id: string;
  name: string;
  category: 'gift' | 'food' | 'experience' | 'health' | 'digital';
  description: string;
  
  // 适用场景
  occasions: string[];
  
  // 适用身份类别
  identityCategories: string[];
  
  // 价格梯度
  tiers: GiftTier[];
  
  // 推荐平台
  providers: GiftProvider[];
  
  // 注意事项
  warnings: string[];
  
  // 季节性
  seasonal?: {
    spring?: boolean;
    summer?: boolean;
    autumn?: boolean;
    winter?: boolean;
  };
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isPreset: boolean;
}

export interface GiftTier {
  label: string;
  priceRange: { min: number; max: number };
  items: GiftItem[];
}

export interface GiftItem {
  name: string;
  price: number;
  provider: string;
  url?: string;
  imageUrl?: string;
  description?: string;
}

export interface GiftProvider {
  name: string;
  searchUrl: string;
  affiliateTag?: string;
}

// ============================================================================
// 场景模板 (Scenario Template)
// ============================================================================

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  
  // 触发条件
  triggers: {
    identityTemplateId?: string;
    festivalTemplateId?: string;
    occasion: string;
  };
  
  // 方案组成
  components: ScenarioComponent[];
  
  // 时间线
  timeline: ScenarioTimelineItem[];
  
  // 检查清单
  checklist: ScenarioChecklistItem[];
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isPreset: boolean;
}

export interface ScenarioComponent {
  type: 'gift' | 'dining' | 'greeting' | 'transport' | 'hotel';
  templateId?: string;
  required: boolean;
  budgetAllocation: number;
}

export interface ScenarioTimelineItem {
  daysBefore: number;
  action: string;
  autoTrigger: boolean;
}

export interface ScenarioChecklistItem {
  item: string;
  autoVerifiable: boolean;
}

// ============================================================================
// 模板组合结果 (Template Match Result)
// ============================================================================

export interface TemplateMatchResult {
  identityTemplate?: IdentityTemplate;
  festivalTemplate?: FestivalTemplate;
  scenarioTemplates: ScenarioTemplate[];
  giftTemplates: GiftTemplate[];
  recommendedActions: RecommendedAction[];
}

export interface RecommendedAction {
  type: 'create_event' | 'update_contact' | 'generate_plan' | 'set_reminder' | 'send_notification';
  description: string;
  priority: 'high' | 'medium' | 'low';
  autoExecutable: boolean;
  params?: Record<string, unknown>;
}

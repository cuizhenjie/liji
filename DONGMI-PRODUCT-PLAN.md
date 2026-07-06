# 礼记 - 董秘维度产品深度规划

> 版本：v1.0  
> 日期：2026-07-06  
> 定位：以"董秘"为核心用户画像，构建全链路生活服务平台

---

## 一、董秘用户画像深度分析

### 1.1 谁是"董秘"

"董秘"并非仅指上市公司董事会秘书，而是泛指 **高管身边的事务管理者**：

| 角色 | 典型场景 | 核心诉求 |
|------|----------|----------|
| 上市公司董秘 | 董事会筹备、投资者关系、合规披露 | 日程精准、合规零失误 |
| 董事长私人秘书 | 老板家庭/商务事务全管 | 人情不漏、提醒及时 |
| 总裁办行政助理 | 高管差旅、接待、礼品采购 | 效率优先、预算可控 |
| 家族办公室管家 | 家族成员生日、纪念日、聚会 | 隐私安全、贴心周到 |
| 创业者配偶 | 帮伴侣管理人脉、节日问候 | 简单好用、不费脑 |

### 1.2 董秘的核心痛点

```
                    ┌─────────────────────────────┐
                    │       董秘的一天              │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   07:00 早上                12:00 中午               18:00 晚上
   ├── 检查老板今日日程        ├── 确认下午接待          ├── 整理明日待办
   ├── 提醒：母亲农历生日      │   餐厅已预订            ├── 发现遗漏：
   │   (农历转换容易出错)       ├── 确认：客户礼品          │   下周三客户生日
   ├── 提醒：房贷扣款          │   已下单                 │   还没准备
   │   (不能忘)                ├── 提醒：15:00 董事会      ├── 紧急：
   └── 提醒：客户王总          │   材料已备齐              │   老板说"帮我给
       生日礼物还没准备         └── 确认：晚宴座位            │   张总订个蛋糕"
        (已经过了3天)              安排妥当                  └── 这类临时需求
                                 └──                          最多
```

### 1.3 痛点矩阵

| 痛点 | 频率 | 严重度 | 当前方案 | 礼记方案 |
|------|------|--------|----------|----------|
| 农历/公历转换混乱 | 每日 | 高 | 手机日历+手动查 | AI 自动转换+提前提醒 |
| 临时需求记录难 | 每小时 | 高 | 便签/微信收藏 | 语音/文字一键采集 |
| 合规限额记不住 | 每月 | 极高 | 问财务/查制度 | 自动匹配合规规则 |
| 礼品选择困难 | 每次 | 中 | 凭经验/问同事 | LLM 基于偏好推荐 |
| 多平台比价耗时 | 每次 | 中 | 逐个打开App | 一键跳转+联盟比价 |
| 事后忘记入账 | 每周 | 中 | 月底集中补 | 短信自动识别入账 |
| 老板临时交代 | 每天 | 高 | 微信聊天记录 | 语音采集→AI解析→确认 |
| 重复提醒疲劳 | 每天 | 低 | 手动关闭 | 智能升级/降级 |

### 1.4 董秘使用礼记的典型旅程

```
采集 → 解析 → 确认 → 画像更新 → 日程生成 → 提醒升级 → 方案推荐 → 履约跳转 → 对账 → 复盘
 │       │       │        │          │          │          │          │        │       │
 │       │       │        │          │          │          │          │        │       └── 月度洞察
 │       │       │        │          │          │          │          │        └── 账单核对
 │       │       │        │          │          │          │          └── 京东/美团/携程
 │       │       │        │          │          │          └── 礼品/餐厅/酒店推荐
 │       │       │        │          │          └── Push → SMS → 语音
 │       │       │        │          └── 60天/15天/25天提醒
 │       │       │        └── 偏好/禁忌/合规标签
 │       │       └── 董秘一键确认/修改
 │       └── AI 提取：谁/什么/何时/多少钱
 └── 语音："帮我记一下，下周三张总生日，预算500"
```

---

## 二、Skill 体系架构设计

### 2.1 Skill 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        礼记 Skill 平台                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  L1: 基础能力 │  │  L2: 业务能力 │  │  L3: 智能推荐能力    │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │              │  │              │  │                      │  │
│  │ · 采集解析    │  │ · 合规引擎    │  │ · 礼品推荐 Skill     │  │
│  │ · PII 脱敏   │  │ · 预算管控    │  │ · 餐厅推荐 Skill     │  │
│  │ · 日历转换    │  │ · 提醒升级    │  │ · 酒店推荐 Skill     │  │
│  │ · 通知投递    │  │ · 履约对账    │  │ · 出行推荐 Skill     │  │
│  │ · 存储同步    │  │ · 发票管理    │  │ · 健康关怀 Skill     │  │
│  │              │  │              │  │ · 节日问候 Skill     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              L4: 模板引擎 (Template Engine)               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  · 身份模板 (Identity Template)                           │   │
│  │  · 节日模板 (Festival Template)                           │   │
│  │  · 礼品模板 (Gift Template)                               │   │
│  │  · 差旅模板 (Travel Template)                             │   │
│  │  · 场景模板 (Scenario Template)                           │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              L5: LLM 智能层                               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  · 自然语言理解 (NLU)                                     │   │
│  │  · 意图识别与槽位填充                                      │   │
│  │  · 偏好推理与记忆召回                                      │   │
│  │  · 方案生成与文案润色                                      │   │
│  │  · 多轮对话与上下文管理                                    │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心 Skill 详细设计

#### 2.2.1 礼品推荐 Skill

```typescript
// Skill 定义
interface GiftRecommendationSkill {
  name: "gift-recommendation";
  version: "1.0.0";
  
  input: {
    contactId: string;          // 联系人ID
    occasion: string;           // 场景：生日/节日/感谢/道歉
    budgetRange: { min: number; max: number };  // 预算区间
    compliance?: ComplianceProfile;  // 合规限制
    preferences?: Preference[];  // 联系人偏好
    history?: Transaction[];     // 历史送礼记录
    season?: string;             // 季节
    relationship?: string;       // 关系类型
  };
  
  output: {
    recommendations: GiftItem[];  // 推荐列表
    rationale: string;            // 推荐理由
    warnings: string[];           // 风险提示
    alternatives: GiftItem[];     // 备选方案
  };
}

// 推荐策略
type GiftStrategy = 
  | "preference_match"      // 偏好匹配：基于联系人偏好标签
  | "history_avoid"         // 历史规避：避免重复送礼
  | "season_appropriate"    // 季节适宜：当季推荐
  | "compliance_safe"       // 合规安全：不超限
  | "relationship_match"    // 关系匹配：身份对应
  | "trending_popular"      // 热门趋势：平台热销
  | "health_conscious"      // 健康关怀：长辈/儿童特供
  | "experience_over_thing";// 体验优先：非实物类
```

**推荐引擎决策流：**

```
输入：联系人画像 + 场景 + 预算 + 合规
         │
         ▼
┌─────────────────┐
│ 1. 合规预检      │ ← 合规 Skill
│    限额/禁忌过滤  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 偏好匹配      │ ← AI 记忆 Skill
│    food/gift/    │
│    hobby/avoid   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 历史规避      │ ← 履约 Skill
│    近6月已送清单  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. 场景适配      │ ← 模板引擎
│    节日/生日/    │
│    商务/家庭     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. LLM 排序打分  │ ← LLM 层
│    综合评分+文案  │
└────────┬────────┘
         │
         ▼
输出：Top 5 推荐 + 理由 + 购买链接
```

#### 2.2.2 餐厅推荐 Skill

```typescript
interface RestaurantRecommendationSkill {
  name: "restaurant-recommendation";
  
  input: {
    contactId: string;
    partySize: number;           // 用餐人数
    location: { city: string; district?: string };
    budgetPerPerson: number;     // 人均预算
    dietaryRestrictions: string[]; // 忌口/过敏
    ambience: "quiet" | "business" | "casual" | "luxury";
    cuisine?: string[];          // 菜系偏好
    compliance?: ComplianceProfile;
  };
  
  output: {
    restaurants: RestaurantItem[];
    bookingUrl?: string;         // 美团/大众点评预订链接
    rationale: string;
  };
}
```

#### 2.2.3 健康关怀 Skill

```typescript
interface HealthCareSkill {
  name: "health-care";
  
  input: {
    contactId: string;
    age: number;
    gender: "male" | "female";
    relation: string;            // 关系：父母/子女/配偶
    lastHealthCheck?: string;    // 上次体检时间
    healthNotes?: string[];      // 健康备注
  };
  
  output: {
    reminders: HealthReminder[];  // 体检/疫苗/用药提醒
    giftSuggestions: GiftItem[];  // 健康类礼品推荐
    seasonalTips: string[];       // 季节性健康建议
  };
}
```

### 2.3 Skill 注册与调用机制

```typescript
// Skill 注册表
interface SkillRegistry {
  // 基础能力
  "capture-parse": CaptureParseSkill;
  "pii-masking": PiiMaskingSkill;
  "calendar-convert": CalendarConvertSkill;
  "notification-send": NotificationSendSkill;
  
  // 业务能力
  "compliance-check": ComplianceCheckSkill;
  "budget-control": BudgetControlSkill;
  "reminder-escalate": ReminderEscalateSkill;
  "fulfillment-track": FulfillmentTrackSkill;
  
  // 智能推荐
  "gift-recommendation": GiftRecommendationSkill;
  "restaurant-recommendation": RestaurantRecommendationSkill;
  "hotel-recommendation": HotelRecommendationSkill;
  "travel-recommendation": TravelRecommendationSkill;
  "health-care": HealthCareSkill;
  "festival-greeting": FestivalGreetingSkill;
  
  // 模板引擎
  "template-identity": IdentityTemplateSkill;
  "template-festival": FestivalTemplateSkill;
  "template-gift": GiftTemplateSkill;
  "template-travel": TravelTemplateSkill;
  "template-scenario": ScenarioTemplateSkill;
}

// Skill 调用链
async function executeSkillChain(
  chain: SkillChain,
  context: SkillContext
): Promise<SkillResult> {
  let result = context;
  for (const skillId of chain.steps) {
    const skill = registry.get(skillId);
    result = await skill.execute(result);
    if (result.aborted) break;
  }
  return result;
}
```

---

## 三、模板系统设计

### 3.1 身份模板 (Identity Template)

身份模板定义了不同关系类型的默认行为、合规规则和推荐策略。

```typescript
interface IdentityTemplate {
  id: string;
  name: string;                    // "国企高管" / "家庭成员" / "亲密朋友"
  category: "business" | "family" | "social" | "service";
  
  // 默认合规规则
  compliance: {
    giftLimitCny?: number;
    hospitalityLimitCny?: number;
    riskTags: string[];
    policyNote: string;
  };
  
  // 默认提醒策略
  reminder: {
    birthdayAdvanceDays: number[];  // [60, 15, 3, 1]
    festivalAdvanceDays: number[];  // [30, 7, 1]
    escalationChain: ReminderLevel[]; // [push, sms, voice]
  };
  
  // 默认推荐偏好
  recommendation: {
    giftCategories: string[];       // 推荐礼品类别
    avoidCategories: string[];      // 避免的类别
    budgetRange: { min: number; max: number };
    preferredProviders: string[];   // 优先平台
  };
  
  // 场景模板关联
  scenarioTemplates: string[];      // 关联的场景模板ID
}

// 预置身份模板
const presetIdentityTemplates: IdentityTemplate[] = [
  {
    id: "identity-soe-executive",
    name: "国企高管",
    category: "business",
    compliance: {
      giftLimitCny: 200,
      hospitalityLimitCny: 500,
      riskTags: ["国企高管"],
      policyNote: "触发商务合规限制：礼品不超过200元，宴请不超过500元。",
    },
    reminder: {
      birthdayAdvanceDays: [60, 15, 3],
      festivalAdvanceDays: [30, 7, 1],
      escalationChain: ["level_1", "level_2", "level_3"],
    },
    recommendation: {
      giftCategories: ["办公用品", "茶叶", "书籍"],
      avoidCategories: ["奢侈品", "现金卡"],
      budgetRange: { min: 100, max: 200 },
      preferredProviders: ["京东"],
    },
    scenarioTemplates: ["scenario-business-birthday", "scenario-business-festival"],
  },
  {
    id: "identity-family-elder",
    name: "家庭长辈",
    category: "family",
    compliance: {
      riskTags: [],
      policyNote: "家庭关系，无商务合规限制。",
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 1],
      festivalAdvanceDays: [15, 7, 1],
      escalationChain: ["level_2", "level_3"],
    },
    recommendation: {
      giftCategories: ["保健品", "体检套餐", "保暖用品", "低糖食品"],
      avoidCategories: ["酒精", "高糖食品"],
      budgetRange: { min: 200, max: 2000 },
      preferredProviders: ["京东", "美团"],
    },
    scenarioTemplates: ["scenario-family-birthday", "scenario-family-festival", "scenario-health-care"],
  },
  {
    id: "identity-family-child",
    name: "家庭晚辈",
    category: "family",
    compliance: { riskTags: [], policyNote: "家庭关系，无商务合规限制。" },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 1],
      festivalAdvanceDays: [15, 7, 1],
      escalationChain: ["level_2"],
    },
    recommendation: {
      giftCategories: ["玩具", "绘本", "教育课程", "运动装备"],
      avoidCategories: ["成人用品", "高糖零食"],
      budgetRange: { min: 100, max: 1000 },
      preferredProviders: ["京东", "淘宝"],
    },
    scenarioTemplates: ["scenario-child-birthday", "scenario-children-day"],
  },
  {
    id: "identity-private-friend",
    name: "亲密朋友",
    category: "social",
    compliance: { riskTags: [], policyNote: "私人关系，无商务合规限制。" },
    reminder: {
      birthdayAdvanceDays: [15, 7, 1],
      festivalAdvanceDays: [7, 1],
      escalationChain: ["level_2"],
    },
    recommendation: {
      giftCategories: ["个性化礼品", "体验类", "美食", "文创"],
      avoidCategories: [],
      budgetRange: { min: 100, max: 800 },
      preferredProviders: ["淘宝", "京东"],
    },
    scenarioTemplates: ["scenario-friend-birthday", "scenario-friend-gathering"],
  },
  {
    id: "identity-private-client",
    name: "重要客户",
    category: "business",
    compliance: {
      giftLimitCny: 500,
      hospitalityLimitCny: 1000,
      riskTags: ["重要客户"],
      policyNote: "商务关系，建议控制礼品和宴请预算。",
    },
    reminder: {
      birthdayAdvanceDays: [30, 15, 7, 3, 1],
      festivalAdvanceDays: [15, 7, 3, 1],
      escalationChain: ["level_1", "level_2", "level_3"],
    },
    recommendation: {
      giftCategories: ["茶叶", "红酒", "高端办公", "地方特产"],
      avoidCategories: ["过于私人化", "现金等价物"],
      budgetRange: { min: 200, max: 500 },
      preferredProviders: ["京东", "美团"],
    },
    scenarioTemplates: ["scenario-client-birthday", "scenario-client-entertainment", "scenario-client-festival"],
  },
];
```

### 3.2 节日模板 (Festival Template)

```typescript
interface FestivalTemplate {
  id: string;
  name: string;                    // "春节" / "中秋" / "母亲节"
  dateType: "solar" | "lunar" | "variable";  // 公历/农历/浮动
  date?: string;                   // 固定日期 MM-DD
  lunarDate?: string;              // 农历日期
  rule?: string;                   // RRULE (如母亲节: 5月第2个周日)
  
  // 提前提醒天数
  advanceReminders: number[];      // [30, 15, 7, 3, 1]
  
  // 场景化推荐配置
  scenarios: {
    identityCategory: string;      // 适用的身份类别
    giftSuggestions: GiftSuggestion[];
    greetingTemplates: string[];   // 问候语文案模板
    diningSuggestions?: boolean;   // 是否推荐聚餐
    budgetGuidance: { min: number; max: number; typical: number };
  }[];
  
  // 合规特殊规则
  complianceOverride?: {
    giftLimitMultiplier: number;   // 节日限额倍数（如春节可上浮50%）
    note: string;
  };
}

// 预置节日模板（部分）
const presetFestivalTemplates: FestivalTemplate[] = [
  {
    id: "festival-spring",
    name: "春节",
    dateType: "lunar",
    lunarDate: "01-01",
    advanceReminders: [30, 15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: "family",
        giftSuggestions: [
          { label: "年货礼盒", priceRange: [200, 500], providers: ["京东", "淘宝"] },
          { label: "红包/压岁钱", priceRange: [200, 2000], providers: ["微信"] },
          { label: "保健品", priceRange: [300, 1000], providers: ["京东"] },
        ],
        greetingTemplates: [
          "新春快乐！祝您和家人身体健康、万事如意。",
          "给您拜年了！新的一年事业顺利、阖家幸福。",
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 500, max: 5000, typical: 2000 },
      },
      {
        identityCategory: "business",
        giftSuggestions: [
          { label: "茶叶礼盒", priceRange: [200, 500], providers: ["京东"] },
          { label: "地方特产", priceRange: [100, 300], providers: ["淘宝"] },
          { label: "办公文创", priceRange: [100, 200], providers: ["京东"] },
        ],
        greetingTemplates: [
          "X总，新春快乐！感谢过去一年的关照，祝新年事业更上一层楼。",
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 200, max: 500, typical: 300 },
      },
    ],
    complianceOverride: {
      giftLimitMultiplier: 1.5,
      note: "春节期间商务礼品限额可上浮50%。",
    },
  },
  {
    id: "festival-mid-autumn",
    name: "中秋节",
    dateType: "lunar",
    lunarDate: "08-15",
    advanceReminders: [30, 15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: "family",
        giftSuggestions: [
          { label: "月饼礼盒", priceRange: [100, 500], providers: ["京东", "美团"] },
          { label: "水果礼篮", priceRange: [200, 500], providers: ["美团"] },
          { label: "大闸蟹", priceRange: [300, 800], providers: ["京东"] },
        ],
        greetingTemplates: [
          "月圆人团圆，祝您中秋快乐、阖家幸福！",
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 300, max: 2000, typical: 800 },
      },
      {
        identityCategory: "business",
        giftSuggestions: [
          { label: "品牌月饼", priceRange: [200, 500], providers: ["京东"] },
          { label: "茶叶+月饼组合", priceRange: [300, 500], providers: ["京东"] },
        ],
        greetingTemplates: [
          "X总，中秋将至，祝您和家人团圆美满、事业圆满。",
        ],
        budgetGuidance: { min: 200, max: 500, typical: 300 },
      },
    ],
  },
  {
    id: "festival-mothers-day",
    name: "母亲节",
    dateType: "variable",
    rule: "RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU",
    advanceReminders: [15, 7, 3, 1],
    scenarios: [
      {
        identityCategory: "family",
        giftSuggestions: [
          { label: "康乃馨花束", priceRange: [100, 300], providers: ["美团"] },
          { label: "护肤品套装", priceRange: [300, 800], providers: ["京东", "淘宝"] },
          { label: "体检套餐", priceRange: [500, 2000], providers: ["美团"] },
          { label: "按摩仪", priceRange: [300, 1000], providers: ["京东"] },
        ],
        greetingTemplates: [
          "妈妈，母亲节快乐！感谢您一直以来的付出，我爱您。",
        ],
        diningSuggestions: true,
        budgetGuidance: { min: 300, max: 2000, typical: 800 },
      },
    ],
  },
  // ... 更多节日模板
];
```

### 3.3 礼品模板 (Gift Template)

```typescript
interface GiftTemplate {
  id: string;
  name: string;                    // "茶叶礼盒" / "生日蛋糕" / "商务伴手礼"
  category: "gift" | "food" | "experience" | "health" | "digital";
  
  // 适用场景
  occasions: string[];             // ["birthday", "festival", "thanks"]
  
  // 适用身份
  identityCategories: string[];    // ["family", "business", "social"]
  
  // 价格梯度
  tiers: {
    label: string;                 // "经济" / "品质" / "高端"
    priceRange: { min: number; max: number };
    items: GiftItem[];
  }[];
  
  // 推荐平台
  providers: {
    name: string;                  // "京东" / "淘宝" / "美团"
    searchUrl: string;             // 搜索链接模板
    affiliateTag?: string;         // 联盟追踪参数
  }[];
  
  // 注意事项
  warnings: string[];              // "注意保质期" / "需冷链配送"
  
  // 季节性
  seasonal?: {
    spring?: boolean;
    summer?: boolean;
    autumn?: boolean;
    winter?: boolean;
  };
}
```

### 3.4 场景模板 (Scenario Template)

场景模板是将身份+节日+礼品组合的完整方案模板。

```typescript
interface ScenarioTemplate {
  id: string;
  name: string;                    // "客户生日宴请方案"
  description: string;
  
  // 触发条件
  triggers: {
    identityTemplateId?: string;
    festivalTemplateId?: string;
    occasion: string;
  };
  
  // 方案组成
  components: {
    type: "gift" | "dining" | "greeting" | "transport" | "hotel";
    templateId?: string;           // 关联的礼品/餐厅模板
    required: boolean;
    budgetAllocation: number;      // 预算占比 (0-1)
  }[];
  
  // 时间线
  timeline: {
    daysBefore: number;
    action: string;
    autoTrigger: boolean;
  }[];
  
  // 检查清单
  checklist: {
    item: string;
    autoVerifiable: boolean;
  }[];
}

// 示例：客户生日宴请方案
const clientBirthdayScenario: ScenarioTemplate = {
  id: "scenario-client-birthday",
  name: "客户生日宴请方案",
  description: "为重要客户准备生日礼品和宴请的完整方案",
  triggers: {
    identityTemplateId: "identity-private-client",
    occasion: "birthday",
  },
  components: [
    { type: "gift", required: true, budgetAllocation: 0.4 },
    { type: "dining", required: true, budgetAllocation: 0.4 },
    { type: "greeting", required: true, budgetAllocation: 0 },
    { type: "transport", required: false, budgetAllocation: 0.2 },
  ],
  timeline: [
    { daysBefore: 30, action: "生成方案草稿", autoTrigger: true },
    { daysBefore: 15, action: "确认礼品选择", autoTrigger: false },
    { daysBefore: 7, action: "预订餐厅", autoTrigger: false },
    { daysBefore: 3, action: "确认所有安排", autoTrigger: true },
    { daysBefore: 1, action: "发送提醒", autoTrigger: true },
    { daysBefore: 0, action: "执行日", autoTrigger: false },
  ],
  checklist: [
    { item: "礼品已下单", autoVerifiable: true },
    { item: "餐厅已预订", autoVerifiable: false },
    { item: "确认忌口/过敏", autoVerifiable: false },
    { item: "合规限额检查", autoVerifiable: true },
    { item: "问候语已准备", autoVerifiable: false },
  ],
};
```

---

## 四、数据采集简化方案

### 4.1 采集入口矩阵

```
┌─────────────────────────────────────────────────────────────┐
│                    数据采集入口                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐  │
│  │  语音    │  │  文字    │  │  截图    │  │  短信/账单   │  │
│  │         │  │         │  │  OCR     │  │  自动解析    │  │
│  │ 长按录音 │  │ 快捷输入 │  │ 拍照识别 │  │  银行通知    │  │
│  │ 自动转写 │  │ 一句话   │  │ 微信聊天 │  │  消费短信    │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬───────┘  │
│       │            │            │               │          │
│       └────────────┴────────────┴───────────────┘          │
│                            │                               │
│                            ▼                               │
│                 ┌──────────────────┐                       │
│                 │   AI 解析引擎     │                       │
│                 │                  │                       │
│                 │ · 意图识别        │                       │
│                 │ · 实体提取        │                       │
│                 │ · 关系推理        │                       │
│                 │ · 置信度评分      │                       │
│                 └────────┬─────────┘                       │
│                          │                                 │
│                          ▼                                 │
│                 ┌──────────────────┐                       │
│                 │   确认中心        │                       │
│                 │                  │                       │
│                 │ 一键确认/修改/驳回│                       │
│                 │ 批量处理         │                       │
│                 └──────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 极简采集设计原则

**核心原则：3秒完成一次采集**

| 场景 | 操作 | 耗时 | 示例 |
|------|------|------|------|
| 语音采集 | 长按 → 说话 → 松手 | 3秒 | "帮我记一下下周三张总生日" |
| 文字采集 | 输入框 → 打字 → 回车 | 5秒 | "下周带妈妈去体检" |
| 截图采集 | 分享 → 选择礼记 | 2秒 | 微信聊天截图自动识别 |
| 短信采集 | 自动监听 → 推送确认 | 0秒 | 银行扣款短信自动入账 |
| 名片采集 | 拍照 → 自动入库 | 3秒 | 名片OCR→联系人画像 |

### 4.3 AI 解析增强

```typescript
// 增强版解析 Schema
interface EnhancedParsedInput {
  // 基础字段
  intent: ParsedIntent;
  title: string;
  confidence: number;
  
  // 智能推断字段
  inferredContact?: {
    name: string;
    relation?: string;
    identityTemplateId?: string;  // 自动匹配身份模板
  };
  
  inferredDate?: {
    date: string;
    calendarType: "solar" | "lunar";
    isRecurring: boolean;
    rrule?: string;
  };
  
  inferredBudget?: {
    amount: number;
    source: "explicit" | "template_default" | "history_average";
    templateId?: string;
  };
  
  inferredReminder?: {
    level: ReminderLevel;
    advanceDays: number[];
    source: "identity_template" | "user_override";
  };
  
  // 关联推荐
  suggestedActions: {
    type: "create_event" | "update_contact" | "generate_plan" | "set_reminder";
    description: string;
    autoExecutable: boolean;
  }[];
  
  // LLM 生成的确认文案
  confirmationPrompt: string;
}
```

---

## 五、提醒与 LLM 推荐引擎

### 5.1 多级提醒引擎

```
时间轴 ──────────────────────────────────────────────────────►

         60天        30天        15天        7天    3天   1天    当天
          │           │           │          │      │     │      │
          ▼           ▼           ▼          ▼      ▼     ▼      ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ ┌───┐ ┌──┐ ┌──┐
     │ Level 2 │ │ Level 2 │ │ Level 1 │ │Level1│ │L1 │ │L1│ │L1│
     │  提醒    │ │  提醒    │ │  提醒    │ │提醒  │ │提醒│ │提醒│ │提醒│
     │         │ │         │ │         │ │      │ │   │ │  │ │  │
     │ Push    │ │ Push    │ │ Push    │ │Push  │ │SMS│ │SMS│ │语音│
     │ 通知    │ │ 通知    │ │ + 方案  │ │+确认 │ │   │ │  │ │  │
     │         │ │         │ │   推荐  │ │      │ │   │ │  │ │  │
     └─────────┘ └─────────┘ └─────────┘ └──────┘ └───┘ └──┘ └──┘
          │           │           │          │      │     │      │
          │           │           │          │      │     │      │
          │           │           │          │      │     │      └── 最终升级
          │           │           │          │      │     └── 短信再次提醒
          │           │           │          │      └── 短信首次提醒
          │           │           │          └── Push + 确认要求
          │           │           └── Push + LLM 推荐方案
          │           └── Push + 方案预览
          └── 早期提醒（仅高优先级）
```

### 5.2 LLM 推荐决策引擎

```typescript
interface LLMRecommendationEngine {
  // 推荐请求
  recommend(request: {
    // 上下文
    contact: Contact;
    occasion: string;
    budget: number;
    compliance: ComplianceProfile;
    
    // 历史数据
    recentGifts: Transaction[];       // 近6月送礼记录
    recentInteractions: number;       // 近30天互动次数
    lastGiftDate?: string;            // 上次送礼日期
    
    // 偏好数据
    preferences: Preference[];        // 联系人偏好
    avoidTags: string[];              // 避免标签
    
    // 环境数据
    season: string;                   // 当前季节
    festival?: FestivalTemplate;      // 即将到来的节日
    location?: string;                // 所在城市
    
    // 模板数据
    identityTemplate?: IdentityTemplate;
    festivalTemplate?: FestivalTemplate;
    giftTemplates?: GiftTemplate[];
  }): Promise<RecommendationResult>;
  
  // 推荐结果
  interface RecommendationResult {
    // 主推荐
    primary: {
      gift: GiftItem;
      rationale: string;              // LLM 生成的推荐理由
      confidence: number;
    };
    
    // 备选方案
    alternatives: {
      gift: GiftItem;
      rationale: string;
      confidence: number;
      tradeoff: string;               // 与主推荐的取舍说明
    }[];
    
    // 附加建议
    suggestions: {
      type: "greeting" | "timing" | "delivery" | "followup";
      content: string;
    }[];
    
    // 风险提示
    warnings: string[];
  }
}
```

### 5.3 LLM Prompt 工程

```typescript
// 推荐 Prompt 模板
const RECOMMENDATION_PROMPT = `
你是一位专业的商务秘书助手，负责为用户推荐合适的礼品方案。

## 当前场景
- 对象：{{contact.name}}（{{contact.relation}}）
- 场景：{{occasion}}
- 预算：{{budget}}元
- 合规限制：{{compliance.policyNote}}

## 对象画像
- 偏好：{{preferences}}
- 禁忌：{{avoidTags}}
- 近6月已收礼品：{{recentGifts}}
- 上次互动：{{lastInteraction}}

## 环境信息
- 季节：{{season}}
- 节日：{{festival}}
- 城市：{{location}}

## 推荐要求
1. 推荐3个礼品方案，按推荐度排序
2. 每个方案包含：名称、价格区间、推荐理由、购买平台
3. 避免与近6月已送礼品重复
4. 严格遵守合规限额
5. 考虑对象偏好和禁忌
6. 理由要具体、有温度，不要泛泛而谈

## 输出格式
请输出JSON格式：
{
  "primary": { "name": "", "price": "", "provider": "", "rationale": "" },
  "alternatives": [
    { "name": "", "price": "", "provider": "", "rationale": "", "tradeoff": "" }
  ],
  "suggestions": [
    { "type": "greeting|timing|delivery", "content": "" }
  ],
  "warnings": []
}
`;
```

---

## 六、全链路数据流设计

### 6.1 端到端数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          全链路数据流                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  采集层   │───▶│  解析层   │───▶│  确认层   │───▶│  存储层   │          │
│  │          │    │          │    │          │    │          │          │
│  │ · 语音   │    │ · 意图   │    │ · 编辑   │    │ · 联系人  │          │
│  │ · 文字   │    │ · 实体   │    │ · 确认   │    │ · 日程   │          │
│  │ · 截图   │    │ · 关系   │    │ · 驳回   │    │ · 交易   │          │
│  │ · 短信   │    │ · 置信度 │    │ · 批量   │    │ · 记忆   │          │
│  │ · 名片   │    │ · PII    │    │          │    │ · 账单   │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │                                               │                 │
│       │              ┌────────────────────────────────┘                 │
│       │              │                                                  │
│       ▼              ▼                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐          │
│  │       智能层              │    │       提醒层              │          │
│  │                          │    │                          │          │
│  │ · 模板匹配              │    │ · 提醒扫描 (Cron)         │          │
│  │ · 合规检查              │    │ · 升级链 (Push→SMS→Voice) │          │
│  │ · LLM 推荐              │    │ · 回执轮询               │          │
│  │ · 偏好推理              │    │ · 重试机制               │          │
│  │ · 记忆召回              │    │                          │          │
│  └──────────┬───────────────┘    └──────────┬───────────────┘          │
│             │                               │                          │
│             ▼                               ▼                          │
│  ┌──────────────────────────┐    ┌──────────────────────────┐          │
│  │       履约层              │    │       对账层              │          │
│  │                          │    │                          │          │
│  │ · 方案生成              │    │ · 联盟拉单               │          │
│  │ · 平台跳转              │    │ · 短信匹配               │          │
│  │ · 订单追踪              │    │ · 差异检测               │          │
│  │ · 佣金归因              │    │ · 财务审批               │          │
│  └──────────┬───────────────┘    └──────────┬───────────────┘          │
│             │                               │                          │
│             └───────────────┬───────────────┘                          │
│                             │                                          │
│                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │                      复盘层                               │          │
│  │                                                          │          │
│  │  · 月度洞察 (健康度/压力指数/支出分析)                     │          │
│  │  · 预算执行率                                            │          │
│  │  · 人情往来热力图                                         │          │
│  │  · 合规遵从报告                                           │          │
│  │  · 下月风险预警                                           │          │
│  │                                                          │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 数据流状态机

```
                    采集数据生命周期
                    
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  raw    │────▶│ pending │────▶│confirmed│────▶│archived │
    │ (原始)  │     │ (待确认) │     │ (已确认) │     │ (已归档) │
    └─────────┘     └────┬────┘     └─────────┘     └─────────┘
                         │                                ▲
                         │         ┌─────────┐            │
                         └────────▶│rejected │────────────┘
                                   │ (已驳回) │
                                   └─────────┘

                    履约方案生命周期
                    
    ┌─────────┐     ┌─────────────────┐     ┌───────────┐     ┌────────────┐
    │  draft  │────▶│pending_confirm  │────▶│ confirmed │────▶│ bookmarked │
    │ (草稿)  │     │  (待确认)        │     │  (已确认)  │     │  (已下单)   │
    └─────────┘     └────────┬────────┘     └───────────┘     └────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  expired    │
                      │  (已过期)    │
                      └─────────────┘

                    提醒通知生命周期
                    
    ┌─────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
    │ queued  │────▶│  sent   │────▶│ confirmed │────▶│  done     │
    │ (排队中) │     │ (已发送) │     │  (已确认)  │     │ (已完成)   │
    └─────────┘     └────┬────┘     └───────────┘     └───────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
             ┌──────────┐ ┌──────────┐
             │escalated │ │  failed  │
             │ (已升级)  │ │ (失败)   │
             └──────────┘ └──────────┘
```

### 6.3 可视化测试方案

#### 6.3.1 测试场景矩阵

| 场景 | 采集方式 | 解析结果 | 确认操作 | 提醒触发 | 方案生成 | 履约跳转 | 对账 |
|------|----------|----------|----------|----------|----------|----------|------|
| 女儿生日 | 文字 | event | 确认 | 60/15/7/1天 | 礼物+蛋糕 | 京东 | 短信匹配 |
| 客户宴请 | 语音 | travel | 确认 | 3天 | 餐厅+礼品 | 美团 | 手动入账 |
| 房贷扣款 | 短信 | bill | 自动 | 1天 | - | - | 自动匹配 |
| 母亲体检 | 截图 | memory | 确认 | 7天 | 体检套餐 | 美团 | - |
| 春节送礼 | 文字 | event | 确认 | 30/15/7天 | 多对象方案 | 京东 | 批量对账 |

#### 6.3.2 可视化测试检查点

```
测试流程：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: 采集
  ├── 输入："下周五是女儿5岁生日，预算2000元"
  ├── 检查：采集中心出现 pending 条目 ✅
  └── 检查：PII 脱敏正常（无敏感信息泄露） ✅

Step 2: 解析
  ├── 检查：intent = "event" ✅
  ├── 检查：title = "女儿生日" ✅
  ├── 检查：date = 正确计算下周五日期 ✅
  ├── 检查：budgetCny = 2000 ✅
  ├── 检查：confidence > 0.8 ✅
  └── 检查：inferredContact.name = 匹配已有联系人 ✅

Step 3: 确认
  ├── 检查：确认中心显示解析结果 ✅
  ├── 操作：点击确认
  ├── 检查：联系人画像更新 ✅
  ├── 检查：日程表新增条目 ✅
  └── 检查：提醒已设置 ✅

Step 4: 提醒
  ├── 检查：60天前 Push 通知 ✅
  ├── 检查：15天前 Push + 方案推荐 ✅
  ├── 检查：7天前 Push + 确认要求 ✅
  ├── 检查：3天前 SMS 升级 ✅
  └── 检查：1天前 语音升级 ✅

Step 5: 方案推荐
  ├── 检查：LLM 生成3个推荐方案 ✅
  ├── 检查：方案符合预算（≤2000元） ✅
  ├── 检查：避免芒果过敏（禁忌检查） ✅
  ├── 检查：推荐粉色系礼品（偏好匹配） ✅
  └── 检查：购买链接可点击跳转 ✅

Step 6: 履约
  ├── 操作：选择方案1，点击"去京东购买"
  ├── 检查：跳转链接含联盟追踪参数 ✅
  ├── 检查：方案状态变为 "bookmarked" ✅
  └── 检查：CPS 归因记录生成 ✅

Step 7: 对账
  ├── 检查：联盟订单拉取（模拟） ✅
  ├── 检查：金额匹配 ✅
  └── 检查：无差异记录 ✅

Step 8: 复盘
  ├── 检查：月度洞察更新 ✅
  ├── 检查：支出流向正确归类 ✅
  ├── 检查：健康度评分更新 ✅
  └── 检查：下月风险预警 ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 七、实施路线图

### Phase 1: Skill 基础设施（2周）

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 创建 `src/lib/liji/skills/` 目录 | Skill 注册表框架 | P0 |
| 实现 Skill Registry | 注册/发现/调用机制 | P0 |
| 实现 Compliance Skill | 合规检查独立 Skill | P0 |
| 实现 Calendar Convert Skill | 农历/公历转换 | P0 |
| 实现 Notification Skill | 通知投递封装 | P0 |

### Phase 2: 模板引擎（2周）

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 身份模板 CRUD API | `/api/templates/identity` | P0 |
| 节日模板 CRUD API | `/api/templates/festival` | P0 |
| 礼品模板 CRUD API | `/api/templates/gift` | P1 |
| 场景模板 CRUD API | `/api/templates/scenario` | P1 |
| 预置模板数据 | 5个身份+10个节日+20个礼品模板 | P0 |
| 模板选择 UI | 新建联系人时选择身份模板 | P0 |

### Phase 3: LLM 推荐引擎（3周）

| 任务 | 产出 | 优先级 |
|------|------|--------|
| LLM 接入层 | `/api/ai/recommend` 流式接口 | P0 |
| 礼品推荐 Skill | 基于画像+偏好+合规的推荐 | P0 |
| 餐厅推荐 Skill | 基于位置+人数+预算的推荐 | P1 |
| 问候语生成 | LLM 生成个性化问候 | P1 |
| 推荐卡片 UI 升级 | 展示推荐理由+购买链接 | P0 |

### Phase 4: 全链路可视化（2周）

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 数据流可视化组件 | 采集→确认→日程→提醒→履约 流程图 | P1 |
| 提醒时间轴 | 可视化展示提醒升级链 | P1 |
| 预算仪表盘 | 饼图+折线图展示支出趋势 | P1 |
| 人情热力图 | 联系人互动频率可视化 | P2 |
| 合规仪表盘 | 合规遵从率+风险预警 | P1 |

### Phase 5: 集成测试与上线（1周）

| 任务 | 产出 | 优先级 |
|------|------|--------|
| E2E 测试用例 | 5个核心场景全覆盖 | P0 |
| 性能优化 | 首屏 < 2s，API < 500ms | P0 |
| 安全审计 | PII 脱敏+权限检查 | P0 |
| 灰度发布 | 10% 用户先行体验 | P1 |

---

## 八、商业模式与 Skill 变现

### 8.1 Skill 变现路径

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill 变现矩阵                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  免费层（体验版）                                            │
│  ├── 基础采集解析（5次/月）                                  │
│  ├── 3个身份模板                                            │
│  ├── 基础提醒（Push only）                                   │
│  └── 有限推荐（规则引擎，非LLM）                             │
│                                                             │
│  专业版（¥29/月）                                            │
│  ├── 无限采集解析                                            │
│  ├── 全部身份模板 + 自定义模板                                │
│  ├── LLM 推荐（50次/月）                                    │
│  ├── 多级提醒（Push + SMS）                                  │
│  └── 数据导出                                                │
│                                                             │
│  高管版（¥99/月）                                            │
│  ├── 一切专业版功能                                          │
│  ├── 无限 LLM 推荐                                          │
│  ├── 语音升级提醒                                            │
│  ├── 专属客服                                                │
│  ├── 家庭共享（3人）                                         │
│  └── 优先新功能体验                                           │
│                                                             │
│  CPS 佣金（平台收入）                                        │
│  ├── 京东联盟：1-8% 佣金                                    │
│  ├── 美团联盟：2-5% 佣金                                    │
│  ├── 携程联盟：1-3% 佣金                                    │
│  └── 预计月均 GMV：¥50,000 → 佣金 ¥1,500-2,500             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*本文档从董秘视角出发，系统性地规划了礼记产品的 Skill 体系、模板系统、数据采集、LLM 推荐、全链路数据流和可视化测试方案，可作为产品迭代的核心参考。*

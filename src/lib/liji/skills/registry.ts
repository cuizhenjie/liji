/**
 * Skill Registry - 礼记技能注册表
 * 
 * 管理所有 Skill 的注册、发现和调用
 */

import type { ComplianceProfile } from '../types';

// ============================================================================
// Skill 基础类型
// ============================================================================

export interface SkillContext {
  contactId?: string;
  occasion?: string;
  budget?: number;
  compliance?: ComplianceProfile;
  preferences?: Array<{ tag: string; weight: number }>;
  avoidTags?: string[];
  season?: string;
  location?: string;
  [key: string]: unknown;
}

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'base' | 'business' | 'recommendation' | 'template';
  execute: (context: SkillContext) => Promise<SkillResult>;
}

// ============================================================================
// Skill Registry 单例
// ============================================================================

class SkillRegistryClass {
  private skills: Map<string, SkillDefinition> = new Map();
  private initialized = false;

  /**
   * 注册一个 Skill
   */
  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Skill "${skill.id}" already registered, overwriting.`);
    }
    this.skills.set(skill.id, skill);
  }

  /**
   * 获取一个 Skill
   */
  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  /**
   * 检查 Skill 是否已注册
   */
  has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * 列出所有已注册的 Skill
   */
  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按类别列出 Skill
   */
  listByCategory(category: SkillDefinition['category']): SkillDefinition[] {
    return this.list().filter(s => s.category === category);
  }

  /**
   * 执行一个 Skill
   */
  async execute(id: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.get(id);
    if (!skill) {
      return {
        success: false,
        error: `Skill "${id}" not found`,
      };
    }

    try {
      const startTime = Date.now();
      const result = await skill.execute(context);
      const duration = Date.now() - startTime;
      
      console.log(`[SkillRegistry] Executed "${id}" in ${duration}ms, success: ${result.success}`);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          skillId: id,
          skillVersion: skill.version,
          executionTimeMs: duration,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SkillRegistry] Error executing "${id}":`, message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * 执行 Skill 链
   */
  async executeChain(
    chain: string[],
    initialContext: SkillContext
  ): Promise<{ results: Map<string, SkillResult>; finalContext: SkillContext }> {
    const results = new Map<string, SkillResult>();
    let context = { ...initialContext };

    for (const skillId of chain) {
      const result = await this.execute(skillId, context);
      results.set(skillId, result);

      if (!result.success) {
        break; // 链式执行中断
      }

      // 将结果合并到上下文
      if (result.data && typeof result.data === 'object') {
        context = { ...context, ...result.data };
      }
    }

    return { results, finalContext: context };
  }

  /**
   * 初始化所有内置 Skill
   */
  initialize(): void {
    if (this.initialized) return;
    
    // 导入并注册所有内置 Skill
    // 延迟导入以避免循环依赖
    import('./compliance-skill').then(({ complianceSkill }) => {
      this.register(complianceSkill);
    });
    
    import('./calendar-skill').then(({ calendarSkill }) => {
      this.register(calendarSkill);
    });
    
    import('./notification-skill').then(({ notificationSkill }) => {
      this.register(notificationSkill);
    });

    this.initialized = true;
    console.log('[SkillRegistry] Initialized with built-in skills');
  }
}

// 导出单例
export const SkillRegistry = new SkillRegistryClass();

// 自动初始化
SkillRegistry.initialize();

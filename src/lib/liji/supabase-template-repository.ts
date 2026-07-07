/**
 * Supabase-backed template repository
 * 
 * This module provides a repository pattern for template data.
 * When Supabase is not configured, it falls back to preset templates.
 * 
 * Note: Full Supabase integration requires running the migration
 * at supabase/migrations/20260703000000_create_template_tables.sql
 * and ensuring the schema matches the types in template-types.ts
 */

import type {
  IdentityTemplate,
  FestivalTemplate,
  GiftTemplate,
  ScenarioTemplate,
} from "@/lib/liji/skills/template-types";
import { presetIdentityTemplates, presetFestivalTemplates, presetGiftTemplates, presetScenarioTemplates } from "@/lib/liji/skills/preset-templates";

/**
 * Check if Supabase is available
 */
function isSupabaseAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Template Repository Interface
 */
export interface TemplateRepository {
  getIdentityTemplates(): Promise<IdentityTemplate[]>;
  getIdentityTemplate(id: string): Promise<IdentityTemplate | null>;
  createIdentityTemplate(template: Omit<IdentityTemplate, "id" | "createdAt" | "updatedAt">): Promise<IdentityTemplate>;
  
  getFestivalTemplates(): Promise<FestivalTemplate[]>;
  createFestivalTemplate(template: Omit<FestivalTemplate, "id" | "createdAt" | "updatedAt">): Promise<FestivalTemplate>;
  
  getGiftTemplates(occasion?: string): Promise<GiftTemplate[]>;
  createGiftTemplate(template: Omit<GiftTemplate, "id" | "createdAt" | "updatedAt">): Promise<GiftTemplate>;
  
  getScenarioTemplates(category?: string): Promise<ScenarioTemplate[]>;
  createScenarioTemplate(template: Omit<ScenarioTemplate, "id" | "createdAt" | "updatedAt">): Promise<ScenarioTemplate>;
}

/**
 * In-memory template repository (fallback when Supabase is not available)
 */
class InMemoryTemplateRepository implements TemplateRepository {
  private identityTemplates: IdentityTemplate[] = [...presetIdentityTemplates];
  private festivalTemplates: FestivalTemplate[] = [...presetFestivalTemplates];
  private giftTemplates: GiftTemplate[] = [...presetGiftTemplates];
  private scenarioTemplates: ScenarioTemplate[] = [...presetScenarioTemplates];

  async getIdentityTemplates(): Promise<IdentityTemplate[]> {
    return this.identityTemplates;
  }

  async getIdentityTemplate(id: string): Promise<IdentityTemplate | null> {
    return this.identityTemplates.find((t) => t.id === id) ?? null;
  }

  async createIdentityTemplate(template: Omit<IdentityTemplate, "id" | "createdAt" | "updatedAt">): Promise<IdentityTemplate> {
    const now = new Date().toISOString();
    const newTemplate: IdentityTemplate = {
      ...template,
      id: `identity-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.identityTemplates.push(newTemplate);
    return newTemplate;
  }

  async getFestivalTemplates(): Promise<FestivalTemplate[]> {
    return this.festivalTemplates;
  }

  async createFestivalTemplate(template: Omit<FestivalTemplate, "id" | "createdAt" | "updatedAt">): Promise<FestivalTemplate> {
    const now = new Date().toISOString();
    const newTemplate: FestivalTemplate = {
      ...template,
      id: `festival-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.festivalTemplates.push(newTemplate);
    return newTemplate;
  }

  async getGiftTemplates(occasion?: string): Promise<GiftTemplate[]> {
    if (occasion) {
      return this.giftTemplates.filter((t) => t.occasions.includes(occasion));
    }
    return this.giftTemplates;
  }

  async createGiftTemplate(template: Omit<GiftTemplate, "id" | "createdAt" | "updatedAt">): Promise<GiftTemplate> {
    const now = new Date().toISOString();
    const newTemplate: GiftTemplate = {
      ...template,
      id: `gift-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.giftTemplates.push(newTemplate);
    return newTemplate;
  }

  async getScenarioTemplates(category?: string): Promise<ScenarioTemplate[]> {
    if (category) {
      // Filter by category in triggers.occasion
      return this.scenarioTemplates.filter((t) => t.triggers.occasion === category);
    }
    return this.scenarioTemplates;
  }

  async createScenarioTemplate(template: Omit<ScenarioTemplate, "id" | "createdAt" | "updatedAt">): Promise<ScenarioTemplate> {
    const now = new Date().toISOString();
    const newTemplate: ScenarioTemplate = {
      ...template,
      id: `scenario-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.scenarioTemplates.push(newTemplate);
    return newTemplate;
  }
}

/**
 * Get the appropriate template repository
 * Returns Supabase-backed repository when available, otherwise in-memory
 */
export function getTemplateRepository(): TemplateRepository {
  // For now, always use in-memory repository
  // Supabase integration can be added when the schema is fully aligned
  if (isSupabaseAvailable()) {
    // TODO: Implement SupabaseTemplateRepository when schema is aligned
    console.info("Supabase available, but using in-memory templates until schema alignment");
  }
  return new InMemoryTemplateRepository();
}

// Singleton instance
export const templateRepository = getTemplateRepository();

// Re-export preset templates for convenience
export {
  presetIdentityTemplates,
  presetFestivalTemplates,
  presetGiftTemplates,
  presetScenarioTemplates,
};

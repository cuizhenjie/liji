/**
 * Notification Skill - 通知投递技能
 * 
 * 封装通知发送逻辑，支持多级提醒升级
 */

import type { SkillDefinition, SkillContext, SkillResult } from './registry';

// ============================================================================
// 通知类型定义
// ============================================================================

export type NotificationChannel = 'push' | 'sms' | 'voice' | 'email';
export type ReminderLevel = 'level_1' | 'level_2' | 'level_3';

export interface NotificationRequest {
  recipientId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  level: ReminderLevel;
  data?: Record<string, unknown>;
  scheduledAt?: string; // ISO 时间
}

export interface NotificationResult {
  notificationId: string;
  channel: NotificationChannel;
  status: 'queued' | 'sent' | 'confirmed' | 'failed';
  sentAt?: string;
  error?: string;
}

// ============================================================================
// 提醒升级链
// ============================================================================

export interface EscalationChain {
  level: ReminderLevel;
  channel: NotificationChannel;
  advanceDays: number;
  requiresConfirmation: boolean;
}

// 默认升级链
const DEFAULT_ESCALATION_CHAIN: EscalationChain[] = [
  { level: 'level_2', channel: 'push', advanceDays: 60, requiresConfirmation: false },
  { level: 'level_2', channel: 'push', advanceDays: 30, requiresConfirmation: false },
  { level: 'level_1', channel: 'push', advanceDays: 15, requiresConfirmation: false },
  { level: 'level_1', channel: 'push', advanceDays: 7, requiresConfirmation: true },
  { level: 'level_1', channel: 'sms', advanceDays: 3, requiresConfirmation: true },
  { level: 'level_1', channel: 'sms', advanceDays: 1, requiresConfirmation: true },
  { level: 'level_1', channel: 'voice', advanceDays: 0, requiresConfirmation: true },
];

// ============================================================================
// 通知模板
// ============================================================================

interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  'reminder-early': {
    type: 'reminder-early',
    title: '📅 提前提醒：{{title}}',
    body: '{{title}}将在{{days}}天后（{{date}}）到来。{{budget}}\n\n点击查看详情并准备方案。',
  },
  'reminder-approaching': {
    type: 'reminder-approaching',
    title: '⏰ 即将到来：{{title}}',
    body: '{{title}}将在{{days}}天后到来。\n\n推荐方案已生成，点击查看。',
  },
  'reminder-urgent': {
    type: 'reminder-urgent',
    title: '🚨 紧急提醒：{{title}}',
    body: '{{title}}明天就要到了！\n\n请尽快确认方案并完成准备。',
  },
  'reminder-today': {
    type: 'reminder-today',
    title: '🔔 今日事项：{{title}}',
    body: '今天是{{title}}！\n\n请确认所有安排已就绪。',
  },
  'reminder-overdue': {
    type: 'reminder-overdue',
    title: '⚠️ 已逾期：{{title}}',
    body: '{{title}}已过{{days}}天，尚未确认完成。\n\n请确认是否已完成，或标记为逾期。',
  },
};

// ============================================================================
// Skill 实现
// ============================================================================

export interface NotificationSkillInput {
  action: 'send' | 'schedule' | 'get-escalation-chain' | 'render-template';
  notification?: NotificationRequest;
  templateType?: string;
  templateVars?: Record<string, string>;
  contactTags?: string[];
}

export const notificationSkill: SkillDefinition = {
  id: 'notification-send',
  name: '通知投递',
  version: '1.0.0',
  description: '封装通知发送逻辑，支持多级提醒升级',
  category: 'base',

  async execute(context: SkillContext): Promise<SkillResult> {
    const input = context as unknown as NotificationSkillInput & SkillContext;

    try {
      switch (input.action) {
        case 'send': {
          if (!input.notification) {
            return { success: false, error: 'Notification request is required' };
          }
          const result = await sendNotification(input.notification);
          return {
            success: true,
            data: result,
          };
        }

        case 'schedule': {
          if (!input.notification) {
            return { success: false, error: 'Notification request is required' };
          }
          const result = await scheduleNotification(input.notification);
          return {
            success: true,
            data: result,
          };
        }

        case 'get-escalation-chain': {
          const chain = getEscalationChain(input.contactTags || []);
          return {
            success: true,
            data: { chain },
          };
        }

        case 'render-template': {
          if (!input.templateType || !input.templateVars) {
            return { success: false, error: 'Template type and variables are required' };
          }
          const rendered = renderTemplate(input.templateType, input.templateVars);
          return {
            success: true,
            data: rendered,
          };
        }

        default:
          return { success: false, error: `Unknown action: ${input.action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

// ============================================================================
// 内部函数
// ============================================================================

async function sendNotification(request: NotificationRequest): Promise<NotificationResult> {
  // 在实际实现中，这里会调用 Supabase 或第三方通知服务
  // 当前为模拟实现
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  console.log(`[NotificationSkill] Sending ${request.channel} notification to ${request.recipientId}: ${request.title}`);
  
  return {
    notificationId,
    channel: request.channel,
    status: 'sent',
    sentAt: new Date().toISOString(),
  };
}

async function scheduleNotification(request: NotificationRequest): Promise<NotificationResult> {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  console.log(`[NotificationSkill] Scheduling ${request.channel} notification for ${request.scheduledAt}: ${request.title}`);
  
  return {
    notificationId,
    channel: request.channel,
    status: 'queued',
  };
}

function getEscalationChain(contactTags: string[]): EscalationChain[] {
  // 根据联系人标签调整升级链
  // 例如：VIP 客户可能更早开始 SMS 升级
  const isVIP = contactTags.some(tag => 
    ['重要客户', '国企高管', '上市公司高管'].includes(tag)
  );

  if (isVIP) {
    // VIP 升级链：更早开始提醒，更多 SMS
    return [
      { level: 'level_2', channel: 'push', advanceDays: 60, requiresConfirmation: false },
      { level: 'level_2', channel: 'push', advanceDays: 30, requiresConfirmation: false },
      { level: 'level_1', channel: 'push', advanceDays: 15, requiresConfirmation: false },
      { level: 'level_1', channel: 'push', advanceDays: 7, requiresConfirmation: true },
      { level: 'level_1', channel: 'sms', advanceDays: 5, requiresConfirmation: true },
      { level: 'level_1', channel: 'sms', advanceDays: 3, requiresConfirmation: true },
      { level: 'level_1', channel: 'sms', advanceDays: 1, requiresConfirmation: true },
      { level: 'level_1', channel: 'voice', advanceDays: 0, requiresConfirmation: true },
    ];
  }

  return DEFAULT_ESCALATION_CHAIN;
}

function renderTemplate(
  templateType: string, 
  vars: Record<string, string>
): { title: string; body: string } {
  const template = NOTIFICATION_TEMPLATES[templateType];
  if (!template) {
    return {
      title: vars.title || '提醒',
      body: vars.body || '',
    };
  }

  let title = template.title;
  let body = template.body;

  // 替换变量
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), value);
    body = body.replace(new RegExp(placeholder, 'g'), value);
  }

  return { title, body };
}

// 导出
export { NOTIFICATION_TEMPLATES, DEFAULT_ESCALATION_CHAIN, getEscalationChain, renderTemplate };
export type { NotificationTemplate };

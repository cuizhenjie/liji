# 礼记 MVP

个人 AI 贴身秘书系统的轻量化 MVP，采用 `Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui + Supabase schema`。

## MVP 范围

- 我的看板：Level 1 红线提醒、采集收件箱、预算监控、VIP 画像、月度复盘。
- 人脉与关系圈：联系人画像、偏好矩阵、合规标签、AI 记忆纠偏。
- 智能日历：自然语言采集确认后写入日程，支持提醒等级、阳历/农历字段和 RRULE。
- 履约方案：生日/节日 `60/15/25` 预算拆解，差旅每日限额拆分，外部平台跳转。
- 账单复盘：固定账单、交易聚合、月度生活与人情往来复盘。
- 隐私授权：PII 脱敏、云端模型、Web Push、短信、语音、第三方跳转开关。

首版只做“推荐 + 跳转履约”，不做自动支付、全自动下单、原生短信监听或多人 B 端协作。

## 开发

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:3000`。

## 验证

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

如果首次运行 E2E 缺少浏览器：

```bash
npx playwright install chromium webkit
```

## 已落地业务闭环

- 采集收件箱：自然语言输入先进入待确认队列，确认后按 intent 写入日程、账单、交易或 AI 记忆。
- 任务与确认中心：采集项可编辑、确认或驳回，确认结果会本地持久化。
- 履约方案：方案可确认或归档收藏，外部链接会追加礼记追踪参数，刷新页面后状态仍保留。
- 冗余提醒：Level 1 事件可在右侧护航栏确认已阅，确认后停止升级并写入投递日志；通知 provider 可从 mock 替换为阿里云适配。
- 隐私授权：开关和演示数据可本地保存，支持导出数据、一键重置和本地删除。
- 产品化基础：新增 AI 结构化解析适配器、通知 provider、履约追踪链接、隐私导出/脱敏、Workspace Repository 和 `/api/workspace/sync` 云端同步入口。

## 环境变量

MVP 可在没有外部密钥时用内置 demo 数据运行。接 Supabase 时配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=
CRON_SECRET=
LIJI_DEFAULT_NOTIFY_PHONE=
LIJI_ENABLE_EXTERNAL_NOTIFICATIONS=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_REGION_ID=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
ALIYUN_VOICE_CALLED_SHOW_NUMBER=
ALIYUN_VOICE_TTS_CODE=
JD_UNION_ID=
FULFILLMENT_CALLBACK_SECRET=
```

## 数据库

Supabase migration 位于 `supabase/migrations/20260701193000_initial_liji_schema.sql`，包含：

- `profiles`、`contacts`、`events`、`reminders`、`budgets`
- `plans`、`plan_items`、`capture_items`
- `transactions`、`recurring_bills`、`notification_logs`
- `ai_memories`、`privacy_settings`、`compliance_rules`
- RLS 策略与 `pgvector` 扩展

产品化扩展 migration 位于 `supabase/migrations/20260702110000_productization_extensions.sql`，包含：

- `web_push_subscriptions`、`integration_accounts`
- `fulfillment_clicks`、`monthly_reports`、`audit_logs`
- 采集来源字段、常用查询索引和 RLS 策略

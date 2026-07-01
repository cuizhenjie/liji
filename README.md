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

## 环境变量

MVP 可在没有外部密钥时用内置 demo 数据运行。接 Supabase 时配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
CRON_SECRET=
```

## 数据库

Supabase migration 位于 `supabase/migrations/20260701193000_initial_liji_schema.sql`，包含：

- `profiles`、`contacts`、`events`、`reminders`、`budgets`
- `plans`、`plan_items`、`capture_items`
- `transactions`、`recurring_bills`、`notification_logs`
- `ai_memories`、`privacy_settings`、`compliance_rules`
- RLS 策略与 `pgvector` 扩展

## 设计资产

- 概念稿：`docs/design/liji-dashboard-concept.png`
- 桌面渲染截图：`docs/design/liji-dashboard-render-desktop.png`
- 移动渲染截图：`docs/design/liji-dashboard-render-mobile.png`

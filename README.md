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
- 履约方案：方案可确认或归档收藏，外部链接会追加礼记追踪参数、联盟归因参数和预估佣金，刷新页面后状态仍保留。
- 冗余提醒：Level 1 事件可在右侧护航栏确认已阅，确认后停止升级并写入投递日志；通知 provider 可从 mock 替换为阿里云适配。
- 隐私授权：开关和演示数据可本地保存，支持导出数据、一键重置和本地删除。
- 产品化基础：新增 AI 结构化解析适配器、通知 provider、履约追踪链接、隐私导出/脱敏、Workspace Repository 和 `/api/workspace/sync` 云端同步入口。
- 生产化推进：`/api/health` 暴露上线 readiness 检查，`/api/capture/extract` 支持语音/OCR/聊天/账单文本标准化，`/api/ai-memories/search` 提供 AI 记忆召回骨架。
- 真实服务前置：AI 记忆支持 OpenAI embedding 生成与 pgvector RPC 召回，附件型采集可进入 OCR/ASR job 队列，Level 1 可生成 15 分钟升级 job。
- 后台 worker：`/api/capture/process-jobs` 可消费 OCR/ASR 队列并回写确认中心，`/api/reminder-escalations/run` 可消费 Level 1 升级队列并写入投递日志。
- 动态合规：`/api/compliance/rules` 可返回系统/用户合规规则，并按联系人标签合成更严格的礼品和宴请限额。
- 运维闭环：Level 1 升级任务支持失败退避、最大尝试次数和 `ops_alerts` 告警；`/api/ai-memories/maintenance` 支持 AI 记忆衰减、过期复核和批量补 embedding。
- 采集附件：截图、语音、账单附件可上传到 Supabase Storage，生成短期 signed URL 写入 `input_uri` 供 OCR/ASR provider 拉取。
- 差旅报价：差旅方案支持交通/酒店候选报价、预算内择优、超预算提示和替代方案建议。
- 记忆复核：AI 记忆支持用户编辑后复核为 healthy，云端复核会自动关闭对应 `ops_alerts`。
- 通知对账：短信/语音日志保存阿里云 RequestId 与 BizId/CallId，`/api/notification-receipts/run` 可轮询回执并更新 provider 状态。

## 下一批待接真实服务

- 接入真实 OCR/ASR provider 账号、回调验签和失败重试运营。
- 增强 AI 记忆复核运营：批量复核、忽略/删除记忆、复核后重新 embedding。
- 增强通知回执：接入阿里云 HTTP/MNS 回执推送、多用户手机号路由和失败重呼策略。
- 接入电商/本地生活/商旅真实联盟 API 的订单对账、结算回执和退款冲正。

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
OPENAI_EMBEDDING_MODEL=
OPENAI_EMBEDDING_DIMENSIONS=
CRON_SECRET=
LIJI_DEFAULT_NOTIFY_PHONE=
LIJI_ENABLE_EXTERNAL_NOTIFICATIONS=
LIJI_CAPTURE_OCR_PROVIDER=
LIJI_CAPTURE_ASR_PROVIDER=
LIJI_CAPTURE_PROVIDER_ENDPOINT=
LIJI_CAPTURE_STORAGE_BUCKET=
LIJI_CAPTURE_STORAGE_SIGNED_URL_TTL_SECONDS=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_REGION_ID=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
ALIYUN_VOICE_CALLED_SHOW_NUMBER=
ALIYUN_VOICE_TTS_CODE=
JD_UNION_ID=
TAOBAO_PID=
MEITUAN_CPS_ID=
CTRIP_AFFILIATE_ID=
TONGCHENG_AFFILIATE_ID=
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

真实服务前置 migration 位于 `supabase/migrations/20260703120000_real_service_readiness.sql`，包含：

- `capture_extraction_jobs`、`reminder_escalation_jobs`
- AI 记忆向量索引 `idx_ai_memories_embedding_cosine`
- pgvector 召回函数 `match_ai_memories`

记忆维护与重试 migration 位于 `supabase/migrations/20260703150000_memory_retry_ops.sql`，包含：

- `reminder_escalation_jobs` 重试/退避字段
- `ai_memories` 复核、衰减和 embedding 时间字段
- `ops_alerts` 运维告警表

AI 记忆复核 migration 位于 `supabase/migrations/20260703170000_ai_memory_review_ops.sql`，包含：

- 用户可更新自己的 `ops_alerts`，用于 `/api/ai-memories/review` 在复核后关闭告警

通知回执 migration 位于 `supabase/migrations/20260703183000_notification_receipts.sql`，包含：

- `notification_logs` 的 provider、RequestId、BizId/CallId、回执状态和原始回执字段
- 回执轮询所需索引

采集附件对象存储 migration 位于 `supabase/migrations/20260703193000_capture_storage_bucket.sql`，包含：

- 私有 bucket `liji-capture-attachments`
- 用户路径隔离的 `storage.objects` 读写策略

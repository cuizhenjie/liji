# 礼记 MVP

个人 AI 贴身秘书系统的轻量化 MVP，采用 `Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui + Supabase schema`。

## MVP 范围

- 我的看板：Level 1 红线提醒、采集收件箱、预算监控、VIP 画像、月度复盘。
- 人脉与关系圈：联系人画像、偏好矩阵、合规标签、AI 记忆纠偏。
- 智能日历：自然语言采集确认后写入日程，支持提醒等级、阳历/农历字段和 RRULE。
- 履约方案：生日/节日 `60/15/25` 预算拆解，差旅每日限额拆分，外部平台跳转。
- 账单复盘：固定账单、交易聚合、月度生活与人情往来复盘。
- 隐私授权：PII 脱敏、云端模型、Web Push、短信、语音、第三方跳转开关。

首版只做“推荐 + 跳转履约”，不做自动支付、全自动下单、Web 直接原生短信监听或多人 B 端协作；短信账单可通过原生壳或短信 webhook 导入确认中心。

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
npm run prod:check
```

如果首次运行 E2E 缺少浏览器：

```bash
npx playwright install chromium webkit
```

## 已落地业务闭环

- 采集收件箱：自然语言输入先进入待确认队列，确认后按 intent 写入日程、账单、交易或 AI 记忆。
- 任务与确认中心：采集项可编辑、确认或驳回，确认结果会本地持久化。
- 履约方案：方案可确认或归档收藏，外部链接会追加礼记追踪参数、联盟归因参数和预估佣金，刷新页面后状态仍保留。
- 礼仪交付包：生日/节日方案会生成祝福卡片文案、包装/交付选项、忌口风险和履约确认清单，补齐 PRD 中“一键代写卡片”和“精美包装”体验。
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
- 回执推送：`/api/notification-receipts/push` 可接收阿里云 SMS HTTP 批量推送、MNS 消费转发和 VoiceReport，按 BizId/CallId 幂等更新投递日志。
- 手机号路由：隐私中心可保存用户级通知手机号，短信/语音发送、Level 1 升级和回执轮询优先按用户手机号路由。
- OCR/ASR 回调：`/api/capture/provider-callback` 支持 provider 异步回调验签、写入确认中心、失败退避重试和耗尽后 `ops_alerts` 告警。
- 履约对账：履约回调支持结算状态、佣金、退款冲正字段，`/api/fulfillment/reconcile` 可按月生成订单净额、佣金、退款和风险标记报表。
- 运营兜底：`/api/notification-retries/run` 支持短信/语音失败后限次重试和耗尽告警，`/api/capture/sla/run` 支持 OCR/ASR 超时 SLA 告警与卡住任务释放。
- 人工补录与批量记忆：`/api/capture/manual-complete` 可人工补录 OCR/ASR 结果并关闭告警，`/api/ai-memories/batch` 支持批量复核、忽略、删除和重新 embedding 标记。
- 多身份与 VIP 详情：看板、人脉和日历支持全部/家庭/商务视图切换；VIP 详情展示偏好、合规、关联日程和往期礼物。
- Level 2 推荐卡片：`/api/recommendations/level2` 与看板会按 15 天窗口生成每日推荐卡片，辅助提前锁定礼物/餐饮/预算。
- 差旅偏好与报价：差旅方案支持出发地、起止日期、交通策略、住宿标准、餐饮标准和客户地址；`/api/travel/quotes` 可接外部报价 provider，未配置时回退内置候选。
- 短信账单导入：`/api/capture/sms-import` 承接原生壳或短信 webhook 传入的账单短信，解析后进入待确认队列。
- 联盟拉单与财务导出：`/api/fulfillment/provider-sync` 支持京东/淘宝/美团/携程/同程订单 API 拉单、HMAC 签名和字段归一化；`/api/fulfillment/export` 可导出履约对账 CSV。
- 运营台 UI：新增运营页，集中处理 OCR/ASR SLA、通知异常重试、AI 记忆批量处理、联盟订单同步和真实服务就绪状态。
- OCR/ASR 回调白名单：`/api/capture/provider-callback` 可通过 `LIJI_CAPTURE_PROVIDER_ALLOWED_IPS` 校验 provider 来源 IP。
- P0 上线清单：`/api/health` 返回 `p0Actions`，按云端数据、OCR/ASR、外部通知、履约结算输出 ready/needs_config/blocked 与下一步动作。
- 通知治理：`/api/notification-retries/run` 按供应商失败文案区分频控重试、模板/权限熔断、号码永久失败和用户退订/停呼，并写入 `notification_retry` 告警。
- 生产检查与压测：`/api/ops/production-check` 与 `npm run prod:check` 检查 env、migration、回调 URL 和 P0 阻塞项；`/api/ops/service-smoke` 提供不误发通知/不下单的真实服务 dry-run 压测入口。
- 履约差异处理：`/api/fulfillment/discrepancies` 从对账风险派生退款、佣金、归因和争议订单队列，支持人工标记解决、请求供应商证据和手动调整。
- 原生采集桥：`/api/capture/native-bridge` 暴露短信读取、长按录音、附件上传进度和 PWA 降级能力状态，并校验原生侧 payload。
- 商业化权益：`/api/billing/entitlements` 计算体验版/专业版/高管版的关系画像、AI 记忆、短信、语音、紧急升级和履约对账额度占用。
- 运营页增强：运营台展示生产阻塞、dry-run 告警、履约差异、会员权益、通知错误码 SOP 和原生采集桥状态。
- P2 商业化闭环：`/api/billing/ledger` 生成权益扣减流水，`/api/billing/checkout` 生成订阅 checkout intent，`/api/billing/invoices` 生成发票申请队列。
- CPS 财务审批：`/api/finance/cps-approvals` 将履约对账风险转成佣金审批、补证据和付款批次。
- 运营告警处置：`/api/ops/alerts` 汇总生产、dry-run、权益、履约差异告警，支持确认、解决和重新打开的处置状态。
- 语音轻量记账：账单页提供“长按语音记账”入口，口述消费会进入确认中心，确认后写入日常流水和月度复盘。

## 下一批待接真实服务

- 配置真实 OCR/ASR provider 账号、正式回调域名和供应商白名单 IP，并沉淀人工补录 SOP。
- 配置京东/淘宝/美团/携程/同程真实订单 API、签名密钥和结算周期，并用履约差异队列做人工审批。
- 接真实通知压测：配置阿里云正式模板/签名/回执推送，补充供应商错误码样本库和运营处理 SOP。
- 原生端增强：接入真实移动端短信读取权限、长按录音和附件上传进度回调。
- 商业化闭环：接真实订阅支付回调、发票 provider、权益扣减落库 worker 和 CPS 财务审批通知。

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
LIJI_NOTIFICATION_STOP_KEYWORDS=
LIJI_NOTIFICATION_TEMPLATE_CIRCUIT_BREAKER=
LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET=
LIJI_PUBLIC_APP_URL=
LIJI_NATIVE_BRIDGE_SECRET=
LIJI_BILLING_PLAN=
LIJI_BILLING_PROVIDER=
LIJI_BILLING_CHECKOUT_URL=
LIJI_INVOICE_PROVIDER=
LIJI_CAPTURE_OCR_PROVIDER=
LIJI_CAPTURE_ASR_PROVIDER=
LIJI_CAPTURE_PROVIDER_ENDPOINT=
LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET=
LIJI_CAPTURE_PROVIDER_ALLOWED_IPS=
LIJI_CAPTURE_STORAGE_BUCKET=
LIJI_CAPTURE_STORAGE_SIGNED_URL_TTL_SECONDS=
LIJI_TRAVEL_QUOTE_ENDPOINT=
LIJI_TRAVEL_QUOTE_SECRET=
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
JD_UNION_ORDER_API_ENDPOINT=
JD_UNION_ORDER_API_SECRET=
TAOBAO_ORDER_API_ENDPOINT=
TAOBAO_ORDER_API_SECRET=
MEITUAN_ORDER_API_ENDPOINT=
MEITUAN_ORDER_API_SECRET=
CTRIP_ORDER_API_ENDPOINT=
CTRIP_ORDER_API_SECRET=
TONGCHENG_ORDER_API_ENDPOINT=
TONGCHENG_ORDER_API_SECRET=
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

通知手机号路由 migration 位于 `supabase/migrations/20260703202000_notification_phone_routing.sql`，包含：

- `privacy_settings.notification_phone`
- 用户级短信/语音手机号长度约束

OCR/ASR provider 回调 migration 位于 `supabase/migrations/20260703212000_capture_provider_callbacks.sql`，包含：

- `capture_extraction_jobs` 的 provider request、回调时间、重试次数和错误字段
- provider 异步回调追踪索引与失败重试扫描索引

履约结算对账 migration 位于 `supabase/migrations/20260703222000_fulfillment_settlement_reconciliation.sql`，包含：

- `fulfillment_order_updates` 的佣金、退款、结算状态、结算周期和已对账时间字段
- `fulfillment_reconciliation_reports` 月度对账报表表、RLS 策略和查询索引

通知重试治理 migration 位于 `supabase/migrations/20260703233000_notification_retry_ops.sql`，包含：

- `notification_logs` 的父重试日志、重试次数、下次重试、停呼时间和停呼原因字段
- 失败通知重试扫描索引与重试父子链路索引

P2 商业化与运营 migration 位于 `supabase/migrations/20260704110000_p2_commercial_ops.sql`，包含：

- `billing_subscriptions`、`billing_usage_ledger`、`billing_invoice_requests`
- `cps_finance_approvals` 与 `ops_alert_events`
- 用户级 RLS、账期/状态查询索引和告警事件审计索引

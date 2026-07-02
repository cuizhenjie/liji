# 礼记 MVP 接口契约

本阶段接口均为 Next.js Route Handlers，默认使用内置 demo 数据与 mock provider，后续可替换为 Supabase + 真实通知/模型服务。

## GET /api/integrations

用途：返回第三方能力配置状态，不暴露密钥值。

响应：

```json
{
  "integrations": [
    {
      "provider": "openai | aliyun_sms | aliyun_voice | jd | meituan | ctrip | web_push | supabase",
      "label": "OpenAI 结构化解析",
      "category": "ai | notification | fulfillment | data",
      "mode": "configured | missing | search-link",
      "detail": "string"
    }
  ]
}
```

## GET /api/workspace

用途：读取当前工作区。未配置 Supabase 时返回内置 demo；配置 Supabase 且用户已登录时返回用户自己的云端工作区。

响应：

```json
{
  "workspace": {
    "contacts": [],
    "events": [],
    "budgets": [],
    "plans": [],
    "captures": [],
    "transactions": [],
    "recurringBills": [],
    "notificationLogs": [],
    "aiMemories": [],
    "privacy": {},
    "insight": {}
  },
  "source": "demo | supabase"
}
```

## POST /api/workspace/sync

用途：将前端工作区核心对象 upsert 到 Supabase。MVP 阶段为增量 upsert，不负责删除云端不存在于本地的旧记录。

请求：

```json
{
  "workspace": {
    "contacts": [],
    "events": [],
    "budgets": [],
    "plans": [],
    "captures": [],
    "transactions": [],
    "recurringBills": [],
    "notificationLogs": [],
    "aiMemories": [],
    "privacy": {},
    "insight": {}
  }
}
```

响应：

```json
{
  "source": "demo | supabase",
  "sync": {
    "tables": {
      "contacts": 1,
      "events": 1,
      "plans": 1,
      "plan_items": 3
    }
  }
}
```

## POST /api/parse-input

用途：把自然语言输入解析为待确认采集项。登录 Supabase 后使用当前用户联系人画像做 PII 脱敏和关系匹配。

请求：

```json
{
  "text": "下周五是女儿5岁生日，预算2000元",
  "source": "text | voice | screenshot | chat | bill",
  "allowCloudModel": false
}
```

响应：

```json
{
  "source": "demo | supabase",
  "capture": {
    "id": "string",
    "rawText": "string",
    "maskedText": "string",
    "sourceType": "text | voice | screenshot | chat | bill",
    "status": "pending",
    "parsed": {
      "intent": "event | travel | transaction | memory | bill",
      "title": "string",
      "date": "YYYY-MM-DD",
      "budgetCny": 2000,
      "reminderLevel": "level_1 | level_2 | level_3",
      "confidence": 0.88
    },
    "piiTokens": []
  },
  "provider": "local-rules | openai",
  "piiTokenCount": 0
}
```

说明：`allowCloudModel=true` 且存在 `OPENAI_API_KEY` 时，会走 Responses API + JSON Schema 结构化输出；否则自动降级到本地规则解析。
登录 Supabase 后还会强制检查用户已保存的 `cloudModelEnabled`，请求体不能绕过隐私授权。

## POST /api/generate-plan

用途：生成节日/生日或差旅履约方案。登录 Supabase 后优先使用当前用户的事件和联系人画像。

生日/节日请求：

```json
{ "scenario": "festival", "eventId": "e-daughter-birthday", "budgetCny": 2000 }
```

差旅请求：

```json
{
  "scenario": "travel",
  "title": "广州商务差旅方案",
  "startDate": "2026-07-08",
  "endDate": "2026-07-10",
  "destination": "广州",
  "dailyLimitCny": 2400
}
```

响应：

```json
{
  "source": "demo | supabase",
  "plan": {
    "scenario": "festival | travel",
    "status": "pending_confirmation",
    "riskLevel": "low | medium | high",
    "warnings": [],
    "items": [{ "title": "string", "amountCny": 1200, "provider": "京东", "url": "string" }]
  },
  "fulfillmentLinks": [
    {
      "provider": "jd | taobao | meituan | ctrip | tongcheng",
      "label": "粉色乐高创意礼盒",
      "url": "string with liji tracking params",
      "cpsReady": true
    }
  ]
}
```

说明：登录 Supabase 后，`fulfillmentLinks` 只有在用户隐私设置 `thirdPartyLinksEnabled=true` 时返回；关闭第三方跳转时返回空数组。

## POST /api/contacts

用途：新增或更新 VIP 画像。未配置 Supabase 时返回 demo echo；配置 Supabase 时要求登录。

请求：

```json
{
  "id": "uuid",
  "name": "周明",
  "relation": "重要客户",
  "labels": ["国企高管"],
  "calendarType": "solar",
  "preferences": [],
  "compliance": {
    "riskTags": ["国企高管"],
    "giftLimitCny": 200,
    "policyNote": "礼品建议不超过 200 元。"
  },
  "aiMemoryHealth": 86
}
```

## DELETE /api/contacts?id=:id

用途：删除联系人画像。配置 Supabase 时只删除当前用户自己的联系人。

响应：

```json
{ "source": "demo | supabase", "id": "uuid", "deleted": true }
```

## POST /api/run-reminders

用途：扫描未来 15 天内未完成事件，为 Level 1/2/3 生成对应投递日志。配置 `SUPABASE_SERVICE_ROLE_KEY` 后会扫描 `events` 并写入 `notification_logs`。

响应：

```json
{
  "source": "demo | supabase",
  "logs": [{ "channel": "push | sms | voice", "status": "sent | escalated" }]
}
```

## POST /api/send-notification

用途：通知 provider adapter，根据提醒等级返回应触达通道。配置 Supabase 且用户登录后会写入 `notification_logs`。

请求：

```json
{ "title": "房贷扣款", "level": "level_1", "acknowledged": false }
```

响应：

```json
{
  "source": "demo | supabase",
  "provider": "mock | aliyun",
  "channels": ["push", "sms", "voice"],
  "logs": [{ "channel": "sms", "status": "queued" }],
  "pushDelivery": { "status": "sent | unconfigured", "attempted": 1, "sent": 1, "failed": 0 },
  "escalated": false,
  "status": "queued | escalated"
}
```

说明：登录 Supabase 后服务端会读取 `privacy_settings`，关闭短信或语音时不会生成对应日志，也不会调用外部 provider。

## GET /api/monthly-insight?period=YYYY-MM

用途：聚合交易、周期账单和下月风险，生成月度复盘。登录 Supabase 后使用当前用户云端工作区。

说明：`period` 可选，默认取当前日期的上一个自然月。

响应：

```json
{
  "source": "demo | supabase",
  "insight": {
    "period": "2026-06",
    "healthScore": 74,
    "pressureIndex": 22,
    "nextMonthRisks": []
  }
}
```

## GET /api/privacy/export

用途：生成脱敏后的工作区导出包，并返回审计记录。登录 Supabase 后导出当前用户云端工作区。

响应：

```json
{
  "source": "demo | supabase",
  "export": { "schema": "liji.workspace.export.v1", "data": {} },
  "audit": { "action": "export", "entityTable": "workspace" }
}
```

## POST /api/privacy/delete

用途：登记本地删除请求，或在 Supabase 登录态下按外键顺序删除云端工作区数据。

请求：

```json
{ "scope": "local | cloud" }
```

响应：

```json
{
  "source": "demo | supabase",
  "deletion": { "scope": "local | cloud", "status": "queued" },
  "deletedTables": []
}
```

## POST /api/privacy/settings

用途：保存隐私与授权中心开关。

请求：

```json
{
  "piiMasking": true,
  "cloudModelEnabled": false,
  "webPushEnabled": true,
  "smsEnabled": false,
  "voiceCallEnabled": false,
  "thirdPartyLinksEnabled": true
}
```

## POST /api/push-subscriptions

用途：保存浏览器 Web Push subscription。未配置 Supabase 时返回 demo 对象；登录 Supabase 后写入 `web_push_subscriptions`。

请求：

```json
{
  "endpoint": "https://push.example/subscription",
  "keys": { "p256dh": "string", "auth": "string" },
  "userAgent": "string"
}
```

## POST /api/fulfillment/click

用途：记录第三方履约跳转点击，支撑 CPS 归因和审计。登录 Supabase 后写入 `fulfillment_clicks`。

请求：

```json
{
  "planId": "plan-id",
  "planItemId": "item-id",
  "provider": "jd | taobao | meituan | ctrip | tongcheng",
  "targetUrl": "https://example.com"
}
```

## POST /api/fulfillment/callback

用途：接收第三方履约/订单状态回传。配置 `FULFILLMENT_CALLBACK_SECRET` 后，需在 `x-liji-signature` 中传入 raw body 的 HMAC-SHA256 hex 签名。

请求：

```json
{
  "provider": "jd | taobao | meituan | ctrip | tongcheng",
  "externalOrderId": "order-1",
  "status": "clicked | reserved | paid | fulfilled | cancelled | refunded | failed",
  "planId": "uuid",
  "planItemId": "uuid",
  "amountCny": 1200,
  "occurredAt": "2026-07-02T10:00:00+08:00"
}
```

响应：

```json
{
  "source": "demo | supabase",
  "persisted": true,
  "callback": { "status": "paid" }
}
```

## GET /api/monthly-report?period=YYYY-MM

用途：生成并返回可落库的月度报告对象，对应 `monthly_reports`。配置 `SUPABASE_SERVICE_ROLE_KEY` 后会按 `profiles` 扫描用户并 upsert `monthly_reports`。

说明：`period` 可选，默认取当前日期的上一个自然月。

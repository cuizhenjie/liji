# 礼记 MVP 接口契约

本阶段接口均为 Next.js Route Handlers，默认使用内置 demo 数据与 mock provider，后续可替换为 Supabase + 真实通知/模型服务。

## POST /api/parse-input

用途：把自然语言输入解析为待确认采集项。

请求：

```json
{ "text": "下周五是女儿5岁生日，预算2000元" }
```

响应：

```json
{
  "capture": {
    "id": "string",
    "rawText": "string",
    "maskedText": "string",
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
  }
}
```

## POST /api/generate-plan

用途：生成节日/生日或差旅履约方案。

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
  "plan": {
    "scenario": "festival | travel",
    "status": "pending_confirmation",
    "riskLevel": "low | medium | high",
    "warnings": [],
    "items": [{ "title": "string", "amountCny": 1200, "provider": "京东", "url": "string" }]
  }
}
```

## POST /api/run-reminders

用途：扫描未来 15 天内未完成事件，为 Level 1/2/3 生成对应投递日志。

响应：

```json
{ "logs": [{ "channel": "push | sms | voice", "status": "sent | escalated" }] }
```

## POST /api/send-notification

用途：mock 通知 provider，根据提醒等级返回应触达通道。

请求：

```json
{ "title": "房贷扣款", "level": "level_1", "acknowledged": false }
```

响应：

```json
{ "provider": "mock", "channels": ["push", "sms", "voice"], "status": "queued" }
```

## GET /api/monthly-insight

用途：聚合交易、周期账单和下月风险，生成月度复盘。

响应：

```json
{
  "insight": {
    "period": "2026-06",
    "healthScore": 74,
    "pressureIndex": 22,
    "nextMonthRisks": []
  }
}
```

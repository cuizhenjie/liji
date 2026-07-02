# 礼记 MVP 部署手册

## 目标架构

- Web/PWA：Vercel 部署 Next.js App Router。
- 数据库：Supabase Cloud，执行 `supabase/migrations` 下的 SQL migration。
- 定时任务：Vercel Cron 调用 `/api/run-reminders` 和 `/api/monthly-report`。
- AI：默认本地规则解析；配置 `OPENAI_API_KEY` 后允许用户在隐私中心打开公网模型调用。
- 通知：Web Push 可注册 subscription；短信和语音在 MVP 中仍是 provider adapter/mock 队列。

## 环境变量

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

说明：

- 没有 Supabase 环境变量时，应用自动使用内置 demo 数据。
- `CRON_SECRET` 配置后，Cron 请求必须携带 `Authorization: Bearer <CRON_SECRET>` 或 `x-cron-secret`。
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 未配置时，隐私中心的 Push 注册会明确提示未配置；`VAPID_PRIVATE_KEY` 和 `VAPID_SUBJECT` 配置后服务端可真实发送 Web Push。
- 阿里云短信/语音默认不会真实下发，只有用户已登录、`LIJI_ENABLE_EXTERNAL_NOTIFICATIONS=true` 且密钥、手机号、短信模板、语音 TTS 模板配置完整后才会调用阿里云 API。
- `FULFILLMENT_CALLBACK_SECRET` 用于校验第三方履约回调的 `x-liji-signature`。

## Supabase

1. 创建 Supabase 项目。
2. 执行 `supabase/migrations/20260701193000_initial_liji_schema.sql`。
3. 执行 `supabase/migrations/20260702110000_productization_extensions.sql`。
4. 确认 RLS 已启用，系统合规规则和系统集成账户 seed 已写入。
5. 在 Supabase Auth 中开启 Email OTP / Magic Link，并把 `https://<your-domain>/auth/callback` 加入允许的 redirect URL。
6. 连接 Supabase CLI 后运行 `npm run db:types`，刷新 `src/lib/liji/database.types.ts`。

## Vercel

1. 连接 GitHub 仓库。
2. 配置上面的环境变量。
3. 部署后确认 `/manifest.webmanifest`、`/sw.js`、`/api/workspace` 可访问。
4. Vercel 会读取 `vercel.json` 中的 Cron 配置。

## CI

GitHub Actions 位于 `.github/workflows/ci.yml`，执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

## 验收清单

- 未登录/未配置 Supabase 时，首页可用 demo 数据完成采集、确认、履约、账单和隐私操作。
- 登录并配置 Supabase 后，隐私中心显示当前邮箱，`/api/workspace` 返回 `source: "supabase"`，前端显示“已同步云端数据”。
- 首次登录、读取或同步工作区时会自动 upsert `profiles`，确保 `/api/monthly-report` Cron 能扫描到该用户。
- 新增联系人和隐私设置可通过对应 API 写入，工作区变更会通过 `/api/workspace/sync` 防抖同步。
- `npm run lint && npm run typecheck && npm run test && npm run build && npm run e2e` 全部通过。

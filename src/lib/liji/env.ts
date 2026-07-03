import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).optional(),
  OPENAI_EMBEDDING_DIMENSIONS: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  LIJI_DEFAULT_NOTIFY_PHONE: z.string().min(1).optional(),
  LIJI_ENABLE_EXTERNAL_NOTIFICATIONS: z.string().optional(),
  LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET: z.string().min(1).optional(),
  LIJI_CAPTURE_OCR_PROVIDER: z.string().min(1).optional(),
  LIJI_CAPTURE_ASR_PROVIDER: z.string().min(1).optional(),
  LIJI_CAPTURE_PROVIDER_ENDPOINT: z.string().url().optional(),
  LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET: z.string().min(1).optional(),
  LIJI_CAPTURE_STORAGE_BUCKET: z.string().min(1).optional(),
  LIJI_CAPTURE_STORAGE_SIGNED_URL_TTL_SECONDS: z.string().min(1).optional(),
  ALIYUN_ACCESS_KEY_ID: z.string().min(1).optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().min(1).optional(),
  ALIYUN_REGION_ID: z.string().min(1).optional(),
  ALIYUN_SMS_SIGN_NAME: z.string().min(1).optional(),
  ALIYUN_SMS_TEMPLATE_CODE: z.string().min(1).optional(),
  ALIYUN_VOICE_CALLED_SHOW_NUMBER: z.string().min(1).optional(),
  ALIYUN_VOICE_TTS_CODE: z.string().min(1).optional(),
  JD_UNION_ID: z.string().min(1).optional(),
  TAOBAO_PID: z.string().min(1).optional(),
  MEITUAN_CPS_ID: z.string().min(1).optional(),
  CTRIP_AFFILIATE_ID: z.string().min(1).optional(),
  TONGCHENG_AFFILIATE_ID: z.string().min(1).optional(),
  FULFILLMENT_CALLBACK_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export function hasSupabasePublicEnv() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

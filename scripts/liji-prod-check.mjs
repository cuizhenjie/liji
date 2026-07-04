import { existsSync } from "node:fs";
import { join } from "node:path";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "LIJI_ENABLE_EXTERNAL_NOTIFICATIONS",
  "FULFILLMENT_CALLBACK_SECRET",
];

const recommendedEnv = [
  "LIJI_PUBLIC_APP_URL",
  "LIJI_CAPTURE_OCR_PROVIDER",
  "LIJI_CAPTURE_ASR_PROVIDER",
  "LIJI_CAPTURE_PROVIDER_ENDPOINT",
  "LIJI_CAPTURE_PROVIDER_CALLBACK_SECRET",
  "LIJI_CAPTURE_PROVIDER_ALLOWED_IPS",
  "LIJI_NOTIFICATION_RECEIPT_CALLBACK_SECRET",
  "LIJI_NATIVE_BRIDGE_SECRET",
  "LIJI_BILLING_PLAN",
];

const migrations = [
  "20260701193000_initial_liji_schema.sql",
  "20260702110000_productization_extensions.sql",
  "20260703120000_real_service_readiness.sql",
  "20260703193000_capture_storage_bucket.sql",
  "20260703222000_fulfillment_settlement_reconciliation.sql",
  "20260703233000_notification_retry_ops.sql",
];

function hasEnv(key) {
  return Boolean(process.env[key]?.trim());
}

const missingRequired = requiredEnv.filter((key) => !hasEnv(key));
const missingRecommended = recommendedEnv.filter((key) => !hasEnv(key));
const missingMigrations = migrations.filter((file) =>
  !existsSync(join(process.cwd(), "supabase", "migrations", file))
);

console.log("礼记生产检查");
console.log(`required_env=${requiredEnv.length - missingRequired.length}/${requiredEnv.length}`);
console.log(`recommended_env=${recommendedEnv.length - missingRecommended.length}/${recommendedEnv.length}`);
console.log(`migrations=${migrations.length - missingMigrations.length}/${migrations.length}`);

if (missingRequired.length > 0) {
  console.log(`missing_required=${missingRequired.join(",")}`);
}

if (missingRecommended.length > 0) {
  console.log(`missing_recommended=${missingRecommended.join(",")}`);
}

if (missingMigrations.length > 0) {
  console.log(`missing_migrations=${missingMigrations.join(",")}`);
}

if (missingRequired.length > 0 || missingMigrations.length > 0) {
  process.exitCode = 1;
}

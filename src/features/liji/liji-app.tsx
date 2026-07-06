"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  BellRingIcon,
  BotIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  CrownIcon,
  DownloadIcon,
  FlaskConicalIcon,
  GiftIcon,
  HandCoinsIcon,
  HistoryIcon,
  HomeIcon,
  ListChecksIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MapPinnedIcon,
  NotebookPenIcon,
  PlaneIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCwIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundIcon,
  WalletCardsIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { CaptureSource } from "@/lib/liji/ai";
import { deriveComplianceProfile } from "@/lib/liji/compliance";
import { generateFestivalPlan, generateTravelPlan } from "@/lib/liji/budget";
import type {
  BillingUsageLedgerReport,
  CpsFinanceApprovalItem,
  CpsPayoutBatch,
  OpsAlertLifecycleItem,
} from "@/lib/liji/commercial-ops";
import {
  buildDataAssetRemediationTasks,
  type DataAssetRemediationTask,
} from "@/lib/liji/data-asset-remediation";
import {
  buildDataAssetLedger,
  type DataAssetLedgerEntry,
} from "@/lib/liji/data-asset-ledger";
import type { EntitlementReport } from "@/lib/liji/entitlements";
import {
  buildFeatureAcceptanceMatrix,
  type FeatureAcceptanceItem,
} from "@/lib/liji/feature-acceptance";
import {
  addRecurringBill as addRecurringBillToWorkspace,
  addTransaction as addTransactionToWorkspace,
  updateBudgetTotal,
} from "@/lib/liji/finance";
import { buildPlanFulfillmentLinks } from "@/lib/liji/fulfillment";
import { buildFulfillmentConciergePack } from "@/lib/liji/fulfillment-concierge";
import type { FulfillmentReconciliationDiscrepancy } from "@/lib/liji/fulfillment-reconciliation";
import { createUuid } from "@/lib/liji/ids";
import type { IntegrationStatus } from "@/lib/liji/integrations";
import { buildNextMonthReservePlan, type NextMonthReservePlan } from "@/lib/liji/insights";
import {
  buildLevelTwoRecommendationCards,
  type LevelTwoRecommendationCard,
} from "@/lib/liji/level2-recommendations";
import {
  applyReviewedAiMemory,
  reviewWorkspaceAiMemory,
} from "@/lib/liji/memory-review";
import {
  clearWorkspaceData,
  loadWorkspaceData,
  saveWorkspaceData,
} from "@/lib/liji/persistence";
import { parseNaturalLanguageInput } from "@/lib/liji/parser";
import {
  buildPreferenceSuggestions,
  type PreferenceSuggestion,
} from "@/lib/liji/preference-suggestions";
import { createDeletionRequest, exportWorkspaceData } from "@/lib/liji/privacy";
import { registerBrowserPushSubscription } from "@/lib/liji/push";
import type { NativeBridgeCapability } from "@/lib/liji/native-bridge";
import type { NotificationFailureCodebookEntry } from "@/lib/liji/notification-governance";
import type { ProductionCheckReport } from "@/lib/liji/production-check";
import {
  buildRelationshipActions,
  type RelationshipAction,
} from "@/lib/liji/relationship-actions";
import {
  buildProductionLaunchChecklist,
  type ProductionLaunchTask,
} from "@/lib/liji/production-launch";
import {
  buildScenarioAcceptance,
  type ScenarioAcceptanceItem,
} from "@/lib/liji/scenario-acceptance";
import {
  buildSecretaryCommandCenter,
  type AiContinuityReport,
  type AssistantAction,
  type DataAssetItem,
  type ScenarioJourney,
} from "@/lib/liji/secretary-command-center";
import {
  buildSecretaryTimeline,
  type SecretaryTimelineItem,
} from "@/lib/liji/secretary-timeline";
import type { ServiceSmokeSuite } from "@/lib/liji/service-smoke";
import { createSupabaseBrowserClient } from "@/lib/liji/supabase-browser";
import { buildTravelReadinessBrief } from "@/lib/liji/travel-readiness";
import type { TravelPreference } from "@/lib/liji/travel-options";
import {
  acknowledgeEvent,
  acknowledgeNotificationLog,
  applyPreferenceSuggestion,
  applyRelationshipAction,
  applyConfirmedCapture,
  applyConfirmedCaptures,
  archiveCapture as archiveCaptureWorkflow,
  archiveCaptures as archiveCapturesWorkflow,
  rejectCapture as rejectCaptureWorkflow,
  setPlanStatus,
} from "@/lib/liji/workflow";
import type {
  AiMemory,
  CalendarEvent,
  CaptureItem,
  Contact,
  FulfillmentPlan,
  NotificationLog,
  PrivacySettings,
  RecurringBill,
  Transaction,
  WorkspaceData,
} from "@/lib/liji/types";

type SectionId =
  | "dashboard"
  | "contacts"
  | "calendar"
  | "fulfillment"
  | "finance"
  | "ops"
  | "privacy";

type IdentityMode = "all" | "family" | "business";

type PrivacyToggleKey = Exclude<keyof PrivacySettings, "notificationPhone">;

type LijiAppProps = {
  initialData: WorkspaceData;
};

type CaptureQuickStart = {
  label: string;
  source: CaptureSource;
  text: string;
};

type ParseCaptureResponse = {
  capture?: CaptureItem;
  error?: string;
  provider?: "local-rules" | "openai";
};

type OpsDashboardState = {
  productionCheck: ProductionCheckReport | null;
  serviceSmoke: ServiceSmokeSuite | null;
  discrepancies: FulfillmentReconciliationDiscrepancy[];
  nativeCapabilities: NativeBridgeCapability[];
  notificationCodebook: NotificationFailureCodebookEntry[];
  entitlements: EntitlementReport | null;
  billingLedger: BillingUsageLedgerReport | null;
  cpsApprovals: CpsFinanceApprovalItem[];
  cpsPayout: CpsPayoutBatch | null;
  opsAlerts: OpsAlertLifecycleItem[];
};

const sectionItems: Array<{
  id: SectionId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { id: "dashboard", label: "我的看板", icon: HomeIcon },
  { id: "contacts", label: "人脉", icon: UserRoundIcon },
  { id: "calendar", label: "日历", icon: CalendarDaysIcon },
  { id: "fulfillment", label: "履约", icon: GiftIcon },
  { id: "finance", label: "账单", icon: WalletCardsIcon },
  { id: "ops", label: "运营", icon: ActivityIcon },
  { id: "privacy", label: "隐私", icon: LockKeyholeIcon },
];

const identityOptions: Array<{ value: IdentityMode; label: string }> = [
  { value: "all", label: "全部" },
  { value: "family", label: "家庭" },
  { value: "business", label: "商务" },
];

const captureQuickStarts: CaptureQuickStart[] = [
  {
    label: "生日关怀",
    source: "text",
    text: "下周五是女儿5岁生日，预算2000元，提前准备礼物和蛋糕",
  },
  {
    label: "客户宴请",
    source: "chat",
    text: "周明下周三在广州天河客户宴请，预算500元，不吃香菜，需要Level 1提醒",
  },
  {
    label: "差旅行程",
    source: "text",
    text: "7月8日到7月10日从上海去广州出差，每天预算2400元，客户地址广州天河",
  },
  {
    label: "账单短信",
    source: "bill",
    text: "【招商银行】您尾号8621账户房贷扣款12800元，交易时间2026-07-02。",
  },
];

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

function formatCny(value: number) {
  return currency.format(value);
}

function levelLabel(level: CalendarEvent["reminderLevel"]) {
  if (level === "level_1") return "Level 1";
  if (level === "level_2") return "Level 2";
  return "Level 3";
}

function badgeVariantForLevel(level: CalendarEvent["reminderLevel"]) {
  if (level === "level_1") return "destructive" as const;
  if (level === "level_2") return "secondary" as const;
  return "outline" as const;
}

function captureSourceLabel(source: CaptureItem["sourceType"] | undefined) {
  const map: Record<CaptureItem["sourceType"], string> = {
    text: "文字",
    voice: "语音",
    screenshot: "截图",
    chat: "聊天",
    bill: "账单",
  };

  return map[source ?? "text"];
}

function preferenceCategoryText(category: PreferenceSuggestion["category"]) {
  const map: Record<PreferenceSuggestion["category"], string> = {
    food: "餐饮",
    gift: "礼赠",
    hobby: "兴趣",
    avoid: "避雷",
    travel: "差旅",
  };

  return map[category];
}

function relationshipScenarioText(scenario: RelationshipAction["scenario"]) {
  const map: Record<RelationshipAction["scenario"], string> = {
    event: "节点",
    compliance: "合规",
    profile: "画像",
    memory: "记忆",
    follow_up: "触达",
  };

  return map[scenario];
}

function identityLabel(mode: IdentityMode) {
  return identityOptions.find((item) => item.value === mode)?.label ?? "全部";
}

function contactMatchesIdentity(contact: Contact, mode: IdentityMode) {
  if (mode === "all") return true;
  const haystack = [contact.relation, ...contact.labels].join(" ");
  if (mode === "family") {
    return /家人|父|母|女儿|儿子|伴侣|妻|夫|长辈|孩子/.test(haystack);
  }

  return /客户|合作|高管|公职|国企|商务|伙伴|董事|供应商/.test(haystack);
}

function eventMatchesIdentity(event: CalendarEvent, contacts: Contact[], mode: IdentityMode) {
  if (mode === "all") return true;
  const contact = contacts.find((item) => item.id === event.contactId);
  if (contact) return contactMatchesIdentity(contact, mode);
  return mode === "business" && event.source === "travel";
}

function planMatchesIdentity(plan: FulfillmentPlan, contacts: Contact[], mode: IdentityMode) {
  if (mode === "all") return true;
  const contact = contacts.find((item) => item.id === plan.contactId);
  if (contact) return contactMatchesIdentity(contact, mode);
  return mode === "business" && plan.scenario === "travel";
}

function statusText(status: CaptureItem["status"] | FulfillmentPlan["status"]) {
  const map = {
    pending: "待确认",
    confirmed: "已确认",
    rejected: "已驳回",
    archived: "已归档",
    draft: "草稿",
    pending_confirmation: "待确认",
    bookmarked: "已收藏",
  };
  return map[status] ?? status;
}

function priorityText(priority: AssistantAction["priority"]) {
  if (priority === "critical") return "立即";
  if (priority === "high") return "优先";
  return "今日";
}

function priorityBadgeVariant(priority: AssistantAction["priority"]) {
  if (priority === "critical") return "destructive" as const;
  if (priority === "high") return "secondary" as const;
  return "outline" as const;
}

function remediationPriorityText(priority: DataAssetRemediationTask["priority"]) {
  if (priority === "critical") return "立即";
  if (priority === "high") return "优先";
  return "补齐";
}

function remediationPriorityVariant(priority: DataAssetRemediationTask["priority"]) {
  if (priority === "critical") return "destructive" as const;
  if (priority === "high") return "secondary" as const;
  return "outline" as const;
}

function assetStatusText(status: DataAssetItem["status"]) {
  if (status === "healthy") return "健康";
  if (status === "attention") return "待补齐";
  return "阻塞";
}

function assetStatusVariant(status: DataAssetItem["status"]) {
  if (status === "healthy") return "secondary" as const;
  if (status === "attention") return "outline" as const;
  return "destructive" as const;
}

function ledgerStatusText(status: DataAssetLedgerEntry["status"]) {
  if (status === "linked") return "已入库";
  if (status === "needs_action") return "待补齐";
  return "阻塞";
}

function ledgerStatusVariant(status: DataAssetLedgerEntry["status"]) {
  if (status === "linked") return "secondary" as const;
  if (status === "needs_action") return "outline" as const;
  return "destructive" as const;
}

function timelineStatusText(status: SecretaryTimelineItem["status"]) {
  if (status === "blocked") return "需处理";
  if (status === "action") return "待推进";
  if (status === "done") return "已闭环";
  return "记录";
}

function timelineStatusVariant(status: SecretaryTimelineItem["status"]) {
  if (status === "blocked") return "destructive" as const;
  if (status === "action") return "secondary" as const;
  return "outline" as const;
}

function launchTaskStatusText(status: ProductionLaunchTask["status"]) {
  if (status === "ready") return "ready";
  if (status === "blocked") return "blocked";
  return "needs config";
}

function launchTaskStatusVariant(status: ProductionLaunchTask["status"]) {
  if (status === "ready") return "secondary" as const;
  if (status === "blocked") return "destructive" as const;
  return "outline" as const;
}

function scenarioAcceptanceStatusText(status: ScenarioAcceptanceItem["status"]) {
  if (status === "ready") return "已闭环";
  if (status === "blocked") return "有阻塞";
  return "待推进";
}

function scenarioAcceptanceStatusVariant(status: ScenarioAcceptanceItem["status"]) {
  if (status === "ready") return "secondary" as const;
  if (status === "blocked") return "destructive" as const;
  return "outline" as const;
}

function featureAcceptanceStatusText(status: FeatureAcceptanceItem["status"]) {
  if (status === "accepted") return "验收通过";
  if (status === "blocked") return "阻塞";
  return "待验收";
}

function featureAcceptanceStatusVariant(status: FeatureAcceptanceItem["status"]) {
  if (status === "accepted") return "secondary" as const;
  if (status === "blocked") return "destructive" as const;
  return "outline" as const;
}

function reservePressureText(level: NextMonthReservePlan["pressureLevel"]) {
  if (level === "high") return "高压力";
  if (level === "medium") return "需预留";
  return "健康";
}

function reservePressureVariant(level: NextMonthReservePlan["pressureLevel"]) {
  if (level === "high") return "destructive" as const;
  if (level === "medium") return "outline" as const;
  return "secondary" as const;
}

function memoryReviewText(memory: AiMemory) {
  if (memory.reviewStatus === "stale") return "需复核";
  if (memory.reviewStatus === "review_required") return "待复核";
  if (memory.correctedAt) return "已复核";
  if (memory.reviewStatus === "healthy") return "健康";
  return `${Math.round(memory.confidence * 100)}%`;
}

function memoryReviewVariant(memory: AiMemory) {
  if (memory.reviewStatus === "stale") return "destructive" as const;
  if (memory.reviewStatus === "review_required") return "outline" as const;
  return "secondary" as const;
}

async function postJson(path: string, body: unknown) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function useWorkspace(initialData: WorkspaceData) {
  const [workspaceState, setWorkspaceState] = useState<{
    data: WorkspaceData;
    storageState: "seed" | "restored" | "saved" | "synced";
    cloudSyncEnabled: boolean;
  }>({ data: initialData, storageState: "seed", cloudSyncEnabled: false });

  const data = workspaceState.data;

  useEffect(() => {
    const restored = loadWorkspaceData(window.localStorage);
    if (restored) {
      const timeoutId = window.setTimeout(() => {
        setWorkspaceState({
          data: restored,
          storageState: "restored",
          cloudSyncEnabled: false,
        });
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCloudWorkspace() {
      try {
        const response = await fetch("/api/workspace");
        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as {
          workspace?: WorkspaceData;
          source?: "demo" | "supabase";
        };

        if (!cancelled && result.source === "supabase" && result.workspace) {
          setWorkspaceState({
            data: result.workspace,
            storageState: "synced",
            cloudSyncEnabled: true,
          });
        }
      } catch {
        // Demo/local mode remains available when the cloud workspace is unavailable.
      }
    }

    void loadCloudWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveWorkspaceData(window.localStorage, data);
  }, [data]);

  useEffect(() => {
    if (!workspaceState.cloudSyncEnabled || workspaceState.storageState !== "saved") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void postJson("/api/workspace/sync", { workspace: data });
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [data, workspaceState.cloudSyncEnabled, workspaceState.storageState]);

  return {
    data,
    storageState: workspaceState.storageState,
    resetWorkspace() {
      clearWorkspaceData(window.localStorage);
      setWorkspaceState({
        data: initialData,
        storageState: "seed",
        cloudSyncEnabled: false,
      });
      toast.success("已重置为演示数据");
    },
    setContacts(updater: (contacts: Contact[]) => Contact[]) {
      setWorkspaceState((current) => ({
        data: { ...current.data, contacts: updater(current.data.contacts) },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setEvents(updater: (events: CalendarEvent[]) => CalendarEvent[]) {
      setWorkspaceState((current) => ({
        data: { ...current.data, events: updater(current.data.events) },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setPlans(updater: (plans: FulfillmentPlan[]) => FulfillmentPlan[]) {
      setWorkspaceState((current) => ({
        data: { ...current.data, plans: updater(current.data.plans) },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setCaptures(updater: (captures: CaptureItem[]) => CaptureItem[]) {
      setWorkspaceState((current) => ({
        data: { ...current.data, captures: updater(current.data.captures) },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setTransactions(updater: (transactions: Transaction[]) => Transaction[]) {
      setWorkspaceState((current) => ({
        data: {
          ...current.data,
          transactions: updater(current.data.transactions),
        },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setNotificationLogs(updater: (logs: NotificationLog[]) => NotificationLog[]) {
      setWorkspaceState((current) => ({
        data: {
          ...current.data,
          notificationLogs: updater(current.data.notificationLogs),
        },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setPrivacy(updater: (settings: PrivacySettings) => PrivacySettings) {
      setWorkspaceState((current) => ({
        data: { ...current.data, privacy: updater(current.data.privacy) },
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
    setData(updater: (current: WorkspaceData) => WorkspaceData) {
      setWorkspaceState((current) => ({
        data: updater(current.data),
        storageState: "saved",
        cloudSyncEnabled: current.cloudSyncEnabled,
      }));
    },
  };
}

export function LijiApp({ initialData }: LijiAppProps) {
  const workspace = useWorkspace(initialData);
  const { data } = workspace;
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [activeIdentity, setActiveIdentity] = useState<IdentityMode>("all");
  const [selectedContactId, setSelectedContactId] = useState(initialData.contacts[0]?.id ?? "");
  const [captureText, setCaptureText] = useState("下周五是女儿5岁生日，预算2000元");
  const [captureSource, setCaptureSource] = useState<CaptureSource>("text");
  const [draftName, setDraftName] = useState("");
  const [draftRelation, setDraftRelation] = useState("");
  const [draftLabels, setDraftLabels] = useState("重要客户,国企高管");
  const [draftPreference, setDraftPreference] = useState("");
  const [festivalBudget, setFestivalBudget] = useState("2000");
  const [travelOrigin, setTravelOrigin] = useState("上海");
  const [travelDestination, setTravelDestination] = useState("广州");
  const [travelStartDate, setTravelStartDate] = useState("2026-07-08");
  const [travelEndDate, setTravelEndDate] = useState("2026-07-10");
  const [dailyLimit, setDailyLimit] = useState("2400");
  const [travelTransportPriority, setTravelTransportPriority] = useState<NonNullable<TravelPreference["transportPriority"]>>("rail_under_5h");
  const [travelHotelStandard, setTravelHotelStandard] = useState<NonNullable<TravelPreference["hotelStandard"]>>("business");
  const [travelMealStandard, setTravelMealStandard] = useState<NonNullable<TravelPreference["mealStandard"]>>("business");
  const [travelClientAddress, setTravelClientAddress] = useState("广州天河客户办公室");
  const [authEmail, setAuthEmail] = useState("");
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [opsDashboard, setOpsDashboard] = useState<OpsDashboardState>({
    productionCheck: null,
    serviceSmoke: null,
    discrepancies: [],
    nativeCapabilities: [],
    notificationCodebook: [],
    entitlements: null,
    billingLedger: null,
    cpsApprovals: [],
    cpsPayout: null,
    opsAlerts: [],
  });
  const [isPending, startTransition] = useTransition();

  const identityContacts = useMemo(
    () => data.contacts.filter((contact) => contactMatchesIdentity(contact, activeIdentity)),
    [activeIdentity, data.contacts]
  );
  const identityEvents = useMemo(
    () => data.events.filter((event) => eventMatchesIdentity(event, data.contacts, activeIdentity)),
    [activeIdentity, data.contacts, data.events]
  );
  const identityPlans = useMemo(
    () => data.plans.filter((plan) => planMatchesIdentity(plan, data.contacts, activeIdentity)),
    [activeIdentity, data.contacts, data.plans]
  );
  const urgentEvents = useMemo(
    () => identityEvents.filter((event) => event.reminderLevel === "level_1"),
    [identityEvents]
  );
  const levelTwoCards = useMemo(
    () => buildLevelTwoRecommendationCards({
      data: { contacts: identityContacts, events: identityEvents },
      now: new Date(),
      horizonDays: 15,
    }),
    [identityContacts, identityEvents]
  );
  const effectiveSelectedContactId = identityContacts.some((contact) => contact.id === selectedContactId)
    ? selectedContactId
    : identityContacts[0]?.id ?? "";
  const pendingCaptures = data.captures.filter((item) => item.status === "pending");
  const relationshipBudget = data.budgets.find(
    (budget) => budget.category === "relationship"
  );

  const refreshOpsDashboard = useCallback(async () => {
    try {
      const [
        productionResponse,
        smokeResponse,
        discrepanciesResponse,
        nativeResponse,
        codebookResponse,
        entitlementsResponse,
        billingLedgerResponse,
        cpsApprovalsResponse,
        opsAlertsResponse,
      ] = await Promise.all([
        fetch("/api/ops/production-check"),
        fetch("/api/ops/service-smoke?iterations=3"),
        fetch("/api/fulfillment/discrepancies"),
        fetch("/api/capture/native-bridge"),
        fetch("/api/notifications/codebook"),
        fetch("/api/billing/entitlements"),
        fetch("/api/billing/ledger"),
        fetch("/api/finance/cps-approvals"),
        fetch("/api/ops/alerts"),
      ]);

      const [
        productionCheck,
        serviceSmoke,
        discrepanciesPayload,
        nativePayload,
        codebookPayload,
        entitlements,
        billingLedgerPayload,
        cpsApprovalsPayload,
        opsAlertsPayload,
      ] = await Promise.all([
        productionResponse.json() as Promise<ProductionCheckReport>,
        smokeResponse.json() as Promise<ServiceSmokeSuite>,
        discrepanciesResponse.json() as Promise<{ discrepancies?: FulfillmentReconciliationDiscrepancy[] }>,
        nativeResponse.json() as Promise<{ capabilities?: NativeBridgeCapability[] }>,
        codebookResponse.json() as Promise<{ codebook?: NotificationFailureCodebookEntry[] }>,
        entitlementsResponse.json() as Promise<EntitlementReport>,
        billingLedgerResponse.json() as Promise<{ ledger?: BillingUsageLedgerReport }>,
        cpsApprovalsResponse.json() as Promise<{ approvals?: CpsFinanceApprovalItem[]; payout?: CpsPayoutBatch }>,
        opsAlertsResponse.json() as Promise<{ alerts?: OpsAlertLifecycleItem[] }>,
      ]);

      setOpsDashboard({
        productionCheck,
        serviceSmoke,
        discrepancies: discrepanciesPayload.discrepancies ?? [],
        nativeCapabilities: nativePayload.capabilities ?? [],
        notificationCodebook: codebookPayload.codebook ?? [],
        entitlements,
        billingLedger: billingLedgerPayload.ledger ?? null,
        cpsApprovals: cpsApprovalsPayload.approvals ?? [],
        cpsPayout: cpsApprovalsPayload.payout ?? null,
        opsAlerts: opsAlertsPayload.alerts ?? [],
      });
    } catch {
      // Ops readiness is informational; keep the core assistant usable.
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    void supabase.auth.getUser().then(({ data: userData }) => {
      setAuthUserEmail(userData.user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserEmail(session?.user.email ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrations() {
      try {
        const response = await fetch("/api/integrations");
        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as {
          integrations?: IntegrationStatus[];
        };

        if (!cancelled) {
          setIntegrations(result.integrations ?? []);
        }
      } catch {
        // Integration status is informational; the app remains usable without it.
      }
    }

    void loadIntegrations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshOpsDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshOpsDashboard]);

  async function parseCaptureToInbox(params: {
    text: string;
    source: CaptureSource;
    clearDraft?: boolean;
  }) {
    if (!params.text.trim()) {
      toast.error("请输入采集内容");
      return;
    }

    startTransition(async () => {
      let result: ParseCaptureResponse;

      try {
        const response = await fetch("/api/parse-input", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: params.text,
            source: params.source,
            allowCloudModel: data.privacy.cloudModelEnabled,
          }),
        });
        result = (await response.json()) as ParseCaptureResponse;

        if (!response.ok || !result.capture) {
          throw new Error(result.error ?? "解析失败");
        }
      } catch {
        result = {
          capture: parseNaturalLanguageInput(params.text, data.contacts, new Date(), params.source),
          provider: "local-rules",
        };
      }

      workspace.setCaptures((captures) => [result.capture!, ...captures]);
      if (params.clearDraft) {
        setCaptureText("");
      }
      setActiveSection("dashboard");
      toast.success(result.provider === "openai" ? "云端 AI 已解析，待确认" : "本地规则已接管，待确认");
    });
  }

  async function handleParseCapture() {
    await parseCaptureToInbox({
      text: captureText,
      source: captureSource,
      clearDraft: true,
    });
  }

  function runQuickCapture(template: CaptureQuickStart) {
    setCaptureText(template.text);
    setCaptureSource(template.source);
    void parseCaptureToInbox({
      text: template.text,
      source: template.source,
      clearDraft: true,
    });
  }

  async function handleExtractCapture() {
    if (!captureText.trim()) {
      toast.error("请输入或粘贴待抽取内容");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: captureText,
          source: captureSource,
        }),
      });
      const result = (await response.json()) as {
        extraction?: {
          extractedText: string;
          provider: string;
          requiresManualReview: boolean;
          warnings: string[];
        };
        error?: string;
      };

      if (!response.ok || !result.extraction) {
        toast.error(result.error ?? "抽取失败");
        return;
      }

      if (result.extraction.extractedText) {
        setCaptureText(result.extraction.extractedText);
        toast.success(result.extraction.requiresManualReview ? "已抽取，建议确认后采集" : "已标准化输入");
        return;
      }

      toast.error(result.extraction.warnings[0] ?? "未抽取到文本");
    });
  }

  function updateCaptureDraft(captureId: string, patch: Partial<CaptureItem["parsed"]>) {
    workspace.setCaptures((captures) =>
      captures.map((capture) =>
        capture.id === captureId
          ? { ...capture, parsed: { ...capture.parsed, ...patch } }
          : capture
      )
    );
  }

  function confirmCapture(capture: CaptureItem) {
    workspace.setData((current) => applyConfirmedCapture(current, capture));
    toast.success("已确认并写入工作区");
  }

  function confirmCaptures(captures: CaptureItem[]) {
    if (captures.length === 0) {
      toast("暂无可批量确认的采集项");
      return;
    }

    workspace.setData((current) => applyConfirmedCaptures(current, captures));
    toast.success(`已批量确认 ${captures.length} 项`);
  }

  function rejectCapture(captureId: string) {
    workspace.setData((current) => rejectCaptureWorkflow(current, captureId));
    toast("已驳回该采集项");
  }

  function archiveCapture(captureId: string) {
    workspace.setData((current) => archiveCaptureWorkflow(current, captureId));
    toast("已归档该采集项");
  }

  function archiveCaptures(captureIds: string[]) {
    if (captureIds.length === 0) {
      toast("暂无可归档的采集项");
      return;
    }

    workspace.setData((current) => archiveCapturesWorkflow(current, captureIds));
    toast(`已归档 ${captureIds.length} 项低置信采集`);
  }

  function addContact() {
    const labels = draftLabels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    if (!draftName || !draftRelation) {
      toast.error("请填写姓名和关系");
      return;
    }

    const contact: Contact = {
      id: createUuid(),
      name: draftName,
      relation: draftRelation,
      labels,
      calendarType: "solar",
      preferences: draftPreference
        ? [
            {
              category: "gift",
              label: draftPreference,
              source: "manual",
              confidence: 0.9,
            },
          ]
        : [],
      compliance: deriveComplianceProfile(labels),
      aiMemoryHealth: 88,
    };

    workspace.setContacts((contacts) => [contact, ...contacts]);
    void postJson("/api/contacts", contact);
    setDraftName("");
    setDraftRelation("");
    setDraftPreference("");
    toast.success("已新增 VIP 画像");
  }

  function deleteContact(contactId: string) {
    workspace.setContacts((contacts) =>
      contacts.filter((contact) => contact.id !== contactId)
    );
    void fetch(`/api/contacts?id=${encodeURIComponent(contactId)}`, { method: "DELETE" });
    toast("已移除联系人");
  }

  function generateBirthdayPlan(eventId?: string) {
    const event =
      (eventId ? data.events.find((item) => item.id === eventId) : undefined) ??
      data.events.find((item) => item.id === "e-daughter-birthday") ??
      data.events[0];
    const contact = data.contacts.find((item) => item.id === event.contactId);
    const plan = generateFestivalPlan(event, contact, Number(festivalBudget) || 2000, new Date());
    workspace.setPlans((plans) => [plan, ...plans]);
    toast.success("已生成生日履约方案");
  }

  function generateBusinessTravelPlan() {
    const plan = generateTravelPlan({
      title: `${travelDestination}商务差旅方案`,
      startDate: travelStartDate,
      endDate: travelEndDate,
      destination: travelDestination,
      dailyLimitCny: Number(dailyLimit) || 2400,
      preference: {
        origin: travelOrigin,
        transportPriority: travelTransportPriority,
        hotelStandard: travelHotelStandard,
        mealStandard: travelMealStandard,
        clientAddress: travelClientAddress,
        maxHotelDistanceKm: 3,
      },
      now: new Date(),
    });
    workspace.setPlans((plans) => [plan, ...plans]);
    toast.success("已生成差旅方案");
  }

  async function runReminderScanNow() {
    startTransition(async () => {
      const response = await fetch("/api/run-reminders", { method: "POST" });
      const result = (await response.json()) as { logs: NotificationLog[] };
      workspace.setNotificationLogs((logs) => [...result.logs, ...logs]);
      toast.success("提醒扫描完成");
    });
  }

  async function runOpsJob(kind: "captureSla" | "notificationRetry" | "providerSync" | "productionCheck" | "serviceSmoke" | "fulfillmentDiscrepancies" | "nativeBridge" | "billingLedger" | "cpsApprovals" | "opsAlerts") {
    const config = {
      captureSla: {
        path: "/api/capture/sla/run",
        body: { limit: 20, staleMinutes: 30 },
        success: "采集 SLA 扫描完成",
      },
      notificationRetry: {
        path: "/api/notification-retries/run",
        body: { limit: 20 },
        success: "通知重试扫描完成",
      },
      providerSync: {
        path: "/api/fulfillment/provider-sync",
        body: { limit: 50 },
        success: "联盟订单同步完成",
      },
      productionCheck: {
        path: "/api/ops/production-check",
        body: undefined,
        success: "生产检查已刷新",
      },
      serviceSmoke: {
        path: "/api/ops/service-smoke",
        body: { iterations: 5 },
        success: "真实服务 dry-run 压测完成",
      },
      fulfillmentDiscrepancies: {
        path: "/api/fulfillment/discrepancies",
        body: undefined,
        success: "履约差异队列已刷新",
      },
      nativeBridge: {
        path: "/api/capture/native-bridge",
        body: undefined,
        success: "原生采集桥状态已刷新",
      },
      billingLedger: {
        path: "/api/billing/ledger",
        body: undefined,
        success: "权益扣减流水已刷新",
      },
      cpsApprovals: {
        path: "/api/finance/cps-approvals",
        body: undefined,
        success: "CPS 财务审批已刷新",
      },
      opsAlerts: {
        path: "/api/ops/alerts",
        body: undefined,
        success: "告警处置队列已刷新",
      },
    }[kind];

    startTransition(async () => {
      const response = await fetch(config.path, {
        method: config.body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(config.body ? { body: JSON.stringify(config.body) } : {}),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(result.error ?? "运营任务执行失败");
        return;
      }

      await refreshOpsDashboard();
      toast.success(config.success);
    });
  }

  async function registerPushNotifications() {
    const result = await registerBrowserPushSubscription();
    if (result.status === "registered") {
      toast.success("Web Push 已注册");
      const nextPrivacy = { ...data.privacy, webPushEnabled: true };
      workspace.setPrivacy(() => nextPrivacy);
      void postJson("/api/privacy/settings", nextPrivacy);
      return;
    }

    toast.error(result.reason);
  }

  function savePrivacy(nextPrivacy: PrivacySettings) {
    workspace.setPrivacy(() => nextPrivacy);
    void postJson("/api/privacy/settings", nextPrivacy);
  }

  function togglePrivacy(key: PrivacyToggleKey) {
    const nextPrivacy = {
      ...data.privacy,
      [key]: !data.privacy[key],
    };

    savePrivacy(nextPrivacy);
  }

  function updateNotificationPhone(value: string) {
    savePrivacy({
      ...data.privacy,
      notificationPhone: value.trim() || undefined,
    });
  }

  function exportData() {
    const exported = exportWorkspaceData(data);
    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `liji-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("已生成数据导出文件");
  }

  function requestLocalDeletion() {
    void fetch("/api/privacy/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "local" }),
    });
    const request = createDeletionRequest("local");
    workspace.resetWorkspace();
    toast.success(`本地删除请求已处理：${request.requestedAt.slice(0, 10)}`);
  }

  async function requestCloudDeletion() {
    const response = await fetch("/api/privacy/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "cloud" }),
    });
    const result = (await response.json()) as {
      deletion?: { requestedAt: string };
      error?: string;
      deletedTables?: string[];
      source?: "demo" | "supabase";
    };

    if (!response.ok) {
      toast.error(result.error ?? "云端删除失败");
      return;
    }

    if (result.source === "supabase") {
      workspace.resetWorkspace();
      toast.success(`云端数据已删除：${result.deletedTables?.length ?? 0} 张表`);
      return;
    }

    toast.success(`云端删除请求已登记：${result.deletion?.requestedAt.slice(0, 10) ?? "待处理"}`);
  }

  async function sendLoginLink() {
    const email = authEmail.trim();
    if (!email) {
      toast.error("请输入登录邮箱");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Supabase 环境变量未配置");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("登录链接已发送，请查收邮箱");
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Supabase 环境变量未配置");
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }

    setAuthUserEmail(null);
    toast.success("已退出云端账号");
  }

  function addFinanceBill(input: {
    title: string;
    amountCny: number;
    dueDay: number;
    accountLabel: string;
  }) {
    const bill: RecurringBill = {
      id: createUuid(),
      title: input.title,
      amountCny: input.amountCny,
      dueDay: input.dueDay,
      accountLabel: input.accountLabel,
      reminderLevel: "level_2",
      enabled: true,
    };

    workspace.setData((current) => addRecurringBillToWorkspace(current, bill));
    toast.success("周期账单已新增");
  }

  function addFinanceTransaction(input: {
    title: string;
    amountCny: number;
    category: Transaction["category"];
  }) {
    const transaction: Transaction = {
      id: createUuid(),
      title: input.title,
      amountCny: input.amountCny,
      category: input.category,
      occurredAt: new Date().toISOString().slice(0, 10),
      source: "manual",
    };

    workspace.setData((current) => addTransactionToWorkspace(current, transaction));
    toast.success("交易已入账并更新复盘");
  }

  function addSmsCaptures(captures: CaptureItem[]) {
    if (captures.length === 0) {
      toast("没有可导入的短信账单");
      return;
    }

    workspace.setCaptures((current) => [...captures, ...current]);
    toast.success(`已导入 ${captures.length} 条短信到账单确认中心`);
  }

  function updateBudgetLimit(budgetId: string, totalCny: number) {
    workspace.setData((current) => updateBudgetTotal(current, budgetId, totalCny));
  }

  function confirmPlan(planId: string) {
    workspace.setData((current) => setPlanStatus(current, planId, "confirmed"));
    toast.success("方案已确认");
  }

  function bookmarkPlan(planId: string) {
    workspace.setData((current) => setPlanStatus(current, planId, "bookmarked"));
    toast.success("方案已归档收藏");
  }

  function confirmEventRead(eventId: string) {
    workspace.setData((current) => acknowledgeEvent(current, eventId));
    toast.success("已确认提醒，停止升级");
  }

  function confirmLogRead(logId: string) {
    workspace.setData((current) => acknowledgeNotificationLog(current, logId));
    toast.success("投递日志已确认");
  }

  function correctMemory(memoryId: string) {
    const memory = data.aiMemories.find((item) => item.id === memoryId);
    if (!memory?.content.trim()) {
      toast.error("AI 记忆内容不能为空");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/ai-memories/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memoryId,
            content: memory.content,
          }),
        });
        const result = (await response.json()) as {
          memory?: AiMemory;
          resolvedAlerts?: number;
          error?: string;
        };

        if (!response.ok || !result.memory) {
          toast.error(result.error ?? "AI 记忆复核失败");
          return;
        }

        workspace.setData((current) => applyReviewedAiMemory(current, result.memory!));
        toast.success(
          result.resolvedAlerts && result.resolvedAlerts > 0
            ? `AI 记忆已复核，已清理 ${result.resolvedAlerts} 条告警`
            : "AI 记忆已复核"
        );
      } catch {
        const reviewed = reviewWorkspaceAiMemory(data, memoryId, {
          content: memory.content,
          now: new Date(),
        });
        if (reviewed.memory) {
          workspace.setData((current) =>
            reviewWorkspaceAiMemory(current, memoryId, {
              content: memory.content,
              now: new Date(),
            }).workspace
          );
          toast.success("AI 记忆已本地复核");
          return;
        }

        toast.error("AI 记忆复核失败");
      }
    });
  }

  function updateMemoryContent(memoryId: string, content: string) {
    workspace.setData((current) => ({
      ...current,
      aiMemories: current.aiMemories.map((memory) =>
        memory.id === memoryId
          ? {
              ...memory,
              content,
              confidence: Math.min(memory.confidence, 0.99),
              reviewStatus: "review_required",
              correctedAt: undefined,
            }
          : memory
      ),
    }));
  }

  function confirmPreferenceSuggestion(suggestion: PreferenceSuggestion) {
    workspace.setData((current) => applyPreferenceSuggestion(current, suggestion));
    toast.success("偏好已写入画像");
  }

  function runRelationshipAction(action: RelationshipAction) {
    setSelectedContactId(action.contactId);

    if (action.scenario === "profile") {
      toast("已定位画像缺口，请补充偏好或标签");
      return;
    }

    workspace.setData((current) => applyRelationshipAction(current, action));
    toast.success("关系行动已推进");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[244px] shrink-0 border-r bg-sidebar px-4 py-5 lg:flex lg:flex-col">
          <BrandBlock />
          <nav className="mt-8 flex flex-col gap-1" aria-label="主导航">
            {sectionItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "secondary" : "ghost"}
                className="justify-start"
                onClick={() => setActiveSection(item.id)}
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4 text-primary" />
              隐私护栏
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              PII 脱敏开启，云端模型默认关闭。
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="lg:hidden">
                  <BrandBlock compact />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm text-muted-foreground">2026年7月1日 · Asia/Shanghai</p>
                  <h1 className="text-xl font-semibold tracking-normal">我的看板</h1>
                </div>
                <IdentitySwitcher value={activeIdentity} onChange={setActiveIdentity} />
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="hidden md:inline-flex">
                    {workspace.storageState === "synced"
                      ? "已同步云端数据"
                      : workspace.storageState === "restored"
                        ? "已恢复本地数据"
                        : workspace.storageState === "saved"
                          ? "已本地保存"
                          : "演示数据"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={runReminderScanNow} disabled={isPending}>
                    {isPending ? <Loader2Icon data-icon="inline-start" /> : <RotateCwIcon data-icon="inline-start" />}
                    扫描提醒
                  </Button>
                </div>
              </div>

              <div className="w-full max-w-3xl">
                <InputGroup className="h-10">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="采集收件箱输入"
                    value={captureText}
                    onChange={(event) => setCaptureText(event.target.value)}
                    placeholder="输入：下周五是女儿5岁生日，预算2000元"
                  />
                  <InputGroupAddon>
                    <Select value={captureSource} onValueChange={(value) => setCaptureSource(value as CaptureSource)}>
                      <SelectTrigger size="sm" aria-label="采集来源">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="text">文字</SelectItem>
                          <SelectItem value="voice">语音</SelectItem>
                          <SelectItem value="screenshot">截图</SelectItem>
                          <SelectItem value="chat">聊天</SelectItem>
                          <SelectItem value="bill">账单</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton aria-label="抽取文本" onClick={handleExtractCapture} disabled={isPending}>
                      <SparklesIcon />
                    </InputGroupButton>
                    <InputGroupButton onClick={handleParseCapture} disabled={isPending}>
                      <SendIcon data-icon="inline-start" />
                      采集
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <div className="mt-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                  {captureQuickStarts.map((template) => (
                    <Button
                      key={template.label}
                      size="sm"
                      variant="ghost"
                      className="justify-start border px-2"
                      aria-label={`快捷采集 ${template.label}`}
                      disabled={isPending}
                      onClick={() => runQuickCapture(template)}
                    >
                      <SparklesIcon data-icon="inline-start" />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_328px]">
            <section className="min-w-0 px-4 py-4 md:px-6 md:py-6">
              {activeSection === "dashboard" && (
                <DashboardSection
                  data={data}
                  contacts={identityContacts}
                  events={identityEvents}
                  plans={identityPlans}
                  identity={identityLabel(activeIdentity)}
                  levelTwoCards={levelTwoCards}
                  pendingCaptures={pendingCaptures}
                  relationshipBudget={relationshipBudget}
                  onConfirm={confirmCapture}
                  onConfirmMany={confirmCaptures}
                  onReject={rejectCapture}
                  onArchive={archiveCapture}
                  onArchiveMany={archiveCaptures}
                  onEditCapture={updateCaptureDraft}
                  onBirthdayPlan={generateBirthdayPlan}
                  onTravelPlan={generateBusinessTravelPlan}
                  onConfirmEvent={confirmEventRead}
                  onConfirmLog={confirmLogRead}
                  onConfirmPlan={confirmPlan}
                  onCorrectMemory={correctMemory}
                  onNavigate={setActiveSection}
                />
              )}
              {activeSection === "contacts" && (
                <ContactsSection
                  data={data}
                  contacts={identityContacts}
                  events={identityEvents}
                  plans={identityPlans}
                  selectedContactId={effectiveSelectedContactId}
                  draftName={draftName}
                  draftRelation={draftRelation}
                  draftLabels={draftLabels}
                  draftPreference={draftPreference}
                  onDraftName={setDraftName}
                  onDraftRelation={setDraftRelation}
                  onDraftLabels={setDraftLabels}
                  onDraftPreference={setDraftPreference}
                  onAddContact={addContact}
                  onDeleteContact={deleteContact}
                  onSelectContact={setSelectedContactId}
                  onCorrectMemory={correctMemory}
                  onUpdateMemory={updateMemoryContent}
                  onConfirmPreferenceSuggestion={confirmPreferenceSuggestion}
                  onRelationshipAction={runRelationshipAction}
                  memoryReviewPending={isPending}
                />
              )}
              {activeSection === "calendar" && (
                <CalendarSection
                  contacts={identityContacts}
                  events={identityEvents}
                  onRunReminders={runReminderScanNow}
                />
              )}
              {activeSection === "fulfillment" && (
                <FulfillmentSection
                  data={data}
                  festivalBudget={festivalBudget}
                  travelOrigin={travelOrigin}
                  travelDestination={travelDestination}
                  travelStartDate={travelStartDate}
                  travelEndDate={travelEndDate}
                  dailyLimit={dailyLimit}
                  travelTransportPriority={travelTransportPriority}
                  travelHotelStandard={travelHotelStandard}
                  travelMealStandard={travelMealStandard}
                  travelClientAddress={travelClientAddress}
                  onFestivalBudget={setFestivalBudget}
                  onTravelOrigin={setTravelOrigin}
                  onTravelDestination={setTravelDestination}
                  onTravelStartDate={setTravelStartDate}
                  onTravelEndDate={setTravelEndDate}
                  onDailyLimit={setDailyLimit}
                  onTravelTransportPriority={setTravelTransportPriority}
                  onTravelHotelStandard={setTravelHotelStandard}
                  onTravelMealStandard={setTravelMealStandard}
                  onTravelClientAddress={setTravelClientAddress}
                  onBirthdayPlan={generateBirthdayPlan}
                  onTravelPlan={generateBusinessTravelPlan}
                  onConfirmPlan={confirmPlan}
                  onBookmarkPlan={bookmarkPlan}
                />
              )}
              {activeSection === "finance" && (
                <FinanceSection
                  data={data}
                  onAddBill={addFinanceBill}
                  onAddTransaction={addFinanceTransaction}
                  onUpdateBudget={updateBudgetLimit}
                  onSmsCaptures={addSmsCaptures}
                  onVoiceLedger={(text) => {
                    void parseCaptureToInbox({ text, source: "voice", clearDraft: false });
                  }}
                />
              )}
              {activeSection === "ops" && (
                <OperationsSection
                  data={data}
                  integrations={integrations}
                  opsDashboard={opsDashboard}
                  onRunJob={runOpsJob}
                  onNavigate={setActiveSection}
                  pending={isPending}
                />
              )}
              {activeSection === "privacy" && (
                <PrivacySection
                  data={data}
                  onToggle={togglePrivacy}
                  onNotificationPhone={updateNotificationPhone}
                  onReset={workspace.resetWorkspace}
                  onExport={exportData}
                  onDeleteLocal={requestLocalDeletion}
                  onDeleteCloud={requestCloudDeletion}
                  onRegisterPush={registerPushNotifications}
                  authEmail={authEmail}
                  authUserEmail={authUserEmail}
                  integrations={integrations}
                  onAuthEmail={setAuthEmail}
                  onSendLoginLink={sendLoginLink}
                  onSignOut={signOut}
                />
              )}
            </section>

            <aside className="border-t bg-muted/30 px-4 py-4 xl:border-l xl:border-t-0 xl:px-5 xl:py-6">
              <RightRail
                urgentEvents={urgentEvents}
                logs={data.notificationLogs}
                pendingCaptures={pendingCaptures}
                onNavigate={setActiveSection}
                onConfirmEvent={confirmEventRead}
                onConfirmLog={confirmLogRead}
                onConfirmMany={confirmCaptures}
              />
            </aside>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t bg-background lg:hidden">
        {sectionItems.map((item) => (
          <button
            key={item.id}
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground data-[active=true]:text-primary"
            data-active={activeSection === item.id}
            onClick={() => setActiveSection(item.id)}
            type="button"
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
        礼
      </div>
      {!compact && (
        <div>
          <div className="text-lg font-semibold tracking-normal">礼记</div>
          <div className="text-xs text-muted-foreground">个人AI贴身秘书</div>
        </div>
      )}
    </div>
  );
}

function IdentitySwitcher({
  value,
  onChange,
}: {
  value: IdentityMode;
  onChange: (value: IdentityMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
      {identityOptions.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? "secondary" : "ghost"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function DashboardSection(props: {
  data: WorkspaceData;
  contacts: Contact[];
  events: CalendarEvent[];
  plans: FulfillmentPlan[];
  identity: string;
  levelTwoCards: LevelTwoRecommendationCard[];
  pendingCaptures: CaptureItem[];
  relationshipBudget: WorkspaceData["budgets"][number] | undefined;
  onConfirm: (capture: CaptureItem) => void;
  onConfirmMany: (captures: CaptureItem[]) => void;
  onReject: (captureId: string) => void;
  onArchive: (captureId: string) => void;
  onArchiveMany: (captureIds: string[]) => void;
  onEditCapture: (captureId: string, patch: Partial<CaptureItem["parsed"]>) => void;
  onBirthdayPlan: (eventId?: string) => void;
  onTravelPlan: () => void;
  onConfirmEvent: (eventId: string) => void;
  onConfirmLog: (logId: string) => void;
  onConfirmPlan: (planId: string) => void;
  onCorrectMemory: (memoryId: string) => void;
  onNavigate: (section: SectionId) => void;
}) {
  const { data, pendingCaptures, relationshipBudget } = props;
  const scopedData = {
    ...data,
    contacts: props.contacts,
    events: props.events,
    plans: props.plans,
  };
  const commandCenter = buildSecretaryCommandCenter({
    data: scopedData,
    levelTwoCards: props.levelTwoCards,
  });
  const scenarioAcceptance = buildScenarioAcceptance({
    data: scopedData,
    levelTwoCards: props.levelTwoCards,
  });
  const featureAcceptance = buildFeatureAcceptanceMatrix({
    data: scopedData,
    levelTwoCards: props.levelTwoCards,
  });
  const remediationTasks = buildDataAssetRemediationTasks(scopedData, 6);
  const assetLedger = buildDataAssetLedger(scopedData, 12);
  const timeline = buildSecretaryTimeline(data, 8);
  const highConfidenceCaptures = pendingCaptures.filter((capture) => capture.parsed.confidence >= 0.75);
  const lowConfidenceCaptures = pendingCaptures.filter((capture) => capture.parsed.confidence < 0.65);

  function runAssistantAction(action: AssistantAction) {
    if (action.id.startsWith("reminder:")) {
      props.onConfirmEvent(action.id.replace("reminder:", ""));
      return;
    }

    if (action.id.startsWith("capture:")) {
      const capture = pendingCaptures.find((item) => action.id === `capture:${item.id}`);
      if (capture && capture.parsed.confidence >= 0.75) {
        props.onConfirm(capture);
        return;
      }

      toast("低置信采集需要先编辑确认");
      props.onNavigate("dashboard");
      return;
    }

    if (action.id.startsWith("level2:")) {
      const card = props.levelTwoCards.find((item) => action.id === `level2:${item.id}`);
      if (card) {
        runLevelTwoRecommendationAction(card);
      } else {
        props.onBirthdayPlan();
      }
      return;
    }

    if (action.id.startsWith("memory:")) {
      props.onCorrectMemory(action.id.replace("memory:", ""));
      return;
    }

    props.onNavigate(action.section);
  }

  function runDataAssetHealthAction(asset: DataAssetItem) {
    if (asset.key === "fulfillment") {
      const pendingPlan = props.plans.find((plan) => plan.status === "draft" || plan.status === "pending_confirmation");
      if (pendingPlan) {
        props.onConfirmPlan(pendingPlan.id);
        return;
      }
    }

    if (asset.key === "memory") {
      const reviewMemory = data.aiMemories.find((memory) =>
        memory.reviewStatus === "review_required" || memory.reviewStatus === "stale"
      );
      if (reviewMemory) {
        props.onCorrectMemory(reviewMemory.id);
        return;
      }
    }

    if (asset.key === "schedule") {
      const unconfirmedLevelOne = props.events.find((event) =>
        event.reminderLevel === "level_1" && event.status !== "confirmed" && event.status !== "done"
      );
      if (unconfirmedLevelOne) {
        props.onConfirmEvent(unconfirmedLevelOne.id);
        return;
      }
    }

    props.onNavigate(asset.section);
  }

  function runLevelTwoRecommendationAction(card: LevelTwoRecommendationCard) {
    const plan = props.plans.find((item) => item.eventId === card.eventId);
    if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
      props.onConfirmPlan(plan.id);
      return;
    }

    if (!plan) {
      props.onBirthdayPlan(card.eventId);
      return;
    }

    props.onNavigate("fulfillment");
  }

  function levelTwoRecommendationCta(card: LevelTwoRecommendationCard) {
    const plan = props.plans.find((item) => item.eventId === card.eventId);
    if (!plan) return "生成方案";
    return plan.status === "confirmed" || plan.status === "bookmarked" ? "查看方案" : "确认方案";
  }

  function runScenarioJourneyAction(journey: ScenarioJourney) {
    if (journey.id === "relationship_care") {
      const card = props.levelTwoCards[0];
      if (card) {
        runLevelTwoRecommendationAction(card);
        return;
      }

      const festivalPlan = props.plans.find((plan) => plan.scenario === "festival");
      if (festivalPlan && festivalPlan.status !== "confirmed" && festivalPlan.status !== "bookmarked") {
        props.onConfirmPlan(festivalPlan.id);
        return;
      }

      if (!festivalPlan) {
        props.onBirthdayPlan();
        return;
      }
    }

    if (journey.id === "travel_fulfillment") {
      const travelPlan = props.plans.find((plan) => plan.scenario === "travel");
      if (travelPlan && travelPlan.status !== "confirmed" && travelPlan.status !== "bookmarked") {
        props.onConfirmPlan(travelPlan.id);
        return;
      }

      if (!travelPlan) {
        props.onTravelPlan();
        return;
      }
    }

    if (journey.id === "bill_recap") {
      const billEvent = props.events.find((event) =>
        event.source === "bill" &&
        event.reminderLevel === "level_1" &&
        event.status !== "confirmed" &&
        event.status !== "done"
      );
      if (billEvent) {
        props.onConfirmEvent(billEvent.id);
        return;
      }
    }

    props.onNavigate(journey.id === "bill_recap" ? "finance" : "fulfillment");
  }

  function runScenarioAcceptanceAction(scenario: ScenarioAcceptanceItem) {
    if (scenario.id === "birthday_care") {
      const birthdayEvent = props.events.find((event) => /生日|纪念日/.test(event.title));
      const plan = props.plans.find((item) =>
        item.scenario === "festival" &&
        (!birthdayEvent || item.eventId === birthdayEvent.id || item.title.includes("生日"))
      );

      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }

      if (!plan) {
        props.onBirthdayPlan(birthdayEvent?.id);
        return;
      }
    }

    if (scenario.id === "client_hospitality") {
      const event = props.events.find((item) => /宴请|客户|会议|会面/.test(item.title));
      if (event && event.reminderLevel === "level_1" && event.status !== "confirmed" && event.status !== "done") {
        props.onConfirmEvent(event.id);
        return;
      }
    }

    if (scenario.id === "travel_planning") {
      const plan = props.plans.find((item) => item.scenario === "travel");
      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }

      if (!plan) {
        props.onTravelPlan();
        return;
      }
    }

    if (scenario.id === "bill_recap") {
      const event = props.events.find((item) =>
        item.source === "bill" &&
        item.reminderLevel === "level_1" &&
        item.status !== "confirmed" &&
        item.status !== "done"
      );
      if (event) {
        props.onConfirmEvent(event.id);
        return;
      }
    }

    props.onNavigate(scenario.section);
  }

  function runFeatureAcceptanceAction(feature: FeatureAcceptanceItem) {
    if (feature.id === "F202") {
      const unconfirmedLevelOne = props.events.filter(
        (event) => event.reminderLevel === "level_1" && event.status !== "confirmed"
      );
      if (unconfirmedLevelOne.length > 0) {
        unconfirmedLevelOne.forEach((event) => props.onConfirmEvent(event.id));
        return;
      }
    }

    if (feature.id === "F301" || feature.id === "F302") {
      const targetScenario = feature.id === "F301" ? "festival" : "travel";
      const plan = props.plans.find((item) => item.scenario === targetScenario);
      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }
      if (feature.id === "F301" && !plan) {
        props.onBirthdayPlan();
        return;
      }
    }

    props.onNavigate(feature.section);
  }

  function runRemediationTaskAction(task: DataAssetRemediationTask) {
    if (task.id.startsWith("memory:")) {
      props.onCorrectMemory(task.id.replace("memory:", ""));
      return;
    }

    if (task.id.startsWith("fulfillment:")) {
      const planId = task.id.replace("fulfillment:", "");
      const plan = props.plans.find((item) => item.id === planId);
      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }
    }

    props.onNavigate(task.section);
  }

  function runAssetLedgerAction(entry: DataAssetLedgerEntry) {
    if (entry.status !== "linked" && entry.id.startsWith("fulfillment:")) {
      const planId = entry.id.replace("fulfillment:", "");
      const plan = props.plans.find((item) => item.id === planId);
      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }
    }

    if (entry.status !== "linked" && entry.id.startsWith("memory:")) {
      props.onCorrectMemory(entry.id.replace("memory:", ""));
      return;
    }

    props.onNavigate(entry.section);
  }

  function runTimelineAction(item: SecretaryTimelineItem) {
    if (item.id.startsWith("capture:")) {
      const capture = pendingCaptures.find((entry) => item.id === `capture:${entry.id}`);
      if (capture && capture.parsed.confidence >= 0.75) {
        props.onConfirm(capture);
        return;
      }

      toast("低置信采集需要先编辑确认");
      props.onNavigate("dashboard");
      return;
    }

    if (item.id.startsWith("event:")) {
      const eventId = item.id.replace("event:", "");
      const event = props.events.find((entry) => entry.id === eventId);
      if (event && event.status !== "confirmed" && event.status !== "done") {
        props.onConfirmEvent(event.id);
        return;
      }
    }

    if (item.id.startsWith("plan:")) {
      const planId = item.id.replace("plan:", "");
      const plan = props.plans.find((entry) => entry.id === planId);
      if (plan && plan.status !== "confirmed" && plan.status !== "bookmarked") {
        props.onConfirmPlan(plan.id);
        return;
      }
    }

    if (item.id.startsWith("notification:")) {
      const logId = item.id.replace("notification:", "");
      const log = data.notificationLogs.find((entry) => entry.id === logId);
      if (log && (log.status === "queued" || log.status === "sent" || log.status === "escalated")) {
        props.onConfirmLog(log.id);
        return;
      }
    }

    if (item.id.startsWith("memory:")) {
      props.onCorrectMemory(item.id.replace("memory:", ""));
      return;
    }

    props.onNavigate(item.section);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>今日秘书工作台</CardTitle>
            <CardDescription>按风险、时效和资产缺口排序。</CardDescription>
            <CardAction>
              <Badge variant={assetStatusVariant(commandCenter.dataAssets.status)}>
                资产分 {commandCenter.dataAssets.score}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {commandCenter.actions.slice(0, 4).map((action) => (
                <div key={action.id} className="flex min-h-32 flex-col justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityBadgeVariant(action.priority)}>
                        {priorityText(action.priority)}
                      </Badge>
                      <Badge variant="outline">{action.scenario}</Badge>
                    </div>
                    <div className="mt-2 font-medium">{action.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                  </div>
                  <Button
                    className="mt-3 w-fit"
                    size="sm"
                    variant="outline"
                    aria-label={`执行秘书动作 ${action.title}`}
                    onClick={() => runAssistantAction(action)}
                  >
                    {action.scenario === "reminder" ? <CheckIcon data-icon="inline-start" /> : <SearchIcon data-icon="inline-start" />}
                    {action.cta}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据资产体检</CardTitle>
            <CardDescription>{commandCenter.dataAssets.nextAssetAction}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {commandCenter.dataAssets.items.map((asset) => (
                <DataAssetHealthRow
                  key={asset.key}
                  asset={asset}
                  onAction={runDataAssetHealthAction}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <AiContinuityCard report={commandCenter.aiContinuity} onAction={(section) => props.onNavigate(section)} />
        <ScenarioJourneyCard journeys={commandCenter.journeys} onAction={runScenarioJourneyAction} />
      </div>

      <ScenarioAcceptanceCard scenarios={scenarioAcceptance} onAction={runScenarioAcceptanceAction} />

      <FeatureAcceptanceMatrixCard features={featureAcceptance} onAction={runFeatureAcceptanceAction} />

      <DataAssetRemediationCard tasks={remediationTasks} onAction={runRemediationTaskAction} />

      <DataAssetLedgerCard entries={assetLedger} onAction={runAssetLedgerAction} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="待确认任务"
          value={String(pendingCaptures.length)}
          detail="采集收件箱"
          icon={ClipboardCheckIcon}
        />
        <MetricCard
          title="本月人情预算"
          value={relationshipBudget ? formatCny(relationshipBudget.totalCny - relationshipBudget.spentCny) : "¥0"}
          detail="剩余额度"
          icon={HandCoinsIcon}
        />
        <MetricCard
          title="Level 1"
          value={String(props.events.filter((event) => event.reminderLevel === "level_1").length)}
          detail={`${props.identity}红线提醒`}
          icon={BellRingIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>任务与确认中心</CardTitle>
            <CardDescription>AI 解析内容先确认，再写入画像、日程或账单。</CardDescription>
            <CardAction>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`批量确认高置信采集 ${highConfidenceCaptures.length}`}
                  disabled={highConfidenceCaptures.length === 0}
                  onClick={() => props.onConfirmMany(highConfidenceCaptures)}
                >
                  <CheckIcon data-icon="inline-start" />
                  确认高置信 {highConfidenceCaptures.length}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`归档低置信采集 ${lowConfidenceCaptures.length}`}
                  disabled={lowConfidenceCaptures.length === 0}
                  onClick={() => props.onArchiveMany(lowConfidenceCaptures.map((capture) => capture.id))}
                >
                  <ArchiveIcon data-icon="inline-start" />
                  归档低置信 {lowConfidenceCaptures.length}
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {pendingCaptures.length === 0 ? (
                <EmptyLine title="暂无待确认采集" detail="试试在顶部输入生日、差旅或账单。" />
              ) : (
                pendingCaptures.map((capture) => (
                  <div key={capture.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{capture.parsed.intent}</Badge>
                          <Badge variant="outline">{captureSourceLabel(capture.sourceType)}</Badge>
                          <span className="font-medium">{capture.parsed.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(capture.parsed.confidence * 100)}%
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{capture.maskedText}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
                          <Input
                            aria-label={`编辑标题 ${capture.parsed.title}`}
                            value={capture.parsed.title}
                            onChange={(event) => props.onEditCapture(capture.id, { title: event.target.value })}
                          />
                          <Input
                            aria-label={`编辑日期 ${capture.parsed.title}`}
                            value={capture.parsed.date ?? ""}
                            onChange={(event) => props.onEditCapture(capture.id, { date: event.target.value })}
                          />
                          <Input
                            aria-label={`编辑预算 ${capture.parsed.title}`}
                            inputMode="numeric"
                            value={capture.parsed.budgetCny ?? capture.parsed.amountCny ?? ""}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              props.onEditCapture(capture.id, {
                                budgetCny: Number.isFinite(value) ? value : undefined,
                                amountCny: Number.isFinite(value) ? value : undefined,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          aria-label={`确认采集 ${capture.parsed.title}`}
                          onClick={() => props.onConfirm(capture)}
                        >
                          <CheckIcon data-icon="inline-start" />
                          确认
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`归档采集 ${capture.parsed.title}`}
                          onClick={() => props.onArchive(capture.id)}
                        >
                          <ArchiveIcon data-icon="inline-start" />
                          归档
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`驳回采集 ${capture.parsed.title}`}
                          onClick={() => props.onReject(capture.id)}
                        >
                          <XIcon data-icon="inline-start" />
                          驳回
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>预算与履约</CardTitle>
            <CardDescription>额度拆解后生成可跳转方案，不保存支付凭证。</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => props.onBirthdayPlan()}>
                <SparklesIcon data-icon="inline-start" />
                一键生成方案
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {data.budgets.map((budget) => {
                const percent = Math.min(100, Math.round((budget.spentCny / budget.totalCny) * 100));
                return (
                  <Progress key={budget.id} value={percent}>
                    <ProgressLabel>{budget.label}</ProgressLabel>
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                      {percent}%
                    </span>
                  </Progress>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <span className="text-sm text-muted-foreground">最近方案：{props.plans[0]?.title ?? "待生成"}</span>
            <Button size="sm" variant="ghost" onClick={() => props.onNavigate("fulfillment")}>
              查看履约
            </Button>
          </CardFooter>
        </Card>
      </div>

      <SecretaryTimelineCard timeline={timeline} onAction={runTimelineAction} />

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Level 2 推荐卡片</CardTitle>
            <CardDescription>提前 15 天进入每日方案推荐。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {props.levelTwoCards.length === 0 ? (
                <EmptyLine title="暂无 Level 2 推荐" detail="当前身份视图 15 天内没有重要节日。" />
              ) : (
                props.levelTwoCards.slice(0, 3).map((card) => (
                  <div key={card.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{card.title}</div>
                      <Badge variant={card.priority === "today" ? "destructive" : "secondary"}>
                        {card.daysUntil === 0 ? "今天" : `${card.daysUntil}天后`}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.recommendation}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {card.actions.map((action) => (
                        <Badge key={action} variant="outline">{action}</Badge>
                      ))}
                    </div>
                    <Button
                      className="mt-3 w-fit"
                      size="sm"
                      variant="outline"
                      aria-label={`执行Level 2推荐 ${card.title}`}
                      onClick={() => runLevelTwoRecommendationAction(card)}
                    >
                      <SparklesIcon data-icon="inline-start" />
                      {levelTwoRecommendationCta(card)}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>VIP 画像</CardTitle>
            <CardDescription>偏好、忌口、合规限制集中维护。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactList contacts={props.contacts.slice(0, 3)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月度复盘</CardTitle>
            <CardDescription>{data.insight.period} 秘书分析周记</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <InsightCell label="健康度" value={`${data.insight.healthScore}`} />
              <InsightCell label="压力指数" value={`${data.insight.pressureIndex}`} />
              <InsightCell label="人情支出" value={formatCny(data.insight.relationshipCny)} />
              <InsightCell label="差旅出行" value={formatCny(data.insight.travelCny)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{data.insight.summary}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DataAssetHealthRow({
  asset,
  onAction,
}: {
  asset: DataAssetItem;
  onAction: (asset: DataAssetItem) => void;
}) {
  const actionLabel = asset.status === "healthy" ? "查看资产" : "补齐资产";

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{asset.label}</span>
        <div className="flex items-center gap-2">
          <Badge variant={assetStatusVariant(asset.status)}>{assetStatusText(asset.status)}</Badge>
          <Button
            size="xs"
            variant="ghost"
            aria-label={`${actionLabel} ${asset.label}`}
            onClick={() => onAction(asset)}
          >
            {asset.status === "healthy" ? "查看" : "补齐"}
          </Button>
        </div>
      </div>
      <Progress value={Math.round((asset.owned / Math.max(1, asset.total)) * 100)}>
        <ProgressLabel>{asset.owned}/{asset.total}</ProgressLabel>
        <span className="ml-auto text-xs text-muted-foreground">{asset.gap}</span>
      </Progress>
    </div>
  );
}

function DataAssetLedgerCard({
  entries,
  onAction,
}: {
  entries: DataAssetLedgerEntry[];
  onAction: (entry: DataAssetLedgerEntry) => void;
}) {
  const openCount = entries.filter((entry) => entry.status !== "linked").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>资产明细台账</CardTitle>
        <CardDescription>解释每条关系、日程、账单、履约和 AI 记忆为什么被计入资产分。</CardDescription>
        <CardAction>
          <Badge variant={openCount > 0 ? "outline" : "secondary"}>{openCount} 项待处理</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.id} className="flex min-h-32 flex-col justify-between rounded-lg border p-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{entry.assetKey}</Badge>
                  <Badge variant={ledgerStatusVariant(entry.status)}>{ledgerStatusText(entry.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.evidence}</span>
                </div>
                <div className="mt-2 font-medium">{entry.title}</div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{entry.detail}</p>
              </div>
              <Button
                className="mt-3 w-fit"
                size="sm"
                variant="outline"
                aria-label={`${entry.status === "linked" ? "查看资产明细" : "执行资产明细"} ${entry.title}`}
                onClick={() => onAction(entry)}
              >
                {entry.status === "linked" ? <SearchIcon data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                {entry.cta}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DataAssetRemediationCard({
  tasks,
  onAction,
}: {
  tasks: DataAssetRemediationTask[];
  onAction: (task: DataAssetRemediationTask) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>资产补齐任务包</CardTitle>
        <CardDescription>把关系、日程、账单、记忆和履约缺口转成下一步动作。</CardDescription>
        <CardAction>
          <Badge variant={tasks.some((task) => task.priority === "critical") ? "destructive" : tasks.length > 0 ? "outline" : "secondary"}>
            {tasks.length} 项待补
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyLine title="资产链路完整" detail="当前身份视图下暂无需要补齐的关系、日程或履约资产。" />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex min-h-32 flex-col justify-between rounded-lg border p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={remediationPriorityVariant(task.priority)}>
                      {remediationPriorityText(task.priority)}
                    </Badge>
                    <Badge variant="outline">{task.assetKey}</Badge>
                    <span className="text-xs text-muted-foreground">{task.evidence}</span>
                  </div>
                  <div className="mt-2 font-medium">{task.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{task.detail}</p>
                </div>
                <Button
                  className="mt-3 w-fit"
                  size="sm"
                  variant="outline"
                  aria-label={`执行资产补齐 ${task.title}`}
                  onClick={() => onAction(task)}
                >
                  <ClipboardCheckIcon data-icon="inline-start" />
                  {task.cta}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScenarioAcceptanceCard({
  scenarios,
  onAction,
}: {
  scenarios: ScenarioAcceptanceItem[];
  onAction: (scenario: ScenarioAcceptanceItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>场景验收作战室</CardTitle>
        <CardDescription>按生日、宴请、差旅、账单四条主线检查闭环卡点。</CardDescription>
        <CardAction>
          <Badge variant={scenarios.some((item) => item.status === "blocked") ? "destructive" : "secondary"}>
            {scenarios.filter((item) => item.status !== "ready").length} 个待推进
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-lg border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{scenario.label}</div>
                <Badge variant={scenarioAcceptanceStatusVariant(scenario.status)}>
                  {scenarioAcceptanceStatusText(scenario.status)}
                </Badge>
              </div>
              <Progress value={scenario.progress}>
                <ProgressLabel>{scenario.progress}%</ProgressLabel>
                <span className="ml-auto text-xs text-muted-foreground">{scenario.nextStep}</span>
              </Progress>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{scenario.currentStep}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {scenario.checks.map((check) => (
                  <Badge key={check.id} variant={check.passed ? "secondary" : check.critical ? "destructive" : "outline"}>
                    {check.passed ? "✓" : "!"} {check.label}
                  </Badge>
                ))}
              </div>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                aria-label={`执行场景验收 ${scenario.label}`}
                onClick={() => onAction(scenario)}
              >
                <ListChecksIcon data-icon="inline-start" />
                {scenario.cta}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureAcceptanceMatrixCard({
  features,
  onAction,
}: {
  features: FeatureAcceptanceItem[];
  onAction: (feature: FeatureAcceptanceItem) => void;
}) {
  const openCount = features.filter((feature) => feature.status !== "accepted").length;
  const hasBlocked = features.some((feature) => feature.status === "blocked");

  return (
    <Card>
      <CardHeader>
        <CardTitle>功能验收矩阵</CardTitle>
        <CardDescription>对照需求功能 ID 自动检查秘书能力、数据资产和确认闭环。</CardDescription>
        <CardAction>
          <Badge variant={hasBlocked ? "destructive" : openCount > 0 ? "outline" : "secondary"}>
            {openCount} 项待验收
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.id} className="flex min-h-48 flex-col justify-between rounded-lg border p-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{feature.id}</Badge>
                  <Badge variant={featureAcceptanceStatusVariant(feature.status)}>
                    {featureAcceptanceStatusText(feature.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{feature.module}</span>
                </div>
                <div className="mt-2 font-medium">{feature.id} · {feature.label}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.evidence}</p>
                <Progress className="mt-3" value={feature.progress}>
                  <ProgressLabel>{feature.progress}%</ProgressLabel>
                  <span className="ml-auto text-xs text-muted-foreground">{feature.nextStep}</span>
                </Progress>
                <div className="mt-3 flex flex-wrap gap-1">
                  {feature.checks.map((check) => (
                    <Badge key={check.id} variant={check.passed ? "secondary" : check.critical ? "destructive" : "outline"}>
                      {check.passed ? "✓" : "!"} {check.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button className="mt-3 w-fit" size="sm" variant="outline" onClick={() => onAction(feature)}>
                <ClipboardCheckIcon data-icon="inline-start" />
                {feature.cta}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SecretaryTimelineCard({
  timeline,
  onAction,
}: {
  timeline: SecretaryTimelineItem[];
  onAction: (item: SecretaryTimelineItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>秘书时间线</CardTitle>
        <CardDescription>采集、提醒、履约、账单和投递日志统一串联。</CardDescription>
        <CardAction>
          <Badge variant={timeline.some((item) => item.status === "blocked") ? "destructive" : "secondary"}>
            {timeline.filter((item) => item.status === "blocked" || item.status === "action").length} 个待处理
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <EmptyLine title="暂无秘书时间线" detail="完成采集、提醒或履约后会自动沉淀。" />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {timeline.map((item) => (
              <div key={item.id} className="flex min-h-28 flex-col justify-between rounded-lg border p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={timelineStatusVariant(item.status)}>
                      {timelineStatusText(item.status)}
                    </Badge>
                    <Badge variant="outline">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">{item.timestamp.slice(0, 10)}</span>
                  </div>
                  <div className="mt-2 font-medium">{item.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
                <Button
                  className="mt-3 w-fit"
                  size="sm"
                  variant="outline"
                  aria-label={`执行时间线动作 ${item.title}`}
                  onClick={() => onAction(item)}
                >
                  {item.status === "done" || item.status === "info" ? <HistoryIcon data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                  {item.cta}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiContinuityCard({
  report,
  onAction,
}: {
  report: AiContinuityReport;
  onAction: (section: SectionId) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 连续性</CardTitle>
        <CardDescription>
          {report.mode === "cloud_assisted" ? "云端模型 + 本地兜底" : "本地规则护航"}
        </CardDescription>
        <CardAction>
          <Badge variant={assetStatusVariant(report.status)}>{assetStatusText(report.status)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <BotIcon className="size-4 text-primary" />
              不中断保障
            </div>
            <div className="flex flex-wrap gap-1">
              {report.safeguards.map((item) => (
                <Badge key={item} variant="outline">{item}</Badge>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <AlertTriangleIcon className="size-4 text-primary" />
              待关注
            </div>
            {report.interruptionRisks.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 text-sm leading-6 text-muted-foreground">
                  {report.interruptionRisks.map((risk) => (
                    <span key={risk}>{risk}</span>
                  ))}
                </div>
                {report.actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.actions.map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        variant="outline"
                        aria-label={`执行AI连续性动作 ${action.label}`}
                        onClick={() => onAction(action.section)}
                      >
                        {action.id === "privacy_authorization" ? <ShieldCheckIcon data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">当前链路稳定。</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScenarioJourneyCard({
  journeys,
  onAction,
}: {
  journeys: ScenarioJourney[];
  onAction: (journey: ScenarioJourney) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>场景流转</CardTitle>
        <CardDescription>关系、账单、差旅的业务闭环进度。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {journeys.map((journey) => (
            <div key={journey.id} className="rounded-md border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-medium">{journey.label}</span>
                <Badge variant={assetStatusVariant(journey.status)}>{journey.progress}%</Badge>
              </div>
              <Progress value={journey.progress}>
                <ProgressLabel>{journey.currentStep}</ProgressLabel>
              </Progress>
              <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{journey.nextStep}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                aria-label={`执行场景流转 ${journey.label}`}
                onClick={() => onAction(journey)}
              >
                {journey.status === "healthy" ? <ActivityIcon data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                继续推进
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactsSection(props: {
  data: WorkspaceData;
  contacts: Contact[];
  events: CalendarEvent[];
  plans: FulfillmentPlan[];
  selectedContactId: string;
  draftName: string;
  draftRelation: string;
  draftLabels: string;
  draftPreference: string;
  onDraftName: (value: string) => void;
  onDraftRelation: (value: string) => void;
  onDraftLabels: (value: string) => void;
  onDraftPreference: (value: string) => void;
  onAddContact: () => void;
  onDeleteContact: (id: string) => void;
  onSelectContact: (id: string) => void;
  onCorrectMemory: (id: string) => void;
  onUpdateMemory: (id: string, content: string) => void;
  onConfirmPreferenceSuggestion: (suggestion: PreferenceSuggestion) => void;
  onRelationshipAction: (action: RelationshipAction) => void;
  memoryReviewPending: boolean;
}) {
  const selectedContact = props.contacts.find((contact) => contact.id === props.selectedContactId);
  const visibleContactIds = new Set(props.contacts.map((contact) => contact.id));
  const preferenceSuggestions = buildPreferenceSuggestions(props.data)
    .filter((suggestion) => visibleContactIds.has(suggestion.contactId))
    .sort((left, right) => {
      if (left.contactId === props.selectedContactId) return -1;
      if (right.contactId === props.selectedContactId) return 1;
      return right.confidence - left.confidence;
    });
  const relationshipActions = buildRelationshipActions(props.data)
    .filter((action) => visibleContactIds.has(action.contactId))
    .sort((left, right) => {
      if (left.contactId === props.selectedContactId) return -1;
      if (right.contactId === props.selectedContactId) return 1;
      return 0;
    });
  const contactEvents = selectedContact
    ? props.events.filter((event) => event.contactId === selectedContact.id)
    : [];
  const giftHistory = selectedContact
    ? props.plans
        .filter((plan) => plan.contactId === selectedContact.id)
        .flatMap((plan) => plan.items.filter((item) => item.category === "gift" || item.category === "cake" || item.category === "dining"))
    : [];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>人脉与关系圈</CardTitle>
          <CardDescription>家庭、客户、合作伙伴的长期偏好和合规边界。</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactList
            contacts={props.contacts}
            selectedId={props.selectedContactId}
            onSelect={props.onSelectContact}
            onDelete={props.onDeleteContact}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>VIP 详情</CardTitle>
            <CardDescription>基本信息、偏好、往期礼物和合规限制。</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedContact ? (
              <EmptyLine title="暂无选中 VIP" detail="当前身份视图没有联系人。" />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback>{selectedContact.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-lg font-semibold">{selectedContact.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedContact.relation}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedContact.labels.map((label) => (
                        <Badge key={label} variant="outline">{label}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="font-medium">偏好矩阵</div>
                    <div className="mt-1 text-muted-foreground">
                      {selectedContact.preferences.map((item) => item.label).join("、") || "待补充"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="font-medium">合规限制</div>
                    <div className="mt-1 text-muted-foreground">{selectedContact.compliance.policyNote}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 font-medium">
                      <HistoryIcon className="size-4" />
                      往期礼物
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      {giftHistory.length === 0 ? (
                        <span className="text-muted-foreground">暂无履约记录</span>
                      ) : (
                        giftHistory.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex justify-between gap-3 text-muted-foreground">
                            <span>{item.title}</span>
                            <span>{formatCny(item.amountCny)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="font-medium">关联日程</div>
                    <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                      {contactEvents.length === 0
                        ? "暂无关联日程"
                        : contactEvents.slice(0, 3).map((event) => (
                            <span key={event.id}>{event.date} · {event.title}</span>
                          ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>关系健康行动</CardTitle>
                <CardDescription>把画像、日程、合规和记忆转成下一步秘书动作。</CardDescription>
              </div>
              <Badge variant="secondary">{relationshipActions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {relationshipActions.length === 0 ? (
              <EmptyLine title="关系链路健康" detail="当前身份视图暂无需要补齐或推进的 VIP 动作。" />
            ) : (
              <div className="flex flex-col gap-3">
                {relationshipActions.slice(0, 5).map((action) => (
                  <div key={action.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={priorityBadgeVariant(action.priority)}>
                            {priorityText(action.priority)}
                          </Badge>
                          <Badge variant="outline">{relationshipScenarioText(action.scenario)}</Badge>
                        </div>
                        <div className="mt-2 font-medium">{action.title}</div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.detail}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{action.evidence}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`执行关系行动 ${action.contactName} ${action.title}`}
                        onClick={() => props.onRelationshipAction(action)}
                      >
                        <UserRoundIcon data-icon="inline-start" />
                        {action.cta}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>偏好入库建议</CardTitle>
                <CardDescription>AI 记忆先生成建议，确认后才写入 VIP 偏好矩阵。</CardDescription>
              </div>
              <Badge variant="secondary">{preferenceSuggestions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {preferenceSuggestions.length === 0 ? (
              <EmptyLine title="暂无偏好建议" detail="新的聊天、截图或账单记忆确认后会出现在这里。" />
            ) : (
              <div className="flex flex-col gap-3">
                {preferenceSuggestions.slice(0, 5).map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {suggestion.contactName} · {suggestion.label}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {suggestion.evidence}
                        </p>
                      </div>
                      <Badge variant="outline">{preferenceCategoryText(suggestion.category)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>置信度 {Math.round(suggestion.confidence * 100)}%</span>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`写入偏好 ${suggestion.contactName} ${suggestion.label}`}
                        onClick={() => props.onConfirmPreferenceSuggestion(suggestion)}
                      >
                        <CheckIcon data-icon="inline-start" />
                        写入偏好
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新增 VIP 画像</CardTitle>
            <CardDescription>合规规则会根据标签自动绑定。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>姓名</FieldLabel>
                <Input value={props.draftName} onChange={(event) => props.onDraftName(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>关系</FieldLabel>
                <Input value={props.draftRelation} onChange={(event) => props.onDraftRelation(event.target.value)} placeholder="重要客户 / 母亲 / 伴侣" />
              </Field>
              <Field>
                <FieldLabel>标签</FieldLabel>
                <Input value={props.draftLabels} onChange={(event) => props.onDraftLabels(event.target.value)} />
                <FieldDescription>用英文逗号分隔。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>偏好</FieldLabel>
                <Textarea value={props.draftPreference} onChange={(event) => props.onDraftPreference(event.target.value)} rows={3} />
              </Field>
              <Button onClick={props.onAddContact}>
                <PlusIcon data-icon="inline-start" />
                新增画像
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 记忆纠偏</CardTitle>
            <CardDescription>错误偏好必须可修正、可覆盖。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {props.data.aiMemories.map((memory) => (
                <div key={memory.id} className="rounded-lg border p-3">
                  <Textarea
                    aria-label={`编辑记忆 ${memory.id}`}
                    value={memory.content}
                    onChange={(event) => props.onUpdateMemory(memory.id, event.target.value)}
                    rows={3}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge variant={memoryReviewVariant(memory)}>
                      {memoryReviewText(memory)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => props.onCorrectMemory(memory.id)}
                      disabled={props.memoryReviewPending}
                    >
                      {props.memoryReviewPending ? (
                        <Loader2Icon data-icon="inline-start" />
                      ) : (
                        <CheckIcon data-icon="inline-start" />
                      )}
                      复核通过
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CalendarSection(props: {
  contacts: Contact[];
  events: CalendarEvent[];
  onRunReminders: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>智能动态日历</CardTitle>
        <CardDescription>阳历优先，支持农历与 RRULE 重复规则。</CardDescription>
        <CardAction>
          <Button size="sm" onClick={props.onRunReminders}>
            <BellRingIcon data-icon="inline-start" />
            运行提醒
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>事项</TableHead>
              <TableHead>对象</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>预算</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.events.map((event) => {
              const contact = props.contacts.find((item) => item.id === event.contactId);
              return (
                <TableRow key={event.id}>
                  <TableCell>{event.date}</TableCell>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{contact?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForLevel(event.reminderLevel)}>{levelLabel(event.reminderLevel)}</Badge>
                  </TableCell>
                  <TableCell>{event.budgetCny ? formatCny(event.budgetCny) : "-"}</TableCell>
                  <TableCell>{event.status === "confirmed" ? "已确认" : "待处理"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FulfillmentSection(props: {
  data: WorkspaceData;
  festivalBudget: string;
  travelOrigin: string;
  travelDestination: string;
  travelStartDate: string;
  travelEndDate: string;
  dailyLimit: string;
  travelTransportPriority: NonNullable<TravelPreference["transportPriority"]>;
  travelHotelStandard: NonNullable<TravelPreference["hotelStandard"]>;
  travelMealStandard: NonNullable<TravelPreference["mealStandard"]>;
  travelClientAddress: string;
  onFestivalBudget: (value: string) => void;
  onTravelOrigin: (value: string) => void;
  onTravelDestination: (value: string) => void;
  onTravelStartDate: (value: string) => void;
  onTravelEndDate: (value: string) => void;
  onDailyLimit: (value: string) => void;
  onTravelTransportPriority: (value: NonNullable<TravelPreference["transportPriority"]>) => void;
  onTravelHotelStandard: (value: NonNullable<TravelPreference["hotelStandard"]>) => void;
  onTravelMealStandard: (value: NonNullable<TravelPreference["mealStandard"]>) => void;
  onTravelClientAddress: (value: string) => void;
  onBirthdayPlan: (eventId?: string) => void;
  onTravelPlan: () => void;
  onConfirmPlan: (planId: string) => void;
  onBookmarkPlan: (planId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>生日/节日履约</CardTitle>
            <CardDescription>默认礼物 60%、蛋糕 15%、餐饮 25%。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>总预算</FieldLabel>
                <Input value={props.festivalBudget} onChange={(event) => props.onFestivalBudget(event.target.value)} inputMode="numeric" />
              </Field>
              <Button onClick={() => props.onBirthdayPlan()}>
                <GiftIcon data-icon="inline-start" />
                一键生成方案
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>智能商务差旅</CardTitle>
            <CardDescription>按每日限额拆分交通、住宿、餐饮打车。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel>出发地</FieldLabel>
                  <Input value={props.travelOrigin} onChange={(event) => props.onTravelOrigin(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>目的地</FieldLabel>
                  <Input value={props.travelDestination} onChange={(event) => props.onTravelDestination(event.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel>出发日期</FieldLabel>
                  <Input value={props.travelStartDate} onChange={(event) => props.onTravelStartDate(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>返回日期</FieldLabel>
                  <Input value={props.travelEndDate} onChange={(event) => props.onTravelEndDate(event.target.value)} />
                </Field>
              </div>
              <Field>
                <FieldLabel>每日限额</FieldLabel>
                <Input value={props.dailyLimit} onChange={(event) => props.onDailyLimit(event.target.value)} inputMode="numeric" />
              </Field>
              <Field>
                <FieldLabel>客户地址</FieldLabel>
                <Input value={props.travelClientAddress} onChange={(event) => props.onTravelClientAddress(event.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel>交通策略</FieldLabel>
                  <Select
                    value={props.travelTransportPriority}
                    onValueChange={(value) => props.onTravelTransportPriority(value as NonNullable<TravelPreference["transportPriority"]>)}
                  >
                    <SelectTrigger aria-label="交通策略"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="rail_under_5h">5小时内高铁</SelectItem>
                        <SelectItem value="fastest">最快抵达</SelectItem>
                        <SelectItem value="comfort">舒适优先</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>住宿标准</FieldLabel>
                  <Select
                    value={props.travelHotelStandard}
                    onValueChange={(value) => props.onTravelHotelStandard(value as NonNullable<TravelPreference["hotelStandard"]>)}
                  >
                    <SelectTrigger aria-label="住宿标准"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="business">商务</SelectItem>
                        <SelectItem value="premium">高端</SelectItem>
                        <SelectItem value="budget">控费</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>餐饮标准</FieldLabel>
                  <Select
                    value={props.travelMealStandard}
                    onValueChange={(value) => props.onTravelMealStandard(value as NonNullable<TravelPreference["mealStandard"]>)}
                  >
                    <SelectTrigger aria-label="餐饮标准"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="business">商务餐</SelectItem>
                        <SelectItem value="standard">标准餐</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Button onClick={props.onTravelPlan}>
                <PlaneIcon data-icon="inline-start" />
                生成旅行方案
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {props.data.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            contact={props.data.contacts.find((contact) => contact.id === plan.contactId)}
            linksEnabled={props.data.privacy.thirdPartyLinksEnabled}
            onConfirm={props.onConfirmPlan}
            onBookmark={props.onBookmarkPlan}
          />
        ))}
      </div>
    </div>
  );
}

function FinanceSection({
  data,
  onAddBill,
  onAddTransaction,
  onUpdateBudget,
  onSmsCaptures,
  onVoiceLedger,
}: {
  data: WorkspaceData;
  onAddBill: (input: { title: string; amountCny: number; dueDay: number; accountLabel: string }) => void;
  onAddTransaction: (input: { title: string; amountCny: number; category: Transaction["category"] }) => void;
  onUpdateBudget: (budgetId: string, totalCny: number) => void;
  onSmsCaptures: (captures: CaptureItem[]) => void;
  onVoiceLedger: (text: string) => void;
}) {
  const [billTitle, setBillTitle] = useState("物业/水电");
  const [billAmount, setBillAmount] = useState("680");
  const [billDueDay, setBillDueDay] = useState("15");
  const [billAccount, setBillAccount] = useState("待关联扣款账户");
  const [transactionTitle, setTransactionTitle] = useState("客户午餐");
  const [transactionAmount, setTransactionAmount] = useState("268");
  const [transactionCategory, setTransactionCategory] = useState<Transaction["category"]>("relationship");
  const [smsImportText, setSmsImportText] = useState("【招商银行】您尾号8621账户房贷扣款12800元，交易时间2026-07-02。");
  const [voiceLedgerText, setVoiceLedgerText] = useState("今天吃饭花了125元");
  const [voicePressed, setVoicePressed] = useState(false);
  const reservePlan = buildNextMonthReservePlan(data);

  function submitBill() {
    const amountCny = Number(billAmount);
    const dueDay = Number(billDueDay);
    if (!billTitle.trim() || !Number.isFinite(amountCny) || !Number.isFinite(dueDay)) {
      toast.error("请填写有效账单信息");
      return;
    }

    onAddBill({
      title: billTitle,
      amountCny,
      dueDay: Math.min(31, Math.max(1, Math.round(dueDay))),
      accountLabel: billAccount || "待关联扣款账户",
    });
  }

  function submitTransaction() {
    const amountCny = Number(transactionAmount);
    if (!transactionTitle.trim() || !Number.isFinite(amountCny)) {
      toast.error("请填写有效交易信息");
      return;
    }

    onAddTransaction({
      title: transactionTitle,
      amountCny,
      category: transactionCategory,
    });
  }

  async function submitSmsImport() {
    if (!smsImportText.trim()) {
      toast.error("请粘贴短信账单内容");
      return;
    }

    const response = await fetch("/api/capture/sms-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: smsImportText }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      captures?: CaptureItem[];
      error?: string;
    };
    if (!response.ok || !payload.captures) {
      toast.error(payload.error ?? "短信导入失败");
      return;
    }

    onSmsCaptures(payload.captures);
  }

  function submitVoiceLedger() {
    if (!voiceLedgerText.trim()) {
      toast.error("请说出或输入记账内容");
      return;
    }

    setVoicePressed(false);
    onVoiceLedger(voiceLedgerText);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>语音轻量记账</CardTitle>
          <CardDescription>长按说一句，AI 先解析到确认中心，再写入日常流水。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>口述内容</FieldLabel>
              <Textarea
                aria-label="语音记账内容"
                value={voiceLedgerText}
                onChange={(event) => setVoiceLedgerText(event.target.value)}
                rows={3}
              />
              <FieldDescription>示例：今天吃饭花了125元、打车花了68元、买咖啡29元。</FieldDescription>
            </Field>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {["今天吃饭花了125元", "打车去客户公司花了68元", "买咖啡29元"].map((sample) => (
                <Button
                  key={sample}
                  size="sm"
                  variant="outline"
                  aria-label={`语音记账示例 ${sample}`}
                  onClick={() => setVoiceLedgerText(sample)}
                >
                  {sample}
                </Button>
              ))}
            </div>
            <Button
              onClick={submitVoiceLedger}
              onPointerDown={() => setVoicePressed(true)}
              onPointerCancel={() => setVoicePressed(false)}
              onPointerLeave={() => setVoicePressed(false)}
              aria-label="长按语音记账"
            >
              <NotebookPenIcon data-icon="inline-start" />
              {voicePressed ? "松开发送到确认中心" : "长按语音记账"}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>短信账单导入</CardTitle>
          <CardDescription>原生壳或短信 webhook 可写入确认中心。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>短信内容</FieldLabel>
              <Textarea
                value={smsImportText}
                onChange={(event) => setSmsImportText(event.target.value)}
                rows={4}
              />
            </Field>
            <Button onClick={submitSmsImport}>
              <ReceiptTextIcon data-icon="inline-start" />
              导入确认中心
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>定期账单托管</CardTitle>
          <CardDescription>固定支出与扣款日前置提醒。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_0.6fr]">
              <Field>
                <FieldLabel>账单名称</FieldLabel>
                <Input aria-label="账单名称" value={billTitle} onChange={(event) => setBillTitle(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>金额</FieldLabel>
                <Input aria-label="账单金额" value={billAmount} inputMode="numeric" onChange={(event) => setBillAmount(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>扣款日</FieldLabel>
                <Input aria-label="账单扣款日" value={billDueDay} inputMode="numeric" onChange={(event) => setBillDueDay(event.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>扣款账户</FieldLabel>
              <Input aria-label="账单扣款账户" value={billAccount} onChange={(event) => setBillAccount(event.target.value)} />
            </Field>
            <Button onClick={submitBill}>
              <PlusIcon data-icon="inline-start" />
              新增周期账单
            </Button>
          </FieldGroup>
          <Separator className="my-4" />
          <div className="flex flex-col gap-3">
            {data.recurringBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <div className="font-medium">{bill.title}</div>
                  <div className="text-sm text-muted-foreground">每月 {bill.dueDay} 日 · {bill.accountLabel}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCny(bill.amountCny)}</div>
                  <Badge variant={badgeVariantForLevel(bill.reminderLevel)}>{levelLabel(bill.reminderLevel)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>智能财务复盘</CardTitle>
          <CardDescription>{data.insight.period} 支出流向</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <Field>
                <FieldLabel>交易名称</FieldLabel>
                <Input aria-label="交易名称" value={transactionTitle} onChange={(event) => setTransactionTitle(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>金额</FieldLabel>
                <Input aria-label="交易金额" value={transactionAmount} inputMode="numeric" onChange={(event) => setTransactionAmount(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>分类</FieldLabel>
                <Select value={transactionCategory} onValueChange={(value) => setTransactionCategory(value as Transaction["category"])}>
                  <SelectTrigger aria-label="交易分类">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="fixed">刚需固定</SelectItem>
                      <SelectItem value="relationship">人情关怀</SelectItem>
                      <SelectItem value="travel">差旅出行</SelectItem>
                      <SelectItem value="daily">日常弹性</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Button onClick={submitTransaction}>
              <PlusIcon data-icon="inline-start" />
              手动入账
            </Button>
          </FieldGroup>
          <Separator className="my-4" />
          <div className="flex flex-col gap-3">
            {data.budgets.map((budget) => (
              <Field key={budget.id}>
                <FieldLabel>{budget.label}预算</FieldLabel>
                <Input
                  aria-label={`调整${budget.label}预算`}
                  inputMode="numeric"
                  value={budget.totalCny}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) {
                      onUpdateBudget(budget.id, value);
                    }
                  }}
                />
                <FieldDescription>已用 {formatCny(budget.spentCny)}</FieldDescription>
              </Field>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col gap-4">
            <InsightProgress label="刚需固定" value={data.insight.fixedCny} total={data.insight.fixedCny + data.insight.relationshipCny + data.insight.travelCny + data.insight.elasticCny} />
            <InsightProgress label="人情关怀" value={data.insight.relationshipCny} total={data.insight.fixedCny + data.insight.relationshipCny + data.insight.travelCny + data.insight.elasticCny} />
            <InsightProgress label="差旅出行" value={data.insight.travelCny} total={data.insight.fixedCny + data.insight.relationshipCny + data.insight.travelCny + data.insight.elasticCny} />
            <InsightProgress label="日常弹性" value={data.insight.elasticCny} total={data.insight.fixedCny + data.insight.relationshipCny + data.insight.travelCny + data.insight.elasticCny} />
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col gap-2">
            {data.insight.nextMonthRisks.map((risk) => (
              <div key={risk} className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm text-foreground">
                {risk}
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">下月预留预算方案</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {reservePlan.period} 建议预留 {formatCny(reservePlan.totalReserveCny)}
                </div>
              </div>
              <Badge variant={reservePressureVariant(reservePlan.pressureLevel)}>
                {reservePressureText(reservePlan.pressureLevel)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {reservePlan.items.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.label}</div>
                    <div className="font-semibold">{formatCny(item.amountCny)}</div>
                  </div>
                  <Progress className="mt-2" value={Math.round((item.amountCny / Math.max(1, reservePlan.totalReserveCny)) * 100)}>
                    <ProgressLabel>{item.category}</ProgressLabel>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Math.round((item.amountCny / Math.max(1, reservePlan.totalReserveCny)) * 100)}%
                    </span>
                  </Progress>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OperationsSection({
  data,
  integrations,
  opsDashboard,
  onRunJob,
  onNavigate,
  pending,
}: {
  data: WorkspaceData;
  integrations: IntegrationStatus[];
  opsDashboard: OpsDashboardState;
  onRunJob: (kind: "captureSla" | "notificationRetry" | "providerSync" | "productionCheck" | "serviceSmoke" | "fulfillmentDiscrepancies" | "nativeBridge" | "billingLedger" | "cpsApprovals" | "opsAlerts") => void;
  onNavigate: (section: SectionId) => void;
  pending: boolean;
}) {
  const failedNotifications = data.notificationLogs.filter((log) => log.status === "failed");
  const pendingOcrAsr = data.captures.filter((capture) =>
    capture.status === "pending" && capture.sourceType !== "text"
  );
  const reviewMemories = data.aiMemories.filter((memory) =>
    memory.reviewStatus === "stale" || memory.reviewStatus === "review_required"
  );
  const serviceReadiness = integrations.filter((item) =>
    item.provider === "capture_provider_callback" ||
    item.provider === "capture_provider_allowlist" ||
    item.provider === "fulfillment_provider_sync" ||
    item.provider === "travel_quote_provider"
  );
  const productionBlocked = opsDashboard.productionCheck?.p0Actions.filter((item) => item.status === "blocked").length ?? 0;
  const smokeIssues = (opsDashboard.serviceSmoke?.summary.failed ?? 0) + (opsDashboard.serviceSmoke?.summary.warnings ?? 0);
  const openDiscrepancies = opsDashboard.discrepancies.filter((item) => item.status === "open");
  const entitlementWarnings = opsDashboard.entitlements?.usage.filter((item) => item.status !== "ok").length ?? 0;
  const financeApprovalAlerts = opsDashboard.cpsApprovals.filter((item) =>
    item.status === "held" || item.status === "pending_finance"
  );
  const openOpsAlerts = opsDashboard.opsAlerts.filter((item) => item.status !== "resolved");
  const launchChecklist = opsDashboard.productionCheck
    ? buildProductionLaunchChecklist(opsDashboard.productionCheck)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="生产阻塞" value={String(productionBlocked)} detail="P0 readiness" icon={AlertTriangleIcon} />
        <MetricCard title="压测告警" value={String(smokeIssues)} detail="dry-run checks" icon={FlaskConicalIcon} />
        <MetricCard title="履约差异" value={String(openDiscrepancies.length)} detail="待财务处理" icon={GiftIcon} />
        <MetricCard title="权益预警" value={String(entitlementWarnings)} detail={opsDashboard.entitlements?.plan.label ?? "待加载"} icon={CrownIcon} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>运营处理台</CardTitle>
            <CardDescription>人工补录、批量复核、通知重试与联盟拉单。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <OpsAction
                title="生产检查"
                detail={`${productionBlocked} 项 P0 阻塞，${opsDashboard.productionCheck?.summary.warnings ?? 0} 项建议配置`}
                icon={ShieldCheckIcon}
                disabled={pending}
                onClick={() => onRunJob("productionCheck")}
              />
              <OpsAction
                title="真实服务 dry-run"
                detail={`${opsDashboard.serviceSmoke?.summary.total ?? 0} 项合约压测，不误发通知`}
                icon={FlaskConicalIcon}
                disabled={pending}
                onClick={() => onRunJob("serviceSmoke")}
              />
              <OpsAction
                title="OCR/ASR SLA"
                detail={`${pendingOcrAsr.length} 项采集可能需要补录或释放`}
                icon={ListChecksIcon}
                disabled={pending}
                onClick={() => onRunJob("captureSla")}
              />
              <OpsAction
                title="通知异常重试"
                detail={`${failedNotifications.length} 条失败投递待处理`}
                icon={BellRingIcon}
                disabled={pending}
                onClick={() => onRunJob("notificationRetry")}
              />
              <OpsAction
                title="AI 记忆批处理"
                detail={`${reviewMemories.length} 条待复核记忆`}
                icon={NotebookPenIcon}
                disabled={pending}
                onClick={() => onNavigate("contacts")}
              />
              <OpsAction
                title="联盟订单拉单"
                detail="同步电商/本地生活/商旅结算订单"
                icon={ActivityIcon}
                disabled={pending}
                onClick={() => onRunJob("providerSync")}
              />
              <OpsAction
                title="履约差异队列"
                detail={`${openDiscrepancies.length} 条退款/佣金/归因差异`}
                icon={AlertTriangleIcon}
                disabled={pending}
                onClick={() => onRunJob("fulfillmentDiscrepancies")}
              />
              <OpsAction
                title="原生采集桥"
                detail={`${opsDashboard.nativeCapabilities.filter((item) => item.status === "ready").length}/${opsDashboard.nativeCapabilities.length} 项能力可用`}
                icon={SmartphoneIcon}
                disabled={pending}
                onClick={() => onRunJob("nativeBridge")}
              />
              <OpsAction
                title="权益扣减流水"
                detail={`${formatCny(opsDashboard.billingLedger?.totalBillableCny ?? 0)} 超额待处理`}
                icon={HistoryIcon}
                disabled={pending}
                onClick={() => onRunJob("billingLedger")}
              />
              <OpsAction
                title="CPS 财务审批"
                detail={`${financeApprovalAlerts.length} 笔佣金待审批或补证据`}
                icon={HandCoinsIcon}
                disabled={pending}
                onClick={() => onRunJob("cpsApprovals")}
              />
              <OpsAction
                title="告警处置日志"
                detail={`${openOpsAlerts.length} 条开放告警需确认负责人`}
                icon={ClipboardCheckIcon}
                disabled={pending}
                onClick={() => onRunJob("opsAlerts")}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => onNavigate("contacts")}>
              <NotebookPenIcon data-icon="inline-start" />
              处理记忆
            </Button>
            <Button variant="outline" onClick={() => onNavigate("finance")}>
              <ReceiptTextIcon data-icon="inline-start" />
              查看账单
            </Button>
          </CardFooter>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>真实服务就绪</CardTitle>
              <CardDescription>provider 账号、白名单与同步能力。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {serviceReadiness.map((item) => (
                  <div key={item.provider} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <MapPinnedIcon className="size-4 text-primary" />
                        {item.label}
                      </div>
                      <Badge variant={item.mode === "configured" ? "secondary" : "outline"}>
                        {item.mode === "configured" ? "已配置" : item.mode === "search-link" ? "跳转/候选" : "未配置"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>上线任务包</CardTitle>
              <CardDescription>缺失配置、回调地址和验收命令集中交付。</CardDescription>
              <CardAction>
                <Badge variant={launchChecklist?.status === "ready" ? "secondary" : launchChecklist?.status === "blocked" ? "destructive" : "outline"}>
                  {launchChecklist?.status ? launchTaskStatusText(launchChecklist.status) : "待检查"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              {launchChecklist ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">下一步：{launchChecklist.nextTask?.title ?? "生产检查已通过"}</span>
                      <Badge variant={launchChecklist.nextTask ? launchTaskStatusVariant(launchChecklist.nextTask.status) : "secondary"}>
                        {launchChecklist.nextTask ? `${launchChecklist.nextTask.priority} · ${launchChecklist.nextTask.ownerRole}` : "ready"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {launchChecklist.nextTask?.checklist[0] ?? "继续执行生产验收命令并准备发布。"}
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium">缺失环境变量</div>
                    <div className="flex max-h-28 flex-wrap gap-1 overflow-auto">
                      {launchChecklist.summary.missingEnvKeys.slice(0, 12).map((key) => (
                        <Badge key={key} variant="outline">{key}</Badge>
                      ))}
                      {launchChecklist.summary.missingEnvKeys.length === 0 ? (
                        <Badge variant="secondary">env complete</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium">正式回调地址</div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {(launchChecklist.nextTask?.callbackUrls ?? []).length > 0 ? (
                        launchChecklist.nextTask?.callbackUrls.map((url) => (
                          <code key={url} className="rounded bg-muted px-2 py-1 text-xs text-foreground">{url}</code>
                        ))
                      ) : (
                        <span>配置 LIJI_PUBLIC_APP_URL 后自动生成 provider 回调地址。</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium">验收命令</div>
                    <div className="flex flex-wrap gap-1">
                      {(launchChecklist.nextTask?.commands ?? ["npm run prod:check"]).slice(0, 4).map((command) => (
                        <Badge key={command} variant="outline">{command}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyLine title="待运行生产检查" detail="点击生产检查后生成上线任务包。" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>P0 上线动作</CardTitle>
              <CardDescription>按生产检查聚合阻塞与待配置项。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {(opsDashboard.productionCheck?.p0Actions ?? []).map((action) => (
                  <div key={action.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{action.title}</span>
                      <Badge variant={action.status === "ready" ? "secondary" : "outline"}>
                        {action.status === "ready" ? "ready" : action.status === "blocked" ? "blocked" : "needs config"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {action.blockers[0] ?? action.nextSteps[0]}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>履约差异</CardTitle>
              <CardDescription>退款、佣金、归因和争议订单。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {openDiscrepancies.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{item.provider} · {item.externalOrderId}</span>
                      <Badge variant={item.severity === "critical" ? "destructive" : "outline"}>{item.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                  </div>
                ))}
                {openDiscrepancies.length === 0 ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">暂无待处理差异。</div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>通知 SOP 与权益</CardTitle>
              <CardDescription>错误码处理和会员额度计量。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="rounded-md border p-3">
                  <div className="font-medium">错误码样本库</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {opsDashboard.notificationCodebook.length} 条供应商错误码规则
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {opsDashboard.notificationCodebook.slice(0, 3).map((item) => (
                      <Badge key={item.code} variant="outline">{item.retryPolicy}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">{opsDashboard.entitlements?.plan.label ?? "会员权益"}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {opsDashboard.entitlements?.upgradeRecommended ? "建议升级以覆盖当前使用量。" : "当前使用量在额度内。"}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">原生采集桥</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {opsDashboard.nativeCapabilities.map((item) => item.label).join("、") || "能力状态加载中"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>P2 商业化闭环</CardTitle>
              <CardDescription>权益扣减、发票申请和 CPS 佣金审批。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">权益扣减流水</span>
                    <Badge variant={(opsDashboard.billingLedger?.billableEntries ?? 0) > 0 ? "outline" : "secondary"}>
                      {opsDashboard.billingLedger?.billableEntries ?? 0} billable
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    超额金额 {formatCny(opsDashboard.billingLedger?.totalBillableCny ?? 0)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">CPS 财务审批</span>
                    <Badge variant={financeApprovalAlerts.length > 0 ? "outline" : "secondary"}>
                      {financeApprovalAlerts.length} pending
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    可付款佣金 {formatCny(opsDashboard.cpsPayout?.totalCommissionCny ?? 0)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">发票与订阅</span>
                    <Badge variant="outline">manual ready</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    真实支付未配置时，先走人工开通和发票队列。
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>运营告警处置</CardTitle>
              <CardDescription>负责人、下一步和处置状态。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {opsDashboard.opsAlerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{alert.title}</span>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "outline"}>{alert.ownerRole}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.nextAction}</p>
                  </div>
                ))}
                {opsDashboard.opsAlerts.length === 0 ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">暂无开放告警。</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OpsAction({
  title,
  detail,
  icon: Icon,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="mt-1 size-5 text-primary" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function PrivacySection({
  data,
  onToggle,
  onNotificationPhone,
  onReset,
  onExport,
  onDeleteLocal,
  onDeleteCloud,
  onRegisterPush,
  authEmail,
  authUserEmail,
  integrations,
  onAuthEmail,
  onSendLoginLink,
  onSignOut,
}: {
  data: WorkspaceData;
  onToggle: (key: PrivacyToggleKey) => void;
  onNotificationPhone: (value: string) => void;
  onReset: () => void;
  onExport: () => void;
  onDeleteLocal: () => void;
  onDeleteCloud: () => void;
  onRegisterPush: () => void;
  authEmail: string;
  authUserEmail: string | null;
  integrations: IntegrationStatus[];
  onAuthEmail: (value: string) => void;
  onSendLoginLink: () => void;
  onSignOut: () => void;
}) {
  const rows: Array<{ key: PrivacyToggleKey; title: string; detail: string }> = [
    { key: "piiMasking", title: "PII 脱敏", detail: "姓名、电话、地址、公司名替换为临时占位符。" },
    { key: "cloudModelEnabled", title: "公网模型调用", detail: "关闭时仅使用本地规则和 mock provider。" },
    { key: "webPushEnabled", title: "Web Push", detail: "PWA 安装后可接收浏览器推送。" },
    { key: "smsEnabled", title: "短信提醒", detail: "Level 1/2 可进入短信队列。" },
    { key: "voiceCallEnabled", title: "AI 语音电话", detail: "Level 1 未确认 15 分钟后升级。" },
    { key: "thirdPartyLinksEnabled", title: "第三方跳转", detail: "携程、京东、美团等外部链接履约。" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>隐私与授权中心</CardTitle>
        <CardDescription>敏感数据、模型调用和通知通道集中管理。</CardDescription>
        <CardAction>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onExport}>
              <DownloadIcon data-icon="inline-start" />
              导出数据
            </Button>
            <Button size="sm" variant="outline" onClick={onRegisterPush}>
              <BellRingIcon data-icon="inline-start" />
              注册Push
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              <RotateCwIcon data-icon="inline-start" />
              重置演示数据
            </Button>
            <Button size="sm" variant="destructive" onClick={onDeleteLocal}>
              <Trash2Icon data-icon="inline-start" />
              删除本地数据
            </Button>
            <Button size="sm" variant="destructive" onClick={onDeleteCloud}>
              <Trash2Icon data-icon="inline-start" />
              删除云端数据
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium">账号与云同步</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {authUserEmail ? `当前账号：${authUserEmail}` : "使用邮箱登录后启用 Supabase 工作区同步。"}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="登录邮箱"
                  value={authEmail}
                  onChange={(event) => onAuthEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                />
                {authUserEmail ? (
                  <Button variant="outline" onClick={onSignOut}>
                    退出
                  </Button>
                ) : (
                  <Button onClick={onSendLoginLink}>
                    发送登录链接
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">第三方授权状态</div>
                <div className="mt-1 text-sm text-muted-foreground">模型、通知、履约与云端数据配置。</div>
              </div>
              <Badge variant="outline">{integrations.length} 项</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {integrations.map((integration) => (
                <div key={integration.provider} className="rounded-md bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{integration.label}</span>
                    <Badge variant={integration.mode === "configured" ? "secondary" : "outline"}>
                      {integration.mode === "configured"
                        ? "已配置"
                        : integration.mode === "search-link"
                          ? "搜索跳转"
                          : "未配置"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{integration.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-medium">通知手机号</div>
                <div className="mt-1 text-sm text-muted-foreground">短信和语音升级会优先投递到该号码。</div>
              </div>
              <Input
                aria-label="通知手机号"
                className="lg:max-w-64"
                inputMode="tel"
                onChange={(event) => onNotificationPhone(event.target.value)}
                placeholder="13800000000"
                value={data.privacy.notificationPhone ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="mt-1 text-sm leading-5 text-muted-foreground">{row.detail}</div>
                </div>
                <Switch checked={data.privacy[row.key]} onCheckedChange={() => onToggle(row.key)} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RightRail(props: {
  urgentEvents: CalendarEvent[];
  logs: NotificationLog[];
  pendingCaptures: CaptureItem[];
  onNavigate: (section: SectionId) => void;
  onConfirmEvent: (eventId: string) => void;
  onConfirmLog: (logId: string) => void;
  onConfirmMany: (captures: CaptureItem[]) => void;
}) {
  const highConfidenceCaptures = props.pendingCaptures.filter((capture) => capture.parsed.confidence >= 0.75);
  const lowConfidenceCaptures = props.pendingCaptures.filter((capture) => capture.parsed.confidence < 0.65);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">今日护航</h2>
        <p className="mt-1 text-sm text-muted-foreground">红线事项、确认与投递日志。</p>
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Level 1</CardTitle>
          <CardDescription>未确认会升级短信与语音。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {props.urgentEvents.map((event) => (
              <div key={event.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{event.date}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={event.status === "confirmed" ? "secondary" : "outline"}
                    aria-label={`确认提醒 ${event.title}`}
                    onClick={() => props.onConfirmEvent(event.id)}
                  >
                    {event.status === "confirmed" ? "已确认" : "确认"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>采集收件箱</CardTitle>
          <CardDescription>{props.pendingCaptures.length} 项待确认</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              variant="outline"
              aria-label={`护航确认高置信采集 ${highConfidenceCaptures.length}`}
              disabled={highConfidenceCaptures.length === 0}
              onClick={() => props.onConfirmMany(highConfidenceCaptures)}
            >
              <CheckIcon data-icon="inline-start" />
              确认高置信 {highConfidenceCaptures.length}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => props.onNavigate("dashboard")}>
              <ClipboardCheckIcon data-icon="inline-start" />
              打开确认中心
            </Button>
            {lowConfidenceCaptures.length > 0 ? (
              <div className="text-xs leading-5 text-muted-foreground">
                {lowConfidenceCaptures.length} 项低置信采集需编辑后确认。
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>提醒投递日志</CardTitle>
          <CardDescription>最近 {Math.min(4, props.logs.length)} 条</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {props.logs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 rounded-md border px-2 py-2 text-sm">
                <span className="truncate">{log.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === "confirmed" ? "secondary" : "outline"}>{log.channel}</Badge>
                  {log.status !== "confirmed" && (
                    <Button size="xs" variant="ghost" onClick={() => props.onConfirmLog(log.id)}>
                      确认
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardAction>
          <props.icon className="size-4 text-primary" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-normal">{props.value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{props.detail}</div>
      </CardContent>
    </Card>
  );
}

function ContactList({
  contacts,
  selectedId,
  onSelect,
  onDelete,
}: {
  contacts: Contact[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="rounded-lg border p-3 data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
          data-selected={selectedId === contact.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
              onClick={() => onSelect?.(contact.id)}
            >
              <Avatar className="size-10">
                <AvatarFallback>{contact.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{contact.name}</span>
                  <span className="text-sm text-muted-foreground">{contact.relation}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {contact.labels.map((label) => (
                    <Badge key={label} variant="outline">{label}</Badge>
                  ))}
                </div>
              </div>
            </button>
            {onDelete && (
              <Button size="icon-sm" variant="ghost" aria-label={`删除 ${contact.name}`} onClick={() => onDelete(contact.id)}>
                <Trash2Icon />
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <div>偏好：{contact.preferences.map((preference) => preference.label).join("、") || "待补充"}</div>
            <div>合规：{contact.compliance.policyNote}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  contact,
  linksEnabled,
  onConfirm,
  onBookmark,
}: {
  plan: FulfillmentPlan;
  contact?: Contact;
  linksEnabled: boolean;
  onConfirm: (planId: string) => void;
  onBookmark: (planId: string) => void;
}) {
  const trackedLinks = linksEnabled ? buildPlanFulfillmentLinks(plan) : [];
  const conciergePack = buildFulfillmentConciergePack(plan, contact);
  const travelBrief = buildTravelReadinessBrief(plan);

  function recordFulfillmentClick(itemId: string, link: ReturnType<typeof buildPlanFulfillmentLinks>[number] | undefined) {
    if (!link) {
      return;
    }

    void fetch("/api/fulfillment/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.id,
        planItemId: itemId,
        provider: link.provider,
        targetUrl: link.url,
      }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.title}</CardTitle>
        <CardDescription>{plan.scenario === "travel" ? "差旅规划" : "生日/节日规划"} · {formatCny(plan.budgetCny)}</CardDescription>
        <CardAction>
          <Badge variant={plan.riskLevel === "high" ? "destructive" : plan.riskLevel === "medium" ? "secondary" : "outline"}>
            {statusText(plan.status)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {plan.warnings.map((warning) => (
            <div key={warning} className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-sm">
              {warning}
            </div>
          ))}
          {plan.items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
              {(() => {
                const trackedLink = trackedLinks.find((link) => link.label === item.title);

                return (
                  <>
              <div>
                <div className="font-medium">{item.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatCny(item.amountCny)}</span>
                {linksEnabled && item.url ? (
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={trackedLink?.url ?? item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => recordFulfillmentClick(item.id, trackedLink)}
                      />
                    }
                  >
                    外部跳转
                  </Button>
                ) : (
                  <Badge variant="secondary">{linksEnabled ? item.provider : "跳转关闭"}</Badge>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}
          <div className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{conciergePack.title}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{conciergePack.primaryCopy}</p>
              </div>
              <Badge variant="outline">
                {conciergePack.tone === "business_reserved" ? "克制商务" : conciergePack.tone === "travel_brief" ? "行前简报" : "温暖亲密"}
              </Badge>
            </div>
            {conciergePack.secondaryCopy && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{conciergePack.secondaryCopy}</p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">包装/交付选项</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {conciergePack.packagingOptions.map((option) => (
                    <Badge key={option} variant="secondary">{option}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">确认清单</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {conciergePack.handoffChecklist.map((item) => (
                    <Badge key={item} variant="outline">{item}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {conciergePack.riskNotes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {conciergePack.riskNotes.map((note) => (
                  <Badge key={note} variant="destructive">{note}</Badge>
                ))}
              </div>
            )}
          </div>
          {travelBrief && (
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{travelBrief.title}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{travelBrief.routeSummary}</p>
                </div>
                <Badge variant={travelBrief.readinessScore >= 80 ? "secondary" : travelBrief.readinessScore >= 60 ? "outline" : "destructive"}>
                  准备度 {travelBrief.readinessScore}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">预算与距离</div>
                  <p className="mt-1 text-sm leading-6">{travelBrief.budgetSummary}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{travelBrief.proximitySummary}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground">下一步</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {travelBrief.nextActions.map((action) => (
                      <Badge key={action} variant="outline">{action}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {travelBrief.checklist.map((item) => (
                  <Badge key={item} variant="secondary">{item}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-sm text-muted-foreground">
          风险等级：{plan.riskLevel === "high" ? "高" : plan.riskLevel === "medium" ? "中" : "低"}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" aria-label={`归档方案 ${plan.title}`} onClick={() => onBookmark(plan.id)}>
            归档
          </Button>
          <Button size="sm" aria-label={`确认方案 ${plan.title}`} onClick={() => onConfirm(plan.id)}>
            <CheckIcon data-icon="inline-start" />
            确认方案
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function InsightCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function InsightProgress({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.round((value / Math.max(1, total)) * 100);
  return (
    <Progress value={percent}>
      <ProgressLabel>{label}</ProgressLabel>
      <span className="ml-auto text-sm text-muted-foreground tabular-nums">
        {formatCny(value)}
      </span>
    </Progress>
  );
}

function EmptyLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <BotIcon className="mx-auto size-6 text-muted-foreground" />
      <div className="mt-2 font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BellRingIcon,
  BotIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  GiftIcon,
  HandCoinsIcon,
  HomeIcon,
  Loader2Icon,
  LockKeyholeIcon,
  NotebookPenIcon,
  PlaneIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
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
import {
  addRecurringBill as addRecurringBillToWorkspace,
  addTransaction as addTransactionToWorkspace,
  updateBudgetTotal,
} from "@/lib/liji/finance";
import { buildPlanFulfillmentLinks } from "@/lib/liji/fulfillment";
import { createUuid } from "@/lib/liji/ids";
import type { IntegrationStatus } from "@/lib/liji/integrations";
import {
  clearWorkspaceData,
  loadWorkspaceData,
  saveWorkspaceData,
} from "@/lib/liji/persistence";
import { createDeletionRequest, exportWorkspaceData } from "@/lib/liji/privacy";
import { registerBrowserPushSubscription } from "@/lib/liji/push";
import { createSupabaseBrowserClient } from "@/lib/liji/supabase-browser";
import {
  acknowledgeEvent,
  acknowledgeNotificationLog,
  applyConfirmedCapture,
  rejectCapture as rejectCaptureWorkflow,
  setPlanStatus,
} from "@/lib/liji/workflow";
import type {
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
  | "privacy";

type LijiAppProps = {
  initialData: WorkspaceData;
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
  { id: "privacy", label: "隐私", icon: LockKeyholeIcon },
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
  const [captureText, setCaptureText] = useState("下周五是女儿5岁生日，预算2000元");
  const [captureSource, setCaptureSource] = useState<CaptureSource>("text");
  const [draftName, setDraftName] = useState("");
  const [draftRelation, setDraftRelation] = useState("");
  const [draftLabels, setDraftLabels] = useState("重要客户,国企高管");
  const [draftPreference, setDraftPreference] = useState("");
  const [festivalBudget, setFestivalBudget] = useState("2000");
  const [travelDestination, setTravelDestination] = useState("广州");
  const [dailyLimit, setDailyLimit] = useState("2400");
  const [authEmail, setAuthEmail] = useState("");
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isPending, startTransition] = useTransition();

  const urgentEvents = useMemo(
    () => data.events.filter((event) => event.reminderLevel === "level_1"),
    [data.events]
  );
  const pendingCaptures = data.captures.filter((item) => item.status === "pending");
  const relationshipBudget = data.budgets.find(
    (budget) => budget.category === "relationship"
  );

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

  async function handleParseCapture() {
    if (!captureText.trim()) {
      toast.error("请输入采集内容");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/parse-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: captureText,
          source: captureSource,
          allowCloudModel: data.privacy.cloudModelEnabled,
        }),
      });
      const result = (await response.json()) as {
        capture?: CaptureItem;
        error?: string;
        provider?: "local-rules" | "openai";
      };

      if (!response.ok || !result.capture) {
        toast.error(result.error ?? "解析失败");
        return;
      }

      workspace.setCaptures((captures) => [result.capture!, ...captures]);
      setCaptureText("");
      toast.success(result.provider === "openai" ? "云端 AI 已解析，待确认" : "已进入任务与确认中心");
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

  function rejectCapture(captureId: string) {
    workspace.setData((current) => rejectCaptureWorkflow(current, captureId));
    toast("已驳回该采集项");
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

  function generateBirthdayPlan() {
    const event = data.events.find((item) => item.id === "e-daughter-birthday") ?? data.events[0];
    const contact = data.contacts.find((item) => item.id === event.contactId);
    const plan = generateFestivalPlan(event, contact, Number(festivalBudget) || 2000, new Date());
    workspace.setPlans((plans) => [plan, ...plans]);
    toast.success("已生成生日履约方案");
  }

  function generateBusinessTravelPlan() {
    const plan = generateTravelPlan({
      title: `${travelDestination}商务差旅方案`,
      startDate: "2026-07-08",
      endDate: "2026-07-10",
      destination: travelDestination,
      dailyLimitCny: Number(dailyLimit) || 2400,
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

  function togglePrivacy(key: keyof PrivacySettings) {
    const nextPrivacy = {
      ...data.privacy,
      [key]: !data.privacy[key],
    };

    workspace.setPrivacy(() => nextPrivacy);
    void postJson("/api/privacy/settings", nextPrivacy);
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
    workspace.setData((current) => ({
      ...current,
      aiMemories: current.aiMemories.map((memory) =>
        memory.id === memoryId
          ? { ...memory, confidence: 1, correctedAt: new Date().toISOString() }
          : memory
      ),
      contacts: current.contacts.map((contact) => ({
        ...contact,
        aiMemoryHealth: Math.min(100, contact.aiMemoryHealth + 2),
      })),
    }));
    toast.success("AI 记忆已校准");
  }

  function updateMemoryContent(memoryId: string, content: string) {
    workspace.setData((current) => ({
      ...current,
      aiMemories: current.aiMemories.map((memory) =>
        memory.id === memoryId
          ? { ...memory, content, confidence: 1, correctedAt: new Date().toISOString() }
          : memory
      ),
      contacts: current.contacts.map((contact) => ({
        ...contact,
        aiMemoryHealth: Math.min(100, contact.aiMemoryHealth + 1),
      })),
    }));
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
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_328px]">
            <section className="min-w-0 px-4 py-4 md:px-6 md:py-6">
              {activeSection === "dashboard" && (
                <DashboardSection
                  data={data}
                  pendingCaptures={pendingCaptures}
                  relationshipBudget={relationshipBudget}
                  onConfirm={confirmCapture}
                  onReject={rejectCapture}
                  onEditCapture={updateCaptureDraft}
                  onBirthdayPlan={generateBirthdayPlan}
                  onNavigate={setActiveSection}
                />
              )}
              {activeSection === "contacts" && (
                <ContactsSection
                  data={data}
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
                  onCorrectMemory={correctMemory}
                  onUpdateMemory={updateMemoryContent}
                />
              )}
              {activeSection === "calendar" && (
                <CalendarSection data={data} onRunReminders={runReminderScanNow} />
              )}
              {activeSection === "fulfillment" && (
                <FulfillmentSection
                  data={data}
                  festivalBudget={festivalBudget}
                  travelDestination={travelDestination}
                  dailyLimit={dailyLimit}
                  onFestivalBudget={setFestivalBudget}
                  onTravelDestination={setTravelDestination}
                  onDailyLimit={setDailyLimit}
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
                />
              )}
              {activeSection === "privacy" && (
                <PrivacySection
                  data={data}
                  onToggle={togglePrivacy}
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
                pendingCount={pendingCaptures.length}
                onNavigate={setActiveSection}
                onConfirmEvent={confirmEventRead}
                onConfirmLog={confirmLogRead}
              />
            </aside>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background lg:hidden">
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

function DashboardSection(props: {
  data: WorkspaceData;
  pendingCaptures: CaptureItem[];
  relationshipBudget: WorkspaceData["budgets"][number] | undefined;
  onConfirm: (capture: CaptureItem) => void;
  onReject: (captureId: string) => void;
  onEditCapture: (captureId: string, patch: Partial<CaptureItem["parsed"]>) => void;
  onBirthdayPlan: () => void;
  onNavigate: (section: SectionId) => void;
}) {
  const { data, pendingCaptures, relationshipBudget } = props;

  return (
    <div className="flex flex-col gap-4">
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
          value={String(data.events.filter((event) => event.reminderLevel === "level_1").length)}
          detail="红线提醒"
          icon={BellRingIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>任务与确认中心</CardTitle>
            <CardDescription>AI 解析内容先确认，再写入画像、日程或账单。</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" onClick={() => props.onNavigate("contacts")}>
                <NotebookPenIcon data-icon="inline-start" />
                修正记忆
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {pendingCaptures.length === 0 ? (
                <EmptyLine title="暂无待确认采集" detail="试试在顶部输入生日、差旅或账单。" />
              ) : (
                pendingCaptures.slice(0, 3).map((capture) => (
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
              <Button size="sm" onClick={props.onBirthdayPlan}>
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
            <span className="text-sm text-muted-foreground">最近方案：{data.plans[0]?.title}</span>
            <Button size="sm" variant="ghost" onClick={() => props.onNavigate("fulfillment")}>
              查看履约
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>VIP 画像</CardTitle>
            <CardDescription>偏好、忌口、合规限制集中维护。</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactList contacts={data.contacts.slice(0, 3)} />
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

function ContactsSection(props: {
  data: WorkspaceData;
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
  onCorrectMemory: (id: string) => void;
  onUpdateMemory: (id: string, content: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>人脉与关系圈</CardTitle>
          <CardDescription>家庭、客户、合作伙伴的长期偏好和合规边界。</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactList contacts={props.data.contacts} onDelete={props.onDeleteContact} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
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
                    <Badge variant={memory.correctedAt ? "secondary" : "outline"}>
                      {memory.correctedAt ? "已校准" : `${Math.round(memory.confidence * 100)}%`}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => props.onCorrectMemory(memory.id)}>
                      <CheckIcon data-icon="inline-start" />
                      确认正确
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

function CalendarSection(props: { data: WorkspaceData; onRunReminders: () => void }) {
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
            {props.data.events.map((event) => {
              const contact = props.data.contacts.find((item) => item.id === event.contactId);
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
  travelDestination: string;
  dailyLimit: string;
  onFestivalBudget: (value: string) => void;
  onTravelDestination: (value: string) => void;
  onDailyLimit: (value: string) => void;
  onBirthdayPlan: () => void;
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
              <Button onClick={props.onBirthdayPlan}>
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
              <Field>
                <FieldLabel>目的地</FieldLabel>
                <Input value={props.travelDestination} onChange={(event) => props.onTravelDestination(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>每日限额</FieldLabel>
                <Input value={props.dailyLimit} onChange={(event) => props.onDailyLimit(event.target.value)} inputMode="numeric" />
              </Field>
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
}: {
  data: WorkspaceData;
  onAddBill: (input: { title: string; amountCny: number; dueDay: number; accountLabel: string }) => void;
  onAddTransaction: (input: { title: string; amountCny: number; category: Transaction["category"] }) => void;
  onUpdateBudget: (budgetId: string, totalCny: number) => void;
}) {
  const [billTitle, setBillTitle] = useState("物业/水电");
  const [billAmount, setBillAmount] = useState("680");
  const [billDueDay, setBillDueDay] = useState("15");
  const [billAccount, setBillAccount] = useState("待关联扣款账户");
  const [transactionTitle, setTransactionTitle] = useState("客户午餐");
  const [transactionAmount, setTransactionAmount] = useState("268");
  const [transactionCategory, setTransactionCategory] = useState<Transaction["category"]>("relationship");

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

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySection({
  data,
  onToggle,
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
  onToggle: (key: keyof PrivacySettings) => void;
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
  const rows: Array<{ key: keyof PrivacySettings; title: string; detail: string }> = [
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
  pendingCount: number;
  onNavigate: (section: SectionId) => void;
  onConfirmEvent: (eventId: string) => void;
  onConfirmLog: (logId: string) => void;
}) {
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
          <CardDescription>{props.pendingCount} 项待确认</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" onClick={() => props.onNavigate("dashboard")}>
            <ClipboardCheckIcon data-icon="inline-start" />
            打开确认中心
          </Button>
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
  onDelete,
}: {
  contacts: Contact[];
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <div key={contact.id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
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
            </div>
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
  linksEnabled,
  onConfirm,
  onBookmark,
}: {
  plan: FulfillmentPlan;
  linksEnabled: boolean;
  onConfirm: (planId: string) => void;
  onBookmark: (planId: string) => void;
}) {
  const trackedLinks = linksEnabled ? buildPlanFulfillmentLinks(plan) : [];

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

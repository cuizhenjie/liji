export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          display_name: string;
          default_timezone: string;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          display_name: string;
          default_timezone?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      contacts: Table<{
        id: string;
        user_id: string;
        name: string;
        relation: string;
        labels: string[];
        birthday: string | null;
        calendar_type: Database["public"]["Enums"]["calendar_type"];
        preferences: Json;
        compliance: Json;
        ai_memory_health: number;
        last_interaction_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      compliance_rules: Table<{
        id: string;
        user_id: string | null;
        label: string;
        risk_tags: string[];
        gift_limit_cny: number | null;
        hospitality_limit_cny: number | null;
        policy_note: string;
        is_system: boolean;
        created_at: string;
      }>;
      events: Table<{
        id: string;
        user_id: string;
        contact_id: string | null;
        title: string;
        event_date: string;
        end_date: string | null;
        location: string | null;
        calendar_type: Database["public"]["Enums"]["calendar_type"];
        rrule: string | null;
        reminder_level: Database["public"]["Enums"]["reminder_level"];
        status: string;
        budget_cny: number | null;
        source: string;
        created_at: string;
        updated_at: string;
      }>;
      reminders: Table<{
        id: string;
        user_id: string;
        event_id: string;
        level: Database["public"]["Enums"]["reminder_level"];
        scheduled_at: string;
        acknowledged_at: string | null;
        escalation_after_minutes: number;
        created_at: string;
      }>;
      budgets: Table<{
        id: string;
        user_id: string;
        label: string;
        category: "fixed" | "relationship" | "travel" | "elastic";
        total_cny: number;
        spent_cny: number;
        period: string;
        created_at: string;
      }>;
      plans: Table<{
        id: string;
        user_id: string;
        contact_id: string | null;
        event_id: string | null;
        scenario: Database["public"]["Enums"]["plan_scenario"];
        title: string;
        budget_cny: number;
        status: Database["public"]["Enums"]["plan_status"];
        risk_level: "low" | "medium" | "high";
        warnings: string[];
        created_at: string;
      }>;
      plan_items: Table<{
        id: string;
        user_id: string;
        plan_id: string;
        title: string;
        category: string;
        amount_cny: number;
        rationale: string;
        provider: string;
        url: string | null;
        created_at: string;
      }>;
      capture_items: Table<{
        id: string;
        user_id: string;
        raw_text: string;
        masked_text: string;
        source_type: "text" | "voice" | "screenshot" | "chat" | "bill";
        status: Database["public"]["Enums"]["capture_status"];
        parsed: Json;
        pii_tokens: Json;
        created_at: string;
        updated_at: string;
      }>;
      transactions: Table<{
        id: string;
        user_id: string;
        contact_id: string | null;
        title: string;
        amount_cny: number;
        category: "fixed" | "relationship" | "travel" | "daily";
        occurred_at: string;
        source: string;
        created_at: string;
      }>;
      recurring_bills: Table<{
        id: string;
        user_id: string;
        title: string;
        amount_cny: number;
        due_day: number;
        account_label: string;
        reminder_level: Database["public"]["Enums"]["reminder_level"];
        enabled: boolean;
        created_at: string;
      }>;
      notification_logs: Table<{
        id: string;
        user_id: string;
        event_id: string | null;
        title: string;
        channel: Database["public"]["Enums"]["notification_channel"];
        status: "queued" | "sent" | "confirmed" | "escalated" | "failed";
        level: Database["public"]["Enums"]["reminder_level"];
        sent_at: string;
        acknowledged_at: string | null;
        provider_message: string;
        created_at: string;
      }>;
      ai_memories: Table<{
        id: string;
        user_id: string;
        contact_id: string | null;
        content: string;
        source: "manual" | "ai";
        confidence: number;
        embedding: string | null;
        corrected_at: string | null;
        created_at: string;
      }>;
      privacy_settings: Table<{
        user_id: string;
        pii_masking: boolean;
        cloud_model_enabled: boolean;
        web_push_enabled: boolean;
        sms_enabled: boolean;
        voice_call_enabled: boolean;
        third_party_links_enabled: boolean;
        updated_at: string;
      }>;
      web_push_subscriptions: Table<{
        id: string;
        user_id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        user_agent: string | null;
        enabled: boolean;
        created_at: string;
        updated_at: string;
      }>;
      integration_accounts: Table<{
        id: string;
        user_id: string | null;
        provider: Database["public"]["Enums"]["integration_provider"];
        display_name: string;
        config: Json;
        enabled: boolean;
        is_system: boolean;
        created_at: string;
        updated_at: string;
      }>;
      fulfillment_clicks: Table<{
        id: string;
        user_id: string;
        plan_id: string | null;
        plan_item_id: string | null;
        provider: Database["public"]["Enums"]["integration_provider"];
        target_url: string;
        tracking_params: Json;
        clicked_at: string;
      }>;
      monthly_reports: Table<{
        id: string;
        user_id: string;
        period: string;
        insight: Json;
        generated_at: string;
      }>;
      audit_logs: Table<{
        id: string;
        user_id: string | null;
        action: Database["public"]["Enums"]["audit_action"];
        entity_table: string;
        entity_id: string | null;
        metadata: Json;
        created_at: string;
      }>;
      fulfillment_order_updates: Table<{
        id: string;
        user_id: string | null;
        plan_id: string | null;
        plan_item_id: string | null;
        provider: Database["public"]["Enums"]["integration_provider"];
        external_order_id: string;
        status: "clicked" | "reserved" | "paid" | "fulfilled" | "cancelled" | "refunded" | "failed";
        amount_cny: number | null;
        raw_payload: Json;
        received_at: string;
      }>;
      capture_extraction_jobs: Table<{
        id: string;
        user_id: string;
        capture_id: string | null;
        source_type: "voice" | "screenshot" | "chat" | "bill";
        job_type: "ocr" | "asr";
        provider: string;
        status: "queued" | "processing" | "completed" | "failed" | "cancelled";
        file_name: string | null;
        mime_type: string | null;
        input_uri: string | null;
        content_hash: string;
        extracted_text: string | null;
        error_message: string | null;
        raw_result: Json;
        queued_at: string;
        completed_at: string | null;
      }>;
      reminder_escalation_jobs: Table<{
        id: string;
        user_id: string;
        event_id: string | null;
        title: string;
        channels: string[];
        status: "scheduled" | "due" | "sent" | "cancelled" | "failed";
        trigger_at: string;
        last_sent_at: string;
        acknowledged_at: string | null;
        attempt_count: number;
        provider_message: string;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      match_ai_memories: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          contact_id: string | null;
          content: string;
          source: "manual" | "ai";
          confidence: number;
          corrected_at: string | null;
          embedding: string | null;
          similarity: number;
        }>;
      };
    };
    Enums: {
      calendar_type: "solar" | "lunar";
      reminder_level: "level_1" | "level_2" | "level_3";
      capture_status: "pending" | "confirmed" | "rejected" | "archived";
      plan_scenario: "festival" | "travel";
      plan_status: "draft" | "pending_confirmation" | "confirmed" | "bookmarked";
      notification_channel: "push" | "sms" | "voice";
      integration_provider:
        | "jd"
        | "taobao"
        | "meituan"
        | "ctrip"
        | "tongcheng"
        | "aliyun_sms"
        | "aliyun_voice"
        | "aliyun_ocr"
        | "aliyun_asr"
        | "openai";
      audit_action: "create" | "update" | "delete" | "export" | "notify" | "fulfill" | "ai_parse";
    };
    CompositeTypes: Record<string, never>;
  };
};

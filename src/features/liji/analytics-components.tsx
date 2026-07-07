"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Bell,
  Shield,
  DollarSign,
  Users,
  Calendar,
  Gift,
} from "lucide-react";

// Data Flow Visualization Component
interface DataFlowStep {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
  timestamp?: string;
  details?: string;
}

interface DataFlowVisualizationProps {
  steps: DataFlowStep[];
  title?: string;
}

export function DataFlowVisualization({ steps, title = "数据流" }: DataFlowVisualizationProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === "completed"
                      ? "bg-green-500 text-white"
                      : step.status === "active"
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : step.status === "active" ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs mt-1 text-center font-medium">{step.label}</span>
                {step.timestamp && (
                  <span className="text-[10px] text-muted-foreground">{step.timestamp}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-6 ${
                    step.status === "completed" ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Reminder Timeline Component
interface ReminderEvent {
  id: string;
  title: string;
  date: string;
  daysUntil: number;
  level: "info" | "warning" | "urgent";
  channel: "push" | "sms" | "voice";
  contactName: string;
}

interface ReminderTimelineProps {
  events: ReminderEvent[];
  title?: string;
}

export function ReminderTimeline({ events, title = "提醒时间轴" }: ReminderTimelineProps) {
  const levelColors = {
    info: "bg-blue-100 text-blue-700 border-blue-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    urgent: "bg-red-100 text-red-700 border-red-200",
  };

  const channelIcons = {
    push: "📱",
    sms: "💬",
    voice: "📞",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.level === "urgent"
                      ? "bg-red-500"
                      : event.level === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="w-px h-full bg-border mt-1" />
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{event.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${levelColors[event.level]}`}>
                    {event.daysUntil === 0 ? "今天" : `${event.daysUntil}天后`}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{event.contactName}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                  <span className="text-xs">{channelIcons[event.channel]}</span>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无提醒</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Budget Dashboard Component
interface BudgetCategory {
  name: string;
  spent: number;
  budget: number;
  color: string;
}

interface BudgetDashboardProps {
  categories: BudgetCategory[];
  totalSpent: number;
  totalBudget: number;
  title?: string;
}

export function BudgetDashboard({
  categories,
  totalSpent,
  totalBudget,
  title = "预算仪表盘",
}: BudgetDashboardProps) {
  const percentage = Math.round((totalSpent / totalBudget) * 100);
  const isOverBudget = totalSpent > totalBudget;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total budget overview */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${isOverBudget ? "text-red-500" : "text-foreground"}`}>
              ¥{totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              预算 ¥{totalBudget.toLocaleString()} ({percentage}%)
            </div>
            <Progress value={Math.min(percentage, 100)} className="mt-2 h-2" />
          </div>

          {/* Category breakdown */}
          <div className="space-y-2">
            {categories.map((cat) => {
              const catPercentage = Math.round((cat.spent / cat.budget) * 100);
              return (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ¥{cat.spent} / ¥{cat.budget}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {catPercentage}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compliance Dashboard Component
interface ComplianceMetric {
  label: string;
  value: number;
  target: number;
  status: "good" | "warning" | "danger";
}

interface ComplianceDashboardProps {
  metrics: ComplianceMetric[];
  overallScore: number;
  title?: string;
}

export function ComplianceDashboard({
  metrics,
  overallScore,
  title = "合规仪表盘",
}: ComplianceDashboardProps) {
  const statusColors = {
    good: "text-green-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  const statusIcons = {
    good: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    danger: <AlertTriangle className="h-4 w-4 text-red-500" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall score */}
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${
                overallScore >= 90 ? "text-green-500" : overallScore >= 70 ? "text-amber-500" : "text-red-500"
              }`}
            >
              {overallScore}%
            </div>
            <div className="text-xs text-muted-foreground">合规遵从率</div>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-2">
                {statusIcons[metric.status]}
                <span className="text-xs flex-1">{metric.label}</span>
                <span className={`text-xs font-medium ${statusColors[metric.status]}`}>
                  {metric.value}/{metric.target}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Relationship Heatmap Component
interface ContactInteraction {
  name: string;
  interactions: number;
  lastContact: string;
  relationship: "family" | "business" | "social";
}

interface RelationshipHeatmapProps {
  contacts: ContactInteraction[];
  title?: string;
}

export function RelationshipHeatmap({ contacts, title = "人情热力图" }: RelationshipHeatmapProps) {
  const getHeatColor = (interactions: number) => {
    if (interactions >= 10) return "bg-green-500";
    if (interactions >= 5) return "bg-green-400";
    if (interactions >= 2) return "bg-amber-400";
    return "bg-muted";
  };

  const relationshipIcons = {
    family: "👨‍👩‍👧‍👦",
    business: "💼",
    social: "🤝",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.name} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${getHeatColor(contact.interactions)} flex items-center justify-center text-xs`}>
                {relationshipIcons[contact.relationship]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground">
                  最近联系: {contact.lastContact}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {contact.interactions}次互动
              </Badge>
            </div>
          ))}
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无联系人数据</p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>低</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span>中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>高</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Analytics Overview Component
interface AnalyticsOverviewProps {
  totalContacts: number;
  upcomingEvents: number;
  monthlySpending: number;
  complianceScore: number;
}

export function AnalyticsOverview({
  totalContacts,
  upcomingEvents,
  monthlySpending,
  complianceScore,
}: AnalyticsOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">联系人</span>
          </div>
          <div className="text-xl font-bold mt-1">{totalContacts}</div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">待办</span>
          </div>
          <div className="text-xl font-bold mt-1">{upcomingEvents}</div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">月支出</span>
          </div>
          <div className="text-xl font-bold mt-1">¥{monthlySpending.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">合规</span>
          </div>
          <div className="text-xl font-bold mt-1">{complianceScore}%</div>
        </CardContent>
      </Card>
    </div>
  );
}

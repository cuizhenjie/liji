"use client";

import { useState, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarViewEvent {
  id: string;
  title: string;
  date: string;
  type: "birthday" | "anniversary" | "festival" | "meeting" | "custom";
  contactName?: string;
  budget?: number;
  status?: "pending" | "confirmed";
}

interface CalendarViewsProps {
  events: CalendarViewEvent[];
}

const typeColors: Record<string, string> = {
  birthday: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  anniversary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  festival: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  meeting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function CalendarViews({ events }: CalendarViewsProps) {
  const [view, setView] = useState<"month" | "week" | "day" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() + (direction === "next" ? 1 : -1));
      } else if (view === "week") {
        next.setDate(next.getDate() + (direction === "next" ? 7 : -7));
      } else {
        next.setDate(next.getDate() + (direction === "next" ? 1 : -1));
      }
      return next;
    });
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: number; events: CalendarViewEvent[]; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        events: [],
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: i,
        events: events.filter((e) => e.date === dateStr),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, events: [], isCurrentMonth: false });
    }

    return days;
  }, [currentDate, events]);

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate("next")}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {(["month", "week", "day", "list"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => setView(v)}
            >
              {v === "month" && <CalendarDaysIcon className="w-4 h-4" />}
              {v === "list" && <ListIcon className="w-4 h-4" />}
              <span className="ml-1 hidden sm:inline">
                {v === "month" ? "月" : v === "week" ? "周" : v === "day" ? "日" : "列表"}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-900 min-h-[80px] p-1.5 ${
                !day.isCurrentMonth ? "opacity-40" : ""
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">{day.date}</div>
              <div className="space-y-0.5">
                {day.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                      typeColors[event.type] || typeColors.custom
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-[10px] text-gray-400 px-1.5">+{day.events.length - 3}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无事件</div>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      typeColors[event.type]?.split(" ")[0] || "bg-gray-200"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{event.title}</div>
                    <div className="text-xs text-gray-400">{event.date}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {event.type === "birthday"
                      ? "生日"
                      : event.type === "anniversary"
                        ? "纪念日"
                        : event.type === "festival"
                          ? "节日"
                          : event.type === "meeting"
                            ? "会议"
                            : "其他"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Week / Day views placeholder */}
      {(view === "week" || view === "day") && (
        <div className="text-center py-12 text-gray-400">
          <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{view === "week" ? "周视图" : "日视图"} 开发中</p>
        </div>
      )}
    </div>
  );
}

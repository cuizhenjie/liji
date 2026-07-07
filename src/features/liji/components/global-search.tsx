"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  SearchIcon,
  XIcon,
  UserRoundIcon,
  CalendarDaysIcon,
  GiftIcon,
  ReceiptTextIcon,
  BellRingIcon,
} from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";

interface SearchResult {
  id: string;
  type: "contact" | "event" | "gift" | "bill" | "reminder";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

interface GlobalSearchProps {
  onNavigate: (section: string, data?: unknown) => void;
  contacts: Array<{ id: string; name: string; relation?: string; relationship?: string }>;
  events: Array<{ id: string; title: string; date: string }>;
}

export function GlobalSearch({ onNavigate, contacts, events }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape" && isOpen) {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "power3.out" }
      );
    }
  }, [isOpen]);

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    contacts
      .filter((c) => c.name.toLowerCase().includes(q) || (c.relationship?.toLowerCase().includes(q) ?? false))
      .forEach((c) =>
        items.push({
          id: c.id,
          type: "contact",
          title: c.name,
          subtitle: c.relationship ?? "",
          icon: <UserRoundIcon className="w-4 h-4" />,
          action: () => {
            onNavigate("contacts");
            closeSearch();
          },
        })
      );

    events
      .filter((r) => r.title.toLowerCase().includes(q))
      .forEach((r) =>
        items.push({
          id: r.id,
          type: "reminder",
          title: r.title,
          subtitle: r.date,
          icon: <BellRingIcon className="w-4 h-4" />,
          action: () => {
            onNavigate("calendar");
            closeSearch();
          },
        })
      );

    return items.slice(0, 8);
  }, [query, contacts, events, onNavigate, closeSearch]);

  if (!isOpen) {
    return (
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="全局搜索 (Cmd+K)"
      >
        <SearchIcon className="w-4 h-4" />
        <span>搜索...</span>
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-white dark:bg-gray-900 rounded border">⌘K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <SearchIcon className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索联系人、提醒、事件..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-gray-400">
              未找到匹配结果
            </div>
          )}
          {results.map((result, index) => (
            <button
              key={result.id + index}
              onClick={result.action}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                {result.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {result.title}
                </div>
                <div className="text-xs text-gray-400 truncate">{result.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
          <span>↑↓ 选择</span>
          <span>↵ 确认</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}

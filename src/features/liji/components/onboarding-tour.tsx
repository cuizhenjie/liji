"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const tourSteps = [
  {
    target: "[data-tour='dashboard']",
    title: "欢迎使用礼记",
    content:
      "礼记是您的个人 AI 贴身秘书。这里展示本月预算、人情往来统计、合规提醒等核心指标。",
    position: "right",
  },
  {
    target: "[data-tour='contacts']",
    title: "人脉管理",
    content: "管理您的联系人，设置身份模板和偏好标签。",
    position: "right",
  },
  {
    target: "[data-tour='calendar']",
    title: "日历提醒",
    content: "查看所有提醒事件，支持月/周/日视图切换。",
    position: "right",
  },
  {
    target: "[data-tour='fulfillment']",
    title: "履约管理",
    content: "跟踪履约状态，管理差异和异常。",
    position: "right",
  },
  {
    target: "[data-tour='recommendations']",
    title: "AI 推荐",
    content: "基于您的偏好和场景，AI 会推荐合适的礼品和方案。",
    position: "bottom",
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const seen = localStorage.getItem("liji-tour-seen");
    if (!seen) {
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!isActive) return;
    const step = tourSteps[currentStep];
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      const pos = step.position || "bottom";
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      if (pos === "bottom") y = rect.bottom + 16;
      if (pos === "top") y = rect.top - 16;
      if (pos === "right") x = rect.right + 16;
      if (pos === "left") x = rect.left - 16;

      setTooltipPos({ x, y });
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    if (!isActive) return;
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isActive, updatePosition]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const completeTour = () => {
    setIsActive(false);
    localStorage.setItem("liji-tour-seen", "true");
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return (
      <button
        onClick={restartTour}
        className="fixed bottom-4 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
        title="重新查看引导"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={completeTour}
      />

      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-5 w-80 border border-border"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: "translate(-50%, 0)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">{step.title}</h3>
          <button
            onClick={completeTour}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              {currentStep < tourSteps.length - 1 ? (
                <>
                  下一步 <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                "完成"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

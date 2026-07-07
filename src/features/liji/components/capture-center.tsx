"use client";

import { useState, useRef, useCallback } from "react";
import { MicIcon, CameraIcon, MessageSquareIcon, TypeIcon, XIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CaptureCenterProps {
  onTextSubmit: (text: string) => void;
  onVoiceResult?: (result: { transcript: string; parsed?: { entities?: Array<{ type: string; value: string }> } }) => void;
  onOcrResult?: (result: { text: string; parsed?: { type?: string; data?: { name?: string; amount?: number; total?: number } } }) => void;
  isProcessing?: boolean;
}

type CaptureMode = "text" | "voice" | "ocr";

export function CaptureCenter({ onTextSubmit, onVoiceResult, onOcrResult, isProcessing }: CaptureCenterProps) {
  const [mode, setMode] = useState<CaptureMode>("text");
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = useCallback(() => {
    if (!text.trim()) return;
    onTextSubmit(text);
    setText("");
  }, [text, onTextSubmit]);

  const handleVoiceCapture = useCallback(async () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("您的浏览器不支持语音识别");
      return;
    }

    setIsRecording(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);

        // Call voice API
        fetch("/api/capture/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              onVoiceResult?.(data);
              toast.success("语音解析成功");
            }
          })
          .catch(() => toast.error("语音解析失败"));
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast.error("语音识别出错");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      toast.error("无法启动语音识别");
    }
  }, [onVoiceResult]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsCapturing(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const response = await fetch("/api/capture/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: `data:${file.type};base64,${base64}` }),
          });
          const data = await response.json();
          if (data.success) {
            onOcrResult?.(data);
            toast.success("图片解析成功");
          }
          setIsCapturing(false);
        };
        reader.readAsDataURL(file);
      } catch {
        setIsCapturing(false);
        toast.error("图片解析失败");
      }
    },
    [onOcrResult]
  );

  return (
    <Card className="overflow-hidden" data-tour="capture">
      <CardContent className="p-4 space-y-3">
        {/* Mode tabs */}
        <div className="flex items-center gap-2">
          {([
            { key: "text" as const, icon: TypeIcon, label: "文字" },
            { key: "voice" as const, icon: MicIcon, label: "语音" },
            { key: "ocr" as const, icon: CameraIcon, label: "截图" },
          ]).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                mode === m.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Text input */}
        {mode === "text" && (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入自然语言，如：下周三是张总生日，预算500元"
              className="w-full min-h-[80px] p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleTextSubmit}
                disabled={!text.trim() || isProcessing}
                className="gap-2"
              >
                {isProcessing ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MessageSquareIcon className="w-4 h-4" />}
                {isProcessing ? "解析中..." : "开始采集"}
              </Button>
            </div>
          </div>
        )}

        {/* Voice capture */}
        {mode === "voice" && (
          <div className="flex flex-col items-center py-6 gap-4">
            <button
              onClick={handleVoiceCapture}
              disabled={isRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
            >
              {isRecording ? <Loader2Icon className="w-6 h-6 animate-spin" /> : <MicIcon className="w-6 h-6" />}
            </button>
            <p className="text-sm text-gray-500">
              {isRecording ? "正在录音... 请说话" : "点击开始语音采集"}
            </p>
          </div>
        )}

        {/* OCR capture */}
        {mode === "ocr" && (
          <div className="flex flex-col items-center py-6 gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isCapturing}
              className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              {isCapturing ? <Loader2Icon className="w-6 h-6 animate-spin" /> : <CameraIcon className="w-6 h-6" />}
            </button>
            <p className="text-sm text-gray-500">
              {isCapturing ? "正在解析图片..." : "点击上传截图或照片"}
            </p>
            <p className="text-xs text-gray-400">支持名片、短信、收据等</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

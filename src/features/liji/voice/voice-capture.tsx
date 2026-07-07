'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

function useSpeechSupported() {
  return useSyncExternalStore(
    () => () => {},
    () => !!getSpeechRecognition(),
    () => false
  );
}

export function VoiceCapture({
  onTranscript,
  onError,
  language = 'zh-CN',
  disabled = false,
}: VoiceCaptureProps) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = useSpeechSupported();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      onError?.('浏览器不支持语音识别');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        onError?.(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      onError?.('启动语音识别失败');
    }
  }, [language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <MicOff className="w-4 h-4" />
        <span className="hidden sm:inline">不支持语音</span>
      </Button>
    );
  }

  return (
    <Button
      variant={isListening ? 'destructive' : 'outline'}
      size="sm"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className="gap-2 transition-all"
    >
      {isListening ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">停止</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">语音</span>
        </>
      )}
    </Button>
  );
}

export function VoiceCaptureButton({
  onTranscript,
  onError,
  language = 'zh-CN',
  disabled = false,
  className = '',
}: VoiceCaptureProps & { className?: string }) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = useSpeechSupported();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      onError?.('浏览器不支持语音识别');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        onError?.(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      onError?.('启动语音识别失败');
    }
  }, [language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-110 disabled:opacity-50 ${className}`}
      title="语音输入"
    >
      {isListening ? (
        <Volume2 className="w-5 h-5 animate-pulse" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

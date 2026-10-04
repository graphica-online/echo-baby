"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUFFER_SIZE,
  MAX_CLIP_MS,
  MIN_CLIP_MS,
  PLAYBACK_REARM_MS,
  PREBUFFER_MS,
  REARM_MS,
  computePeaks,
  encodeWav,
} from "@/lib/audio-utils";
import type { AppStatus, Clip } from "@/types/clip";

type EngineOptions = {
  sensitivity: number;  // 1-30 (%)
  silenceMs: number;    // пауза тишины до остановки записи
  onClipReady: (clip: Clip) => void;
};

type EngineReturn = {
  status: AppStatus;
  level: number;                    // 0-100, живой уровень RMS
  error: string | null;
  analyser: AnalyserNode | null;   // для визуализаторов
  start: () => Promise<void>;
  stop: () => void;
  notifyPlaybackEnded: () => void;  // чтобы не писать своё же эхо
  setStatus: (s: AppStatus) => void;
};

export function useAudioEngine(options: EngineOptions): EngineReturn {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  /* ============ refs ============
   * Используем refs вместо state, потому что они нужны внутри onaudioprocess
   * (замыкание), а state там будет "замороженным"
   */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Буферы
  const preBufferRef = useRef<Float32Array[]>([]);
  const recBufferRef = useRef<Float32Array[]>([]);

  // Флаги записи
  const isRecordingRef = useRef(false);
  const silenceStartRef = useRef<number>(0);
  const recStartRef = useRef<number>(0);

  // Защита от повторных срабатываний
  const rearmUntilRef = useRef<number>(0);
  const playbackRearmRef = useRef<number>(0);

  // Параметры (sync через useEffect)
  const sampleRateRef = useRef(44100);
  const statusRef = useRef<AppStatus>("idle");
  const sensitivityRef = useRef(options.sensitivity);
  const silenceMsRef = useRef(options.silenceMs);
  const onClipReadyRef = useRef(options.onClipReady);

  /* ============ Синхронизируем refs с текущими пропсами ============ */
  useEffect(() => {
    sensitivityRef.current = options.sensitivity;
  }, [options.sensitivity]);

  useEffect(() => {
    silenceMsRef.current = options.silenceMs;
  }, [options.silenceMs]);

  useEffect(() => {
    onClipReadyRef.current = options.onClipReady;
  }, [options.onClipReady]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /* ============ Финализация клипа ============ */
  const finalizeClip = useCallback(() => {
    const chunks = recBufferRef.current;
    recBufferRef.current = [];
    isRecordingRef.current = false;
    rearmUntilRef.current = Date.now() + REARM_MS;

    if (chunks.length === 0) {
      setStatus("listening");
      return;
    }

    // Склеиваем Float32Array
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const merged = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }

    const durationMs = (merged.length / sampleRateRef.current) * 1000;

    // Слишком короткий — выбрасываем
    if (durationMs < MIN_CLIP_MS) {
      setStatus("listening");
      return;
    }

    const blob = encodeWav(merged, sampleRateRef.current);
    const url = URL.createObjectURL(blob);
    const peaks = computePeaks(merged);

    const clip: Clip = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      blob,
      url,
      createdAt: Date.now(),
      durationMs,
      peaks,
      favorite: false,
      comment: "",
    };

    onClipReadyRef.current(clip);
    setStatus("listening");
  }, []);

  /* ============ Запуск микрофона ============ */
  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Создаём AudioContext (с поддержкой webkit для старых браузеров)
      const AudioCtx =
        window.AudioContext ||
        (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate;

      // Если контекст засуспендился (iOS) — разбудим
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);

      // Analyser для визуализаторов
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.75;
      analyserRef.current = an;
      setAnalyser(an);

      // ScriptProcessor для обработки звука
      // (Deprecated, но AudioWorklet не поддерживается в iOS <14.5)
      const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      // Gain=0 — чтобы наш обработчик работал, но звук не шёл в динамики (эхо)
      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(an);
      source.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      const prebufferMaxChunks = Math.ceil(
        (PREBUFFER_MS * ctx.sampleRate) / BUFFER_SIZE
      );

      /* ============ Главный аудио-callback ============ */
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Копируем, т.к. input будет переиспользован
        const samples = new Float32Array(input);

        // RMS -> 0-100%
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sum / samples.length);
        const levelPct = Math.min(100, rms * 400);

        // Обновляем состояние уровня (без throttle, React сам отбрасывает)
        setLevel(levelPct);

        const threshold = sensitivityRef.current;
        const now = Date.now();

        if (isRecordingRef.current) {
          // === Пишем ===
          recBufferRef.current.push(samples);
          const elapsed = now - recStartRef.current;

          // Жёсткая остановка по максимальной длине
          if (elapsed >= MAX_CLIP_MS) {
            finalizeClip();
            return;
          }

          // Отслеживаем тишину
          if (levelPct < threshold) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            }
            if (now - silenceStartRef.current >= silenceMsRef.current) {
              finalizeClip();
            }
          } else {
            // Любой шум сбрасывает счётчик тишины
            silenceStartRef.current = 0;
          }
        } else {
          // === Слушаем ===
          // Кольцевой предбуфер
          preBufferRef.current.push(samples);
          if (preBufferRef.current.length > prebufferMaxChunks) {
            preBufferRef.current.shift();
          }

          // Условия начала записи:
          // 1. Уровень выше порога
          // 2. Rearm после прошлой записи прошёл
          // 3. Rearm после воспроизведения прошёл (защита от эха)
          // 4. Мы вообще слушаем (не в playing)
          if (
            levelPct >= threshold &&
            now > rearmUntilRef.current &&
            now > playbackRearmRef.current &&
            statusRef.current === "listening"
          ) {
            isRecordingRef.current = true;
            recStartRef.current = now;
            silenceStartRef.current = 0;
            // Старт записи = предбуфер + текущий чанк (он уже в samples)
            recBufferRef.current = [...preBufferRef.current];
            preBufferRef.current = [];
            setStatus("recording");
          }
        }
      };

      setStatus("listening");
    } catch (e: any) {
      console.error("Mic error:", e);
      let msg = "Не удалось получить доступ к микрофону. Проверьте разрешения браузера.";
      if (e?.name === "NotAllowedError") {
        msg = "Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.";
      } else if (e?.name === "NotFoundError") {
        msg = "Микрофон не найден. Подключите устройство записи.";
      } else if (e?.name === "NotReadableError") {
        msg = "Микрофон занят другим приложением.";
      }
      setError(msg);
      setStatus("idle");
    }
  }, [finalizeClip]);

  /* ============ Остановка микрофона ============ */
  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
      setAnalyser(null);
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    isRecordingRef.current = false;
    preBufferRef.current = [];
    recBufferRef.current = [];
    silenceStartRef.current = 0;
    setLevel(0);
    setStatus("idle");
  }, []);

  /* ============ Нотификация об окончании воспроизведения ============ */
  const notifyPlaybackEnded = useCallback(() => {
    playbackRearmRef.current = Date.now() + PLAYBACK_REARM_MS;
    if (statusRef.current === "playing") {
      setStatus("listening");
    }
  }, []);

  /* ============ Cleanup при размонтировании ============ */
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    level,
    error,
    analyser,
    start,
    stop,
    notifyPlaybackEnded,
    setStatus,
  };
}
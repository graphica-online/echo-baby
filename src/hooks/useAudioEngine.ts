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
  sensitivity: number;
  silenceMs: number;
  onClipReady: (clip: Clip) => void;
};

type EngineReturn = {
  status: AppStatus;
  level: number;
  error: string | null;
  analyser: AnalyserNode | null;
  start: () => Promise<void>;
  stop: () => void;
  notifyPlaybackStarted: () => void;
  notifyPlaybackEnded: () => void;
  setStatus: (s: AppStatus) => void;
};

/**
 * Обрезает "тихий хвост" в начале и конце клипа.
 * Это убирает длинные паузы, если звук был короткий, но пауза тишины ждала завершения.
 */
function trimSilence(
  samples: Float32Array,
  sampleRate: number,
  thresholdPct: number
): Float32Array {
  // Переводим порог в амплитуду (0-1)
  // RMS * 400 = levelPct, значит amplitude = levelPct / 400
  const amplitudeThreshold = thresholdPct / 400 * 0.5; // немного ниже порога, чтобы не резать голос

  // Считаем в блоках по 10мс для стабильности
  const blockSize = Math.floor(sampleRate * 0.01); // 10ms
  
  // Находим первый "громкий" блок
  let startIdx = 0;
  for (let i = 0; i < samples.length - blockSize; i += blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) sum += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(sum / blockSize);
    if (rms > amplitudeThreshold) {
      // Отступаем назад на 100мс для плавного начала
      startIdx = Math.max(0, i - sampleRate * 0.1);
      break;
    }
  }

  // Находим последний "громкий" блок (идём с конца)
  let endIdx = samples.length;
  for (let i = samples.length - blockSize; i >= 0; i -= blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) sum += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(sum / blockSize);
    if (rms > amplitudeThreshold) {
      // Добавляем 200мс после последнего звука (хвост)
      endIdx = Math.min(samples.length, i + blockSize + sampleRate * 0.2);
      break;
    }
  }

  if (endIdx <= startIdx) return samples;
  return samples.slice(startIdx, endIdx);
}

export function useAudioEngine(options: EngineOptions): EngineReturn {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const preBufferRef = useRef<Float32Array[]>([]);
  const recBufferRef = useRef<Float32Array[]>([]);

  const isRecordingRef = useRef(false);
  const silenceStartRef = useRef<number>(0);
  const recStartRef = useRef<number>(0);
  const rearmUntilRef = useRef<number>(0);
  const playbackRearmRef = useRef<number>(0);
  
  // ✨ Ключевой флаг: блокирует ЛЮБУЮ обработку аудио во время воспроизведения
  const isPlayingRef = useRef(false);

  const sampleRateRef = useRef(44100);
  const statusRef = useRef<AppStatus>("idle");
  const sensitivityRef = useRef(options.sensitivity);
  const silenceMsRef = useRef(options.silenceMs);
  const onClipReadyRef = useRef(options.onClipReady);

  useEffect(() => { sensitivityRef.current = options.sensitivity; }, [options.sensitivity]);
  useEffect(() => { silenceMsRef.current = options.silenceMs; }, [options.silenceMs]);
  useEffect(() => { onClipReadyRef.current = options.onClipReady; }, [options.onClipReady]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const finalizeClip = useCallback(() => {
    const chunks = recBufferRef.current;
    
    // Синхронно сбрасываем все флаги
    recBufferRef.current = [];
    isRecordingRef.current = false;
    silenceStartRef.current = 0;
    rearmUntilRef.current = Date.now() + REARM_MS;

    if (chunks.length === 0) {
      setStatus("listening");
      return;
    }

    // Склеиваем все чанки
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    let merged = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }

    // 🎯 ОБРЕЗАЕМ ТИХИЕ ХВОСТЫ
    merged = trimSilence(merged, sampleRateRef.current, sensitivityRef.current);

    const durationMs = (merged.length / sampleRateRef.current) * 1000;

    if (durationMs < MIN_CLIP_MS) {
      setStatus("listening");
      return;
    }

    const blob = encodeWav(merged, sampleRateRef.current);
    const url = URL.createObjectURL(blob);
    const peaks = computePeaks(merged);

    const clip: Clip = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
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

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate;

      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);

      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.75;
      analyserRef.current = an;
      setAnalyser(an);

      const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(an);
      source.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      const prebufferMaxChunks = Math.ceil((PREBUFFER_MS * ctx.sampleRate) / BUFFER_SIZE);

      processor.onaudioprocess = (e) => {
        // 🛑 КРИТИЧЕСКАЯ ЗАЩИТА: если идёт воспроизведение — полностью игнорируем звук
        if (isPlayingRef.current) {
          // Чистим буферы, чтобы не записать эхо после окончания плеера
          preBufferRef.current = [];
          recBufferRef.current = [];
          isRecordingRef.current = false;
          silenceStartRef.current = 0;
          setLevel(0);
          return;
        }

        const input = e.inputBuffer.getChannelData(0);
        const samples = new Float32Array(input);

        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        const levelPct = Math.min(100, rms * 400);
        setLevel(levelPct);

        const threshold = sensitivityRef.current;
        const now = Date.now();

        if (isRecordingRef.current) {
          // === Пишем ===
          recBufferRef.current.push(samples);
          const elapsed = now - recStartRef.current;

          // Жёсткая остановка по максимуму
          if (elapsed >= MAX_CLIP_MS) {
            finalizeClip();
            return;
          }

          // Отслеживаем тишину
          if (levelPct < threshold) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current >= silenceMsRef.current) {
              finalizeClip();
              return;
            }
          } else {
            silenceStartRef.current = 0;
          }
        } else {
          // === Слушаем ===
          preBufferRef.current.push(samples);
          if (preBufferRef.current.length > prebufferMaxChunks) {
            preBufferRef.current.shift();
          }

          // Начало записи
          if (
            levelPct >= threshold &&
            now > rearmUntilRef.current &&
            now > playbackRearmRef.current
          ) {
            isRecordingRef.current = true;
            recStartRef.current = now;
            silenceStartRef.current = 0;
            // Старт = предбуфер + уже прочитанный чанк (его добавит следующая итерация)
            recBufferRef.current = [...preBufferRef.current, samples];
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

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch {}
      processorRef.current = null;
    }

    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
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
    isPlayingRef.current = false;
    preBufferRef.current = [];
    recBufferRef.current = [];
    silenceStartRef.current = 0;
    setLevel(0);
    setStatus("idle");
  }, []);

  // ✨ Вызывается перед запуском воспроизведения
  const notifyPlaybackStarted = useCallback(() => {
    isPlayingRef.current = true;
    // Если шла запись — финализируем её немедленно, чтобы не терять
    if (isRecordingRef.current) {
      finalizeClip();
    }
    if (statusRef.current === "listening" || statusRef.current === "recording") {
      setStatus("playing");
    }
  }, [finalizeClip]);

  const notifyPlaybackEnded = useCallback(() => {
    isPlayingRef.current = false;
    // Устанавливаем защитную задержку
    playbackRearmRef.current = Date.now() + PLAYBACK_REARM_MS;
    // Чистим буферы, чтобы не иметь остаточного эха
    preBufferRef.current = [];
    recBufferRef.current = [];
    isRecordingRef.current = false;
    silenceStartRef.current = 0;
    
    if (statusRef.current === "playing") {
      setStatus("listening");
    }
  }, []);

  useEffect(() => {
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    level,
    error,
    analyser,
    start,
    stop,
    notifyPlaybackStarted,
    notifyPlaybackEnded,
    setStatus,
  };
}
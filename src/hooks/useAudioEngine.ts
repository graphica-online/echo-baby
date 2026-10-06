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

// Функция обрезки тишины с добавлением плавного нарастания и затухания (Anti-Click)
function trimSilence(samples: any, sampleRate: number, thresholdPct: number): any {
  const amplitudeThreshold = (thresholdPct / 400) * 0.5;
  const blockSize = Math.floor(sampleRate * 0.01);
  
  let startIdx = 0;
  for (let i = 0; i < samples.length - blockSize; i += blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) sum += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(sum / blockSize);
    if (rms > amplitudeThreshold) {
      startIdx = Math.max(0, i - Math.floor(sampleRate * 0.15)); // 150мс предзаписи для контекста
      break;
    }
  }

  let endIdx = samples.length;
  for (let i = samples.length - blockSize; i >= 0; i -= blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) sum += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(sum / blockSize);
    if (rms > amplitudeThreshold) {
      endIdx = Math.min(samples.length, i + blockSize + Math.floor(sampleRate * 0.25)); // 250мс затухания
      break;
    }
  }

  if (endIdx <= startIdx) return samples;
  const sliced = samples.slice(startIdx, endIdx);

  // 🎯 WOW-ЭФФЕКТ: Плавный Fade-In (50мс) и Fade-Out (100мс) для абсолютной чистоты звука
  const fadeInLength = Math.floor(sampleRate * 0.05);
  const fadeOutLength = Math.floor(sampleRate * 0.1);

  for (let i = 0; i < Math.min(fadeInLength, sliced.length); i++) {
    sliced[i] *= (i / fadeInLength);
  }
  for (let i = 0; i < Math.min(fadeOutLength, sliced.length); i++) {
    const idx = sliced.length - 1 - i;
    sliced[idx] *= (i / fadeOutLength);
  }

  return sliced;
}

export function useAudioEngine(options: EngineOptions): EngineReturn {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const preBufferRef = useRef<any[]>([]);
  const recBufferRef = useRef<any[]>([]);

  const isRecordingRef = useRef(false);
  const silenceStartRef = useRef<number>(0);
  const recStartRef = useRef<number>(0);
  const rearmUntilRef = useRef<number>(0);
  const playbackRearmRef = useRef<number>(0);
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
    
    recBufferRef.current = [];
    isRecordingRef.current = false;
    silenceStartRef.current = 0;
    rearmUntilRef.current = Date.now() + REARM_MS;

    if (chunks.length === 0) {
      setStatus("listening");
      return;
    }

    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    
    let merged: any = new Float32Array(totalLen); 
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }

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

      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      
      try {
        await ctx.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      const source = ctx.createMediaStreamSource(stream);

      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.75;
      analyserRef.current = an;
      setAnalyser(an);

      const workletNode = new AudioWorkletNode(ctx, "echo-baby-processor");
      workletNodeRef.current = workletNode;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(an);
      source.connect(workletNode);
      workletNode.connect(gain);
      gain.connect(ctx.destination);

      const prebufferMaxChunks = Math.ceil((PREBUFFER_MS * ctx.sampleRate) / BUFFER_SIZE);

      workletNode.port.onmessage = (event) => {
        if (isPlayingRef.current) {
          preBufferRef.current = [];
          recBufferRef.current = [];
          isRecordingRef.current = false;
          silenceStartRef.current = 0;
          setLevel(0);
          return;
        }

        const samples = new Float32Array(event.data);

        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        const levelPct = Math.min(100, rms * 400);
        setLevel(levelPct);

        const threshold = sensitivityRef.current;
        const now = Date.now();

        if (isRecordingRef.current) {
          recBufferRef.current.push(samples);
          const elapsed = now - recStartRef.current;

          if (elapsed >= MAX_CLIP_MS) {
            finalizeClip();
            return;
          }

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
          preBufferRef.current.push(samples);
          if (preBufferRef.current.length > prebufferMaxChunks) {
            preBufferRef.current.shift();
          }

          // 🎯 ИСПРАВЛЕНО: samples уже лежит внутри preBufferRef, убираем дублирование!
          if (
            levelPct >= threshold &&
            now > rearmUntilRef.current &&
            now > playbackRearmRef.current
          ) {
            isRecordingRef.current = true;
            recStartRef.current = now;
            silenceStartRef.current = 0;
            recBufferRef.current = [...preBufferRef.current]; 
            preBufferRef.current = [];
            setStatus("recording");
          }
        }
      };

      setStatus("listening");
    } catch (e: any) {
      console.error("Mic or Worklet error:", e);
      let msg = "Не удалось запустить аудио-движок.";
      if (e?.name === "NotAllowedError") {
        msg = "Доступ к микрофону запрещён. Разрешите его в браузере.";
      }
      setError(msg);
      setStatus("idle");
    }
  }, [finalizeClip]);

  const stop = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      try { workletNodeRef.current.disconnect(); } catch {}
      workletNodeRef.current = null;
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
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
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

  const notifyPlaybackStarted = useCallback(() => {
    isPlayingRef.current = true;
    if (isRecordingRef.current) {
      finalizeClip();
    }
    if (statusRef.current === "listening" || statusRef.current === "recording") {
      setStatus("playing");
    }
  }, [finalizeClip]);

  const notifyPlaybackEnded = useCallback(() => {
    isPlayingRef.current = false;
    playbackRearmRef.current = Date.now() + PLAYBACK_REARM_MS;
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUFFER_SIZE,
  MIN_CLIP_MS,
  PLAYBACK_REARM_MS,
  PREBUFFER_MS,
  REARM_MS,
  computePeaks,
  encodeWav,
} from "@/lib/audio-utils";
import type { AppStatus, Clip } from "@/types/clip";

const ABSOLUTE_MAX_CLIP_MS = 1800000;

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

const WORKLET_CODE = `
  class EchoBabyProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.bufferSize = 4096;
      this.buffer = new Float32Array(this.bufferSize);
      this.writeIndex = 0;
    }
    process(inputs) {
      const input = inputs[0];
      if (!input || input.length === 0) return true;
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.writeIndex] = channelData[i];
        this.writeIndex++;
        if (this.writeIndex >= this.bufferSize) {
          const copy = new Float32Array(this.bufferSize);
          copy.set(this.buffer);
          this.port.postMessage(copy.buffer, [copy.buffer]);
          this.writeIndex = 0;
        }
      }
      return true;
    }
  }
  registerProcessor('echo-baby-processor', EchoBabyProcessor);
`;
function trimSilence(samples: any, sampleRate: number, thresholdPct: number): any {
  const amp = (thresholdPct / 400) * 0.5;
  const block = Math.floor(sampleRate * 0.01);
  let startIdx = 0;
  for (let i = 0; i < samples.length - block; i += block) {
    let s = 0;
    for (let j = 0; j < block; j++) s += samples[i + j] * samples[i + j];
    if (Math.sqrt(s / block) > amp) {
      startIdx = Math.max(0, i - Math.floor(sampleRate * 0.15));
      break;
    }
  }
  let endIdx = samples.length;
  for (let i = samples.length - block; i >= 0; i -= block) {
    let s = 0;
    for (let j = 0; j < block; j++) s += samples[i + j] * samples[i + j];
    if (Math.sqrt(s / block) > amp) {
      endIdx = Math.min(samples.length, i + block + Math.floor(sampleRate * 0.25));
      break;
    }
  }
  if (endIdx <= startIdx) return samples;
  const out = samples.slice(startIdx, endIdx);
  const fi = Math.floor(sampleRate * 0.05);
  const fo = Math.floor(sampleRate * 0.1);
  for (let i = 0; i < Math.min(fi, out.length); i++) out[i] *= i / fi;
  for (let i = 0; i < Math.min(fo, out.length); i++) out[out.length - 1 - i] *= i / fo;
  return out;
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
  const silenceStartRef = useRef(0);
  const recStartRef = useRef(0);
  const rearmUntilRef = useRef(0);
  const playbackRearmRef = useRef(0);
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
    if (chunks.length === 0) { setStatus("listening"); return; }
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    let merged: any = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    merged = trimSilence(merged, sampleRateRef.current, sensitivityRef.current);
    const durationMs = (merged.length / sampleRateRef.current) * 1000;
    if (durationMs < MIN_CLIP_MS) { setStatus("listening"); return; }
    const blob = encodeWav(merged, sampleRateRef.current);
    const url = URL.createObjectURL(blob);
    const peaks = computePeaks(merged);
    const clip: Clip = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      blob, url, createdAt: Date.now(), durationMs,
      peaks, favorite: false, comment: "",
    };
    onClipReadyRef.current(clip);
    setStatus("listening");
  }, []);

  const start = useCallback(async () => {
    // 🛡️ Защита от двойного вызова start()
    if (audioCtxRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate;
      if (ctx.state === "suspended") await ctx.resume();
      const b = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const u = URL.createObjectURL(b);
      try { await ctx.audioWorklet.addModule(u); } finally { URL.revokeObjectURL(u); }
      const source = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.75;
      analyserRef.current = an;
      setAnalyser(an);
      const wn = new AudioWorkletNode(ctx, "echo-baby-processor");
      workletNodeRef.current = wn;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(an);
      source.connect(wn);
      wn.connect(gain);
      gain.connect(ctx.destination);
      const maxChunks = Math.ceil((PREBUFFER_MS * ctx.sampleRate) / BUFFER_SIZE);
      wn.port.onmessage = (event) => {
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
        let lvl = Math.min(100, rms * 400);

        // 🛡️ Защита от NaN / Infinity
        if (isNaN(lvl) || !isFinite(lvl)) lvl = 0;
        setLevel(lvl);

        const thr = Number(sensitivityRef.current) ?? 8;
        // 🎯 ГИСТЕРЕЗИС: порог тишины равен 60% от порога старта (чтобы фоновые шумы не сбивали таймер)
        const silenceThreshold = thr * 0.6;
        const currentSilenceMs = Number(silenceMsRef.current) ?? 1000;
        const now = Date.now();

        if (isRecordingRef.current) {
          recBufferRef.current.push(samples);
          if (now - recStartRef.current >= ABSOLUTE_MAX_CLIP_MS) { finalizeClip(); return; }
          
          // 🎯 ИСПРАВЛЕНО: Сравниваем с заниженным порогом тишины
          if (lvl < silenceThreshold) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current >= currentSilenceMs) {
              finalizeClip();
              return;
            }
          } else { 
            silenceStartRef.current = 0; 
          }
        } else {
          preBufferRef.current.push(samples);
          if (preBufferRef.current.length > maxChunks) preBufferRef.current.shift();
          if (lvl >= thr && now > rearmUntilRef.current && now > playbackRearmRef.current) {
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
      console.error("Audio Engine failed:", e);
      let msg = "Не удалось запустить аудио-движок.";
      if (e?.name === "NotAllowedError") msg = "Доступ к микрофону запрещён.";
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
    if (isRecordingRef.current) finalizeClip();
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
    if (statusRef.current === "playing") setStatus("listening");
  }, []);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

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
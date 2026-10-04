"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Baby, Mic, Sun, Moon, Heart, Download, Trash2, Play, Pause,
  Sliders, Check, Palette, Settings, Sparkles,
  AlertCircle, X, Search, Zap, ExternalLink, Square, Volume2, Shield, Clock, Baby as BabyIcon
} from "lucide-react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useClipStorage } from "@/hooks/useClipStorage";
import {
  formatTime,
  formatDuration,
  formatDateGroup,
  clipFileName
} from "@/lib/audio-utils";
import type { Clip } from "@/types/clip";

/* ======================== Палитры ======================== */
type ColorPreset = { id: string; name: string; light: string; dark: string };

const PALETTES: ColorPreset[] = [
  { id: "violet", name: "Violet",  light: "259 63% 59%", dark: "260 85% 68%" },
  { id: "rose",   name: "Rose",    light: "346 77% 55%", dark: "350 85% 68%" },
  { id: "sky",    name: "Sky",     light: "199 89% 48%", dark: "199 95% 60%" },
  { id: "emerald",name: "Emerald", light: "160 70% 42%", dark: "160 75% 50%" },
  { id: "amber",  name: "Amber",   light: "32 95% 50%",  dark: "35 95% 60%" },
  { id: "zinc",   name: "Zinc",    light: "240 6% 25%",  dark: "240 5% 80%" },
];

export default function EchoBaby() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const {
    clips, settings, addClip, toggleFavorite, updateComment, removeClip, clearAll, updateSettings,
  } = useClipStorage();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listTab, setListTab] = useState<"all" | "fav">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<any>(null);

  // UI-Kit демо-состояния
  const [kitInput, setKitInput] = useState("");
  const [kitPassword, setKitPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [kitSwitch, setKitSwitch] = useState(true);
  const [kitSwitch2, setKitSwitch2] = useState(false);
  const [kitCheckbox, setKitCheckbox] = useState(true);
  const [kitCheckbox2, setKitCheckbox2] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleClipReady = (newClip: Clip) => {
    addClip(newClip);
    if (settings.autoplay) playClip(newClip);
  };

    const {
    status, level, error: micError, analyser,
    start: startMic, stop: stopMic, notifyPlaybackStarted, notifyPlaybackEnded,
  } = useAudioEngine({
    sensitivity: settings.sensitivity,
    silenceMs: settings.silenceMs,
    onClipReady: handleClipReady,
  });

  useEffect(() => {
    if (!mounted) return;
    const p = PALETTES.find((x) => x.id === settings.palette);
    if (!p) return;
    const color = isDark ? p.dark : p.light;
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--ring", color);
  }, [settings.palette, isDark, mounted]);

  const stopClip = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setPlayingId(null);
    setPlayProgress(0);
    notifyPlaybackEnded();
  };

    const playClip = (clip: Clip) => {
    stopClip();
    
    // 🎯 Сообщаем движку, что начинается воспроизведение — он остановит запись
    notifyPlaybackStarted();
    
    const audio = new Audio(clip.url);
    activeAudioRef.current = audio;
    setPlayingId(clip.id);
    audio.onended = () => stopClip();
    audio.play().then(() => {
      progressIntervalRef.current = setInterval(() => {
        if (audio.duration) setPlayProgress(audio.currentTime / audio.duration);
      }, 30);
    }).catch(() => stopClip());
  };

  const handleMicToggle = () => {
    if (status !== "idle") {
      stopMic();
    } else {
      stopClip();
      startMic();
    }
  };

  const filteredClips = useMemo(() => {
    let result = clips;
    if (listTab === "fav") result = result.filter((c) => c.favorite);
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.comment.toLowerCase().includes(q) || formatTime(c.createdAt).includes(q));
    }
    return result;
  }, [clips, listTab, searchQuery]);

  const groupedFavorites = useMemo(() => {
    if (listTab !== "fav") return [];
    const groups: { label: string; count: number; clips: Clip[] }[] = [];
    const map = new Map<string, Clip[]>();
    for (const c of filteredClips) {
      const key = formatDateGroup(c.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    for (const [label, cls] of map) groups.push({ label, count: cls.length, clips: cls });
    return groups;
  }, [filteredClips, listTab]);

  if (!mounted) return null;

  const showRecordingsSection = status !== "idle" || clips.length > 0;

  return (
    <div className="min-h-screen relative pb-16">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6 animate-in fade-in duration-300">
        
        {/* === Шапка === */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Baby className="h-5 w-5" />
              </div>
              {status !== "idle" && (
                <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-background ${
                  status === "recording" ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"
                }`} />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Echo Baby
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  v2 Live
                </span>
              </h1>
              <p className="text-xs text-muted-foreground select-none">Умная аудио-няня с буфером предзаписи</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ui-kit"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 px-3 rounded-xl border bg-card shadow-sm hover:bg-accent transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Sliders className="h-3.5 w-3.5" /> UI-Kit
            </Link>

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm hover:bg-accent hover:text-primary transition-colors"
              aria-label="Настройки"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm hover:bg-accent transition-colors"
              aria-label="Смена темы"
            >
              {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Ошибка микрофона */}
        {micError && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-in slide-in-from-top-4 duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Ошибка микрофона:</span>
              <p className="text-xs text-destructive/80 mt-1">{micError}</p>
            </div>
            <button onClick={stopMic} className="text-destructive hover:text-destructive/80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* === Главная консоль === */}
        <section className="rounded-3xl border bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b bg-secondary/40 select-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === "recording" ? "bg-red-500 animate-ping" : status === "listening" ? "bg-emerald-500 animate-ping" : "bg-muted-foreground"
                }`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  status === "recording" ? "bg-red-500" : status === "listening" ? "bg-emerald-500" : "bg-muted-foreground/50"
                }`} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {status === "recording" ? "Идёт запись WAV" : status === "listening" ? "Слушаю тишину..." : "Студия готова"}
              </span>
            </div>
            {status !== "idle" && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                status === "recording" 
                  ? "border-red-500/30 bg-red-500/10 text-red-500" 
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                <Zap className="h-3 w-3" /> {status}
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Визуализатор с ФИКСИРОВАННОЙ высотой */}
            <div className="relative w-full h-40 rounded-2xl bg-gradient-to-b from-secondary/40 to-background border overflow-hidden">
              <CanvasVisualizer analyser={analyser} style={settings.visualizer} active={status !== "idle"} />
            </div>

            {/* Порог */}
            <div className="space-y-3">
              <div className="flex items-center justify-between select-none">
                <div>
                  <h3 className="text-sm font-semibold">Порог срабатывания</h3>
                  <p className="text-[11px] text-muted-foreground">Микрофон включится, если звук пересечёт оранжевую отметку</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                  {settings.sensitivity}%
                </span>
              </div>

              <RangeSlider min={1} max={30} value={settings.sensitivity} onChange={(v: number) => updateSettings({ sensitivity: v })} />

              <div className="pt-1 select-none">
                <div className="relative h-3 rounded-full bg-secondary border overflow-visible">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-pink-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, level)}%` }}
                  />
                  <div
                    className="absolute -top-1 -bottom-1 w-0.5 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50"
                    style={{ left: `${settings.sensitivity}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-background" />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-orange-500 whitespace-nowrap">
                      {settings.sensitivity}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-4">
                  <span>0% Тишина</span><span>50%</span><span>100% Шум</span>
                </div>
              </div>
            </div>

            {/* Кнопка */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleMicToggle}
                className={`group relative h-14 px-10 rounded-2xl font-bold text-base text-white transition-all duration-200 flex items-center gap-2.5 overflow-hidden ring-1 ring-white/20 ring-inset shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
                  status !== "idle"
                    ? "bg-gradient-to-br from-red-600 to-rose-600 shadow-red-500/30 hover:shadow-red-500/50"
                    : "bg-gradient-to-br from-primary via-primary to-pink-500 shadow-primary/30 hover:shadow-primary/50"
                }`}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                {status !== "idle" ? <Square className="h-5 w-5 relative z-10" /> : <Mic className="h-5 w-5 relative z-10" />}
                <span className="relative z-10 drop-shadow-sm">
                  {status !== "idle" ? "Выключить Студию" : "Включить Студию"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* === Секция записей === */}
        {showRecordingsSection && (
          <section className="rounded-3xl border bg-card shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3">
              <div className="inline-flex h-9 items-center rounded-xl bg-secondary p-0.5 border">
                <button
                  onClick={() => setListTab("all")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    listTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Записи
                  <span className="text-[10px] px-1.5 py-0 rounded bg-muted font-bold">{clips.length}</span>
                </button>
                <button
                  onClick={() => setListTab("fav")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    listTab === "fav" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Heart className="h-3 w-3" /> Избранное
                  <span className="text-[10px] px-1.5 py-0 rounded bg-muted font-bold">
                    {clips.filter((c) => c.favorite).length}
                  </span>
                </button>
              </div>

              {clips.length > 0 && (
                <>
                  <div className="w-48">
                    <Input
                      placeholder="Искать комментарий..."
                      value={searchQuery}
                      onChange={setSearchQuery}
                      leftIcon={<Search className="h-3.5 w-3.5" />}
                    />
                  </div>
                  <button
                    onClick={clearAll}
                    className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Очистить все
                  </button>
                </>
              )}
            </div>

            {clips.length === 0 ? (
              /* ПУСТОЕ СОСТОЯНИЕ */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <Mic className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h3 className="text-sm font-bold mb-1">Жду первый звук</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Как только громкость превысит порог ({settings.sensitivity}%), я автоматически запишу момент и покажу его здесь.
                </p>
              </div>
            ) : filteredClips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {searchQuery ? "Ничего не найдено по запросу" : listTab === "fav" ? "Нет избранных записей" : "Записей пока нет"}
              </div>
            ) : listTab === "fav" ? (
              <div className="divide-y divide-border/60">
                {groupedFavorites.map((group) => (
                  <div key={group.label} className="p-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                      {group.label} · {group.count}
                    </h4>
                    <ul className="space-y-2">
                      {group.clips.map((clip) => (
                        <ClipRow key={clip.id} clip={clip} playingId={playingId} progress={playProgress}
                          onPlay={playClip} onStop={stopClip} onFav={toggleFavorite} onComment={updateComment} onDelete={removeClip} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y">
                {filteredClips.map((clip) => (
                  <ClipRow key={clip.id} clip={clip} playingId={playingId} progress={playProgress}
                    onPlay={playClip} onStop={stopClip} onFav={toggleFavorite} onComment={updateComment} onDelete={removeClip} />
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="pt-6 text-center text-xs text-muted-foreground select-none">
          Echo Baby · {new Date().getFullYear()} · 
          <Link href="/ui-kit" className="text-primary hover:underline ml-1">UI-Kit</Link>
        </footer>
      </div>

      {/* ======================== МОДАЛКА НАСТРОЕК ======================== */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md" onClick={() => setSettingsOpen(false)} />
          
          <div className="relative w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Settings className="h-5 w-5" />
                <h2 className="text-base font-bold">Настройки</h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Внешний вид */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Внешний вид
              </h3>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Основной цвет</label>
                <div className="grid grid-cols-3 gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => updateSettings({ palette: p.id })}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                        settings.palette === p.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent"
                      }`}
                    >
                      <div className="h-5 w-5 rounded-md shadow-sm border border-black/10 shrink-0"
                        style={{ backgroundColor: `hsl(${isDark ? p.dark : p.light})` }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Стиль визуализатора</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "bars", name: "Classic Bars", desc: "Столбики от центра" },
                    { id: "mirror", name: "Mirror Wave", desc: "Зеркальное отражение" },
                    { id: "circular", name: "Circular Siri", desc: "Радиальные линии" },
                    { id: "blob", name: "Liquid Blob", desc: "Жидкая сфера" },
                    { id: "particles", name: "Particles Field", desc: "Летающие частицы" },
                    { id: "grid", name: "Retro Neon Grid", desc: "Синтвейв сетка" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => updateSettings({ visualizer: v.id })}
                      className={`flex flex-col p-2.5 rounded-xl border text-left transition-all ${
                        settings.visualizer === v.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="text-xs font-bold">{v.name}</span>
                      <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Запись */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Параметры записи
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Лимит аудиодорожек</span>
                  <span className="font-bold text-primary">
                    {settings.maxClips >= 500 ? "Без лимита (500)" : `${settings.maxClips} шт`}
                  </span>
                </div>
                <RangeSlider min={10} max={500} step={10} value={settings.maxClips}
                  onChange={(v: number) => updateSettings({ maxClips: v })} />
                <p className="text-[10px] text-muted-foreground">
                  При превышении лимита удаляются самые старые записи. ❤️ Избранные защищены навсегда.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Пауза тишины для остановки</span>
                  <span className="font-bold text-primary">{(settings.silenceMs / 1000).toFixed(1)} с</span>
                </div>
                <RangeSlider min={300} max={3000} step={100} value={settings.silenceMs}
                  onChange={(v: number) => updateSettings({ silenceMs: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold">Автовоспроизведение</span>
                  <p className="text-[10px] text-muted-foreground">Проигрывать новые записи</p>
                </div>
                <Toggle checked={settings.autoplay} onChange={(v: boolean) => updateSettings({ autoplay: v })} />
              </div>
            </div>

            {/* О проекте */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">О проекте</h3>
              
              <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-pink-500/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                    <BabyIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Echo Baby — твой умный аудио-помощник</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Приложение автоматически записывает яркие моменты в WAV, когда звук превышает порог.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-start gap-2 text-[11px]">
                    <BabyIcon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span><b className="text-foreground">Аудио-няня для малыша</b> — фиксирует плач, агуканье, первые слова. Утром слушайте, как спал ребёнок.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span><b className="text-foreground">Домашний охранник</b> — слышит разбитое стекло, лай собаки, звонок в дверь, когда вас нет дома.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Volume2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span><b className="text-foreground">Диктофон встреч</b> — не нужно нажимать запись, микрофон сам реагирует на речь.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span><b className="text-foreground">Запись репетиций</b> — для музыкантов, подкастеров, вокалистов. 2 секунды буфера гарантируют, что начало не потеряется.</span>
                  </div>
                </div>
              </div>

              {/* Автор */}
              <div className="rounded-2xl bg-secondary/40 p-3 border select-none">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-pink-500 text-white font-black shadow-md">
                    AS
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold">Alexey Semenov</h4>
                    <p className="text-[10px] text-muted-foreground">UI/UX & Web Designer · 15+ лет опыта</p>
                  </div>
                  <a href="https://github.com/graphica-online" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSettingsOpen(false)}
                className="h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs shadow-sm shadow-primary/20 transition-all active:scale-95"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================== */
/* === ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ CANVAS-ВИЗУАЛИЗАТОР ===       */
/* ======================================================== */
function CanvasVisualizer({ analyser, style, active }: { analyser: AnalyserNode | null; style: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const dataArrayRef = useRef<any>(null);
  const phaseRef = useRef(0);
  const smoothedBarsRef = useRef<Float32Array>(new Float32Array(140));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(canvas);
    handleResize();

    if (analyser) {
      analyser.fftSize = 512;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      const W = canvas.width / (window.devicePixelRatio || 1);
      const H = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, W, H);

      const primaryColorStr = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      const primaryColor = `hsl(${primaryColorStr || "259 63% 59%"})`;
      const primaryColorAlpha = (a: number) => `hsl(${primaryColorStr || "259 63% 59%"} / ${a})`;

      phaseRef.current += 0.05;
      const freqData = dataArrayRef.current;
      const isLive = active && analyser && freqData;
      if (isLive && analyser && freqData) analyser.getByteFrequencyData(freqData as any);

      /* 1. BARS */
      if (style === "bars") {
        const BARS = 112;
        const GAP = 1;
        const barW = Math.max(0.5, (W - 32 - (BARS - 1) * GAP) / BARS);
        const centerY = H / 2;
        for (let i = 0; i < BARS; i++) {
          let target = 0;
          if (isLive && freqData) {
            const dist = Math.abs(i - BARS / 2) / (BARS / 2);
            const idx = Math.floor(Math.pow(dist, 1.6) * (freqData.length * 0.7));
            const raw = freqData[Math.min(idx, freqData.length - 1)] / 255;
            target = raw < 0.05 ? 0 : Math.pow(raw, 1.35) * 55;
          } else {
            const dist = Math.abs(i - BARS / 2) / (BARS / 2);
            target = (Math.sin(phaseRef.current + i * 0.15) + 1) * 10 * (1 - dist * 0.6) + 2;
          }
          const prev = smoothedBarsRef.current[i] || 0;
          smoothedBarsRef.current[i] = prev + (target - prev) * 0.35;
          const h = smoothedBarsRef.current[i];
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.roundRect(16 + i * (barW + GAP), centerY - h, barW, h * 2, barW / 2);
          ctx.fill();
        }
      }

      /* 2. MIRROR */
      else if (style === "mirror") {
        const BARS = 140;
        const GAP = 1;
        const barW = Math.max(0.5, (W - 32 - (BARS - 1) * GAP) / BARS);
        const centerY = H / 2;
        ctx.strokeStyle = primaryColorAlpha(0.2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, centerY);
        ctx.lineTo(W - 16, centerY);
        ctx.stroke();
        for (let i = 0; i < BARS; i++) {
          let target = 0;
          if (isLive && freqData) {
            const idx = Math.floor((i / BARS) * (freqData.length * 0.6));
            const raw = freqData[idx] / 255;
            target = raw < 0.05 ? 0 : Math.pow(raw, 1.2) * 45;
          } else {
            target = (Math.sin(phaseRef.current * 0.7 + i * 0.12) + 1) * 12 + 1;
          }
          const prev = smoothedBarsRef.current[i] || 0;
          smoothedBarsRef.current[i] = prev + (target - prev) * 0.25;
          const h = smoothedBarsRef.current[i];
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.roundRect(16 + i * (barW + GAP), centerY - h, barW, h, [barW / 2, barW / 2, 0, 0]);
          ctx.fill();
          ctx.fillStyle = primaryColorAlpha(0.3);
          ctx.beginPath();
          ctx.roundRect(16 + i * (barW + GAP), centerY, barW, h * 0.7, [0, 0, barW / 2, barW / 2]);
          ctx.fill();
        }
      }

      /* 3. CIRCULAR */
      else if (style === "circular") {
        const cx = W / 2;
        const cy = H / 2;
        const rBase = 28;
        const numBars = 64;
        ctx.fillStyle = primaryColorAlpha(0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, rBase + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = primaryColorAlpha(0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, rBase - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2;
          let target = 0;
          if (isLive && freqData) {
            const idx = Math.floor((i / numBars) * (freqData.length * 0.5));
            target = (freqData[idx] / 255) * 35;
          } else {
            target = (Math.sin(phaseRef.current * 0.5 + i * 0.4) + 1) * 4;
          }
          const prev = smoothedBarsRef.current[i] || 0;
          smoothedBarsRef.current[i] = prev + (target - prev) * 0.3;
          const len = smoothedBarsRef.current[i];
          const x1 = cx + Math.cos(angle) * rBase;
          const y1 = cy + Math.sin(angle) * rBase;
          const x2 = cx + Math.cos(angle) * (rBase + len);
          const y2 = cy + Math.sin(angle) * (rBase + len);
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      /* 4. BLOB */
      else if (style === "blob") {
        const cx = W / 2;
        const cy = H / 2;
        let avgFreq = 0;
        if (isLive && freqData) {
          let sum = 0;
          for (let i = 0; i < 80; i++) sum += freqData[i];
          avgFreq = sum / 80 / 255;
          avgFreq = Math.pow(avgFreq, 0.7);
        } else {
          avgFreq = (Math.sin(phaseRef.current * 0.4) + 1) * 0.15;
        }
        const rBase = 35 + avgFreq * 35;
        const points = 10;
        const coords: { x: number; y: number }[] = [];
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wave = Math.sin(phaseRef.current * 0.8 + i) * (5 + avgFreq * 20);
          const r = rBase + wave;
          coords.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        ctx.fillStyle = primaryColorAlpha(0.15);
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        for (let i = 0; i < points; i++) {
          const next = coords[(i + 1) % points];
          const xc = (coords[i].x + next.x) / 2;
          const yc = (coords[i].y + next.y) / 2;
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = primaryColorAlpha(0.25);
        ctx.beginPath();
        ctx.arc(cx, cy, rBase * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        for (let i = 0; i < points; i++) {
          const next = coords[(i + 1) % points];
          const xc = (coords[i].x + next.x) / 2;
          const yc = (coords[i].y + next.y) / 2;
          ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
        }
        ctx.closePath();
        ctx.stroke();
      }

      /* 5. PARTICLES */
      else if (style === "particles") {
        const cx = W / 2;
        const cy = H / 2;
        let power = 0.05;
        let bassPower = 0;
        if (isLive && freqData) {
          let sum = 0;
          for (let i = 0; i < 80; i++) sum += freqData[i];
          power = sum / 80 / 255;
          power = Math.pow(power, 0.6);
          let bassSum = 0;
          for (let i = 0; i < 15; i++) bassSum += freqData[i];
          bassPower = Math.pow(bassSum / 15 / 255, 0.8);
        } else {
          power = (Math.sin(phaseRef.current * 0.3) + 1) * 0.1 + 0.05;
          bassPower = (Math.cos(phaseRef.current * 0.2) + 1) * 0.1;
        }
        const PARTICLES = 120;
        const t = phaseRef.current;
        for (let i = 0; i < 20; i++) {
          const seed = i * 7.3;
          const orbitSpeed = 0.015 + (i % 4) * 0.005;
          const orbitPhase = seed;
          const direction = i % 2 === 0 ? 1 : -1;
          const baseRadius = 30 + (i % 5) * 12;
          const radius = baseRadius + bassPower * 50 + Math.sin(t * 0.5 + seed) * 8;
          const angle = t * orbitSpeed * direction + orbitPhase;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius * 0.6;
          const size = 2.5 + (i % 3) + power * 4 + Math.sin(t + seed) * 1;
          const alpha = 0.4 + power * 0.5;
          ctx.fillStyle = primaryColorAlpha(alpha * 0.15);
          ctx.beginPath();
          ctx.arc(x, y, size * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = primaryColorAlpha(alpha * 0.4);
          ctx.beginPath();
          ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = primaryColorAlpha(alpha);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < PARTICLES; i++) {
          const seed = i * 2.7;
          const orbitSpeed = 0.04 + (i % 6) * 0.01;
          const orbitPhase = seed * 1.3;
          const direction = i % 3 === 0 ? -1 : 1;
          const baseRadius = 15 + ((i * 17) % 60);
          const explosion = bassPower * 40 * (1 + (i % 5) * 0.2);
          const radius = baseRadius + explosion + Math.sin(t * 0.8 + seed) * 5;
          const angle = t * orbitSpeed * direction + orbitPhase;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius * 0.75;
          const twinkle = (Math.sin(t * 2 + seed * 5) + 1) * 0.5;
          const alpha = (0.3 + twinkle * 0.5 + power * 0.4) * (0.5 + (i % 4) * 0.15);
          const size = 0.8 + ((i * 1.3) % 2) + power * 1.5 + twinkle * 0.5;
          ctx.fillStyle = primaryColorAlpha(Math.min(1, alpha) * 0.25);
          ctx.beginPath();
          ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = primaryColorAlpha(Math.min(1, alpha));
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        if (power > 0.1) {
          const flashSize = 15 + power * 30;
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashSize * 2);
          gradient.addColorStop(0, primaryColorAlpha(power * 0.4));
          gradient.addColorStop(0.5, primaryColorAlpha(power * 0.1));
          gradient.addColorStop(1, primaryColorAlpha(0));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(cx, cy, flashSize * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = primaryColorAlpha(power * 0.8);
          ctx.beginPath();
          ctx.arc(cx, cy, flashSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* 6. NEON GRID */
      else if (style === "grid") {
        ctx.strokeStyle = primaryColorAlpha(0.1);
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 16) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const numPoints = 80;
        for (let i = 0; i < numPoints; i++) {
          const x = (i / (numPoints - 1)) * W;
          let target = 0;
          if (isLive && freqData) {
            const idx = Math.floor((i / numPoints) * (freqData.length * 0.5));
            target = (freqData[idx] / 255) * 35;
          } else {
            target = Math.sin(phaseRef.current * 1.2 + i * 0.15) * 12 + Math.cos(phaseRef.current * 0.8 + i * 0.1) * 6;
          }
          const y = H / 2 + target;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (resizeObs) resizeObs.disconnect();
    };
  }, [analyser, style, active]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

/* ======================== Helpers ======================== */

function Input({ value, onChange, placeholder, type = "text", leftIcon, rightSlot, error, disabled, readOnly }: any) {
  const padLeft = leftIcon ? "pl-9" : "pl-3";
  const padRight = rightSlot ? "pr-10" : "pr-3";
  const borderCls = error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20";
  const bgCls = error ? "bg-destructive/5" : "bg-background";
  return (
    <div className="relative">
      {leftIcon && <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${error ? "text-destructive" : "text-muted-foreground"}`}>{leftIcon}</div>}
      <input type={type} value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} placeholder={placeholder} disabled={disabled} readOnly={readOnly}
        className={`w-full h-10 ${padLeft} ${padRight} ${bgCls} border rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 ${borderCls} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${error ? "text-destructive" : "text-foreground"}`} />
      {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  );
}

function RangeSlider({ min, max, value, onChange, step = 1, disabled }: any) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`relative py-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="relative h-2 rounded-full bg-secondary">
        <div className="absolute top-0 left-0 h-full rounded-full bg-primary transition-[width] duration-75" style={{ width: `${pct}%` }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" style={{ appearance: "none" }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-background border-2 border-primary shadow-md pointer-events-none transition-[left] duration-75" style={{ left: `${pct}%` }} />
    </div>
  );
}

function Toggle({ checked, onChange, disabled, size = "md" }: any) {
  const dims = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const thumb = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex ${dims} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-primary" : "bg-muted"}`}>
      <span className={`pointer-events-none inline-block ${thumb} transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? translate : "translate-x-0"}`} />
    </button>
  );
}

function Checkbox({ checked, onChange, disabled }: any) {
  return (
    <button type="button" disabled={disabled} onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${checked ? "bg-primary border-primary" : "bg-background border-muted-foreground/30 hover:border-primary/50"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

function ClipRow({ clip, playingId, progress, onPlay, onStop, onFav, onComment, onDelete }: any) {
  const isPlaying = playingId === clip.id;
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = clipFileName(clip.createdAt);
    a.click();
  };

  return (
    <li className={`flex items-center gap-3 px-4 py-3 transition-colors ${isPlaying ? "bg-primary/5" : "hover:bg-accent/40"}`}>
      <button
        onClick={() => (isPlaying ? onStop() : onPlay(clip))}
        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30 transition-all active:scale-95"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-3 items-center">
        <div className="flex flex-col select-none">
          <span className="text-sm font-bold tabular-nums leading-tight">{formatTime(clip.createdAt)}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(clip.durationMs)}</span>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex h-6 items-center gap-[1px]">
            {clip.peaks.map((h: number, i: number) => {
              const played = isPlaying && i / clip.peaks.length <= progress;
              return <span key={i} className={`flex-1 rounded-full transition-all duration-75 ${played ? "bg-primary scale-y-110" : isPlaying ? "bg-primary/30" : "bg-muted-foreground/25"}`} style={{ height: `${Math.max(12, h * 100)}%` }} />;
            })}
          </div>
          <input type="text" value={clip.comment} onChange={(e) => onComment(clip.id, e.target.value)} placeholder="Оставить комментарий…"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none border-b border-transparent focus:border-primary/20 pb-0.5 transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => onFav(clip.id)}
          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${clip.favorite ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
          <Heart className={`h-4 w-4 ${clip.favorite ? "fill-current" : ""}`} />
        </button>
        <button onClick={handleDownload} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(clip.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
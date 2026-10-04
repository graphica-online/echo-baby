"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Baby, Sun, Moon, Heart, Download, Trash2, Play, Pause,
  Sliders, Check, Sparkles, Info, Palette,
  AlertCircle, AlertTriangle, CheckCircle2, X, Search, Loader2, Plus,
  Filter, MoreHorizontal, Bell, Mail, Lock, Eye, EyeOff,
  ArrowRight, ArrowLeft, Zap, Star, Clock, Volume2
} from "lucide-react";

export default function UIKit() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [kitSlider, setKitSlider] = useState(45);
  const [kitSwitch, setKitSwitch] = useState(true);
  const [kitSwitch2, setKitSwitch2] = useState(false);
  const [kitInput, setKitInput] = useState("");
  const [kitPassword, setKitPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [kitCheckbox, setKitCheckbox] = useState(true);
  const [kitCheckbox2, setKitCheckbox2] = useState(false);
  const [kitRadio, setKitRadio] = useState("plan-pro");

  if (!mounted) return null;
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen relative pb-16">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Шапка */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                UI Design System
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">Полная коллекция компонентов Echo Baby</p>
            </div>
          </div>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm hover:bg-accent transition-colors"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </header>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-pink-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">Design System Echo Baby</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Эта страница — живая коллекция всех UI-компонентов проекта. Пощёлкайте, переключите тему. 
                Цвет меняется в настройках главной страницы и мгновенно отражается здесь.
              </p>
            </div>
          </div>
        </div>

        {/* 1. ЦВЕТА */}
        <KitSection title="1. Цветовая палитра" subtitle="Семантические и системные цвета">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ColorSwatch name="Primary" cls="bg-primary" code="var(--primary)" />
            <ColorSwatch name="Background" cls="bg-background border" code="var(--background)" />
            <ColorSwatch name="Secondary" cls="bg-secondary border" code="var(--secondary)" />
            <ColorSwatch name="Muted" cls="bg-muted border" code="var(--muted)" />
            <ColorSwatch name="Accent" cls="bg-accent border" code="var(--accent)" />
            <ColorSwatch name="Destructive" cls="bg-destructive" code="var(--destructive)" />
            <ColorSwatch name="Success" cls="bg-emerald-500" code="emerald-500" />
            <ColorSwatch name="Warning" cls="bg-orange-500" code="orange-500" />
          </div>
        </KitSection>

        {/* 2. ТИПОГРАФИКА */}
        <KitSection title="2. Типографика" subtitle="Иерархия текста">
          <div className="rounded-2xl border bg-card p-6 space-y-4 divide-y">
            <div><h1 className="text-4xl font-bold tracking-tight">H1 — Главный заголовок 48</h1></div>
            <div className="pt-4"><h2 className="text-2xl font-bold tracking-tight">H2 — Заголовок секции 32</h2></div>
            <div className="pt-4"><h3 className="text-lg font-semibold">H3 — Подзаголовок 20</h3></div>
            <div className="pt-4"><p className="text-base">Body — Основной текст 16, обычный вес</p></div>
            <div className="pt-4"><p className="text-sm text-muted-foreground">Small — Второстепенный текст 14</p></div>
            <div className="pt-4"><p className="text-xs text-muted-foreground font-mono">Caption 12 · моноширинный шрифт для технических данных</p></div>
          </div>
        </KitSection>

        {/* 3. КНОПКИ */}
        <KitSection title="3. Кнопки (Buttons)" subtitle="Все варианты, размеры, состояния">
          <div className="rounded-2xl border bg-card p-6 space-y-6">
            <KitRow label="Варианты">
              <KitBtn variant="primary">Primary</KitBtn>
              <KitBtn variant="gradient">Gradient Pro</KitBtn>
              <KitBtn variant="secondary">Secondary</KitBtn>
              <KitBtn variant="outline">Outline</KitBtn>
              <KitBtn variant="ghost">Ghost</KitBtn>
              <KitBtn variant="destructive">Destructive</KitBtn>
              <KitBtn variant="link">Link →</KitBtn>
            </KitRow>
            <KitRow label="Размеры">
              <KitBtn size="xs">XS</KitBtn>
              <KitBtn size="sm">SM</KitBtn>
              <KitBtn size="md">MD</KitBtn>
              <KitBtn size="lg">LG</KitBtn>
              <KitBtn size="xl">XL</KitBtn>
            </KitRow>
            <KitRow label="С иконками">
              <KitBtn variant="primary"><Plus className="h-4 w-4" /> Добавить</KitBtn>
              <KitBtn variant="secondary"><Filter className="h-4 w-4" /> Фильтр</KitBtn>
              <KitBtn variant="outline">Далее <ArrowRight className="h-4 w-4" /></KitBtn>
              <KitBtn variant="destructive"><Trash2 className="h-4 w-4" /> Удалить</KitBtn>
            </KitRow>
            <KitRow label="Состояния">
              <KitBtn variant="primary">Нормальная</KitBtn>
              <KitBtn variant="primary" disabled>Disabled</KitBtn>
              <KitBtn variant="primary"><Loader2 className="h-4 w-4 animate-spin" /> Loading</KitBtn>
            </KitRow>
            <KitRow label="Иконочные">
              <button className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Heart className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary border hover:bg-accent transition-colors">
                <Bell className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <button className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all hover:scale-105">
                <Plus className="h-4 w-4" />
              </button>
            </KitRow>
          </div>
        </KitSection>

        {/* 4. ПОЛЯ ВВОДА */}
        <KitSection title="4. Поля ввода (Inputs)" subtitle="Текст, поиск, пароль">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Обычный Input</label>
                <Input placeholder="Введите имя" value={kitInput} onChange={setKitInput} />
                <p className="text-[11px] text-muted-foreground">Подсказка под полем</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">С иконкой слева</label>
                <Input placeholder="email@example.com" type="email" leftIcon={<Mail className="h-4 w-4" />} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Пароль</label>
                <Input placeholder="••••••••" type={showPassword ? "text" : "password"} value={kitPassword} onChange={setKitPassword} leftIcon={<Lock className="h-4 w-4" />}
                  rightSlot={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Поиск</label>
                <Input placeholder="Поиск…" type="search" leftIcon={<Search className="h-4 w-4" />}
                  rightSlot={<kbd className="text-[10px] font-mono bg-muted border px-1.5 py-0.5 rounded">⌘K</kbd>} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-destructive">С ошибкой</label>
                <Input value="invalid@" readOnly error />
                <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Неверный формат</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Disabled</label>
                <Input value="Нельзя редактировать" disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Textarea</label>
              <textarea rows={3} placeholder="Расскажите подробнее…" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 resize-none" />
            </div>
          </div>
        </KitSection>

        {/* 5. ПЕРЕКЛЮЧАТЕЛИ */}
        <KitSection title="5. Переключатели" subtitle="Toggle, Checkbox, Radio">
          <div className="rounded-2xl border bg-card p-6 space-y-6">
            <KitRow label="Toggle Switch">
              <div className="flex items-center gap-2"><Toggle checked={kitSwitch} onChange={setKitSwitch} /><span className="text-sm">{kitSwitch ? "Включён" : "Выключен"}</span></div>
              <div className="flex items-center gap-2"><Toggle checked={kitSwitch2} onChange={setKitSwitch2} size="sm" /><span className="text-xs">Small</span></div>
              <div className="flex items-center gap-2"><Toggle checked={false} onChange={() => {}} disabled /><span className="text-sm text-muted-foreground">Disabled</span></div>
            </KitRow>
            <KitRow label="Checkbox">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={kitCheckbox} onChange={setKitCheckbox} /><span className="text-sm">Согласен с условиями</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={kitCheckbox2} onChange={setKitCheckbox2} /><span className="text-sm">Подписка на рассылку</span></label>
            </KitRow>
            <KitRow label="Radio Group">
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2">
                {[{v:"plan-free",label:"Free",desc:"$0 / мес"},{v:"plan-pro",label:"Pro",desc:"$9 / мес"},{v:"plan-team",label:"Team",desc:"$29 / мес"}].map(p => (
                  <button key={p.v} type="button" onClick={() => setKitRadio(p.v)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${kitRadio === p.v ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-accent border-border"}`}>
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${kitRadio === p.v ? "border-primary" : "border-muted-foreground/40"}`}>
                      {kitRadio === p.v && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div><div className="text-sm font-semibold">{p.label}</div><div className="text-[11px] text-muted-foreground">{p.desc}</div></div>
                  </button>
                ))}
              </div>
            </KitRow>
          </div>
        </KitSection>

        {/* 6. СЛАЙДЕР */}
        <KitSection title="6. Слайдер" subtitle="Range Slider">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><label className="text-xs font-semibold">Громкость</label><span className="text-xs font-bold text-primary">{kitSlider}%</span></div>
              <RangeSlider min={0} max={100} value={kitSlider} onChange={setKitSlider} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Disabled</label>
              <RangeSlider min={0} max={100} value={30} onChange={() => {}} disabled />
            </div>
          </div>
        </KitSection>

        {/* 7. БЕЙДЖИ */}
        <KitSection title="7. Бейджи (Badges)" subtitle="Статусы и метки">
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <KitRow label="Варианты">
              <KitBadge color="gray">Default</KitBadge><KitBadge color="primary">Primary</KitBadge><KitBadge color="success">Success</KitBadge>
              <KitBadge color="warning">Warning</KitBadge><KitBadge color="danger">Error</KitBadge><KitBadge color="info">Info</KitBadge>
            </KitRow>
            <KitRow label="С индикатором">
              <KitBadge color="success" dot>Online</KitBadge><KitBadge color="warning" dot>Away</KitBadge>
              <KitBadge color="danger" dot pulse>Recording</KitBadge><KitBadge color="gray" dot>Offline</KitBadge>
            </KitRow>
            <KitRow label="С иконками">
              <KitBadge color="success"><CheckCircle2 className="h-3 w-3" /> Опубликовано</KitBadge>
              <KitBadge color="primary"><Star className="h-3 w-3" /> Pro</KitBadge>
              <KitBadge color="info"><Clock className="h-3 w-3" /> В очереди</KitBadge>
            </KitRow>
          </div>
        </KitSection>

        {/* 8. ALERTS */}
        <KitSection title="8. Уведомления (Alerts)" subtitle="Системные сообщения">
          <div className="space-y-3">
            <KitAlert type="info" title="Информация" message="Микрофон будет работать в фоне, пока вкладка открыта." />
            <KitAlert type="success" title="Успешно сохранено" message="Запись добавлена в избранное." />
            <KitAlert type="warning" title="Внимание" message="Приближение к лимиту: осталось 2 записи." />
            <KitAlert type="error" title="Ошибка доступа к микрофону" message="Проверьте разрешения браузера." />
          </div>
        </KitSection>

        {/* 9. АВАТАРЫ */}
        <KitSection title="9. Аватары (Avatars)">
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <KitRow label="Размеры">
              <Avatar size="xs" /><Avatar size="sm" /><Avatar size="md" /><Avatar size="lg" /><Avatar size="xl" />
            </KitRow>
            <KitRow label="С индикатором статуса">
              <Avatar size="md" status="online" /><Avatar size="md" status="away" /><Avatar size="md" status="offline" />
            </KitRow>
            <KitRow label="Группа">
              <div className="flex -space-x-2">
                <Avatar size="md" /><Avatar size="md" /><Avatar size="md" />
                <div className="h-10 w-10 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[11px] font-bold text-muted-foreground">+12</div>
              </div>
            </KitRow>
          </div>
        </KitSection>

        {/* 10. ПРОГРЕСС */}
        <KitSection title="10. Прогресс" subtitle="Загрузка, спиннеры">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span>Загрузка файлов</span><span className="font-semibold">67%</span></div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: "67%" }} /></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span>Градиентный</span><span className="font-semibold">82%</span></div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-gradient-to-r from-primary via-pink-500 to-orange-500 rounded-full" style={{ width: "82%" }} /></div>
            </div>
            <KitRow label="Спиннеры">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </KitRow>
          </div>
        </KitSection>

        {/* 11. КАРТОЧКИ */}
        <KitSection title="11. Карточки (Cards)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Volume2 className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-sm font-bold">Простая карточка</h3>
                  <p className="text-xs text-muted-foreground">Hover для теней</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Используется как контейнер для информации.</p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-pink-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <KitBadge color="primary">Pro</KitBadge>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-1">Акцентная карточка</h3>
              <p className="text-xs text-muted-foreground">Для важных CTA и анонсов</p>
            </div>
          </div>
        </KitSection>

        {/* 12. ЗАПИСЬ (ClipRow) */}
        <KitSection title="12. Запись (ClipRow)" subtitle="Главный компонент приложения">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <DemoClipRow time="15:47:12" duration="3,2 с" comment="Малыш сопит" favorite />
            <div className="border-t"><DemoClipRow time="15:46:04" duration="1,8 с" comment="" favorite={false} playing /></div>
          </div>
        </KitSection>

        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground">
          Echo Baby · Design System v2.0 · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}

/* ======================== Компоненты для демо ======================== */

function DemoClipRow({ time, duration, comment, favorite, playing }: any) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${playing ? "bg-primary/5" : ""}`}>
      <button className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr] gap-x-3 items-center">
        <div className="flex flex-col">
          <span className="text-sm font-bold tabular-nums">{time}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{duration}</span>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex h-6 items-center gap-[1px]">
            {[20,30,15,10,25,40,35,15,10,45,80,95,100,85,65,45,30,20,40,75,90,85,70,50,30,15,10,25,60,95,100,90,80,65,45,25,10,15,30,65,85,100,95,80,55,35,20,10,15,20,40,70,90,100,90,70,45,25,15,30,55,80,95,100,85,60,35,20,15,25].map((h, i) => (
              <span key={i} className={`flex-1 rounded-full ${playing && i < 30 ? "bg-primary" : playing ? "bg-primary/30" : "bg-muted-foreground/25"}`} style={{ height: `${Math.max(12, h)}%` }} />
            ))}
          </div>
          <input type="text" defaultValue={comment} placeholder="Комментарий…" className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50" />
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button className={`h-8 w-8 flex items-center justify-center rounded-lg ${favorite ? "text-primary" : "text-muted-foreground hover:bg-accent"}`}>
          <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
        </button>
        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"><Download className="h-4 w-4" /></button>
        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", leftIcon, rightSlot, error, disabled, readOnly }: any) {
  const padLeft = leftIcon ? "pl-9" : "pl-3";
  const padRight = rightSlot ? "pr-10" : "pr-3";
  const borderCls = error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20";
  const bgCls = error ? "bg-destructive/5" : "bg-background";
  return (
    <div className="relative">
      {leftIcon && <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${error ? "text-destructive" : "text-muted-foreground"}`}>{leftIcon}</div>}
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
        <div className="absolute top-0 left-0 h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ appearance: "none" }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-background border-2 border-primary shadow-md pointer-events-none" style={{ left: `${pct}%` }} />
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

function KitSection({ title, subtitle, children }: any) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b pb-2">
        <div><h2 className="text-lg font-bold tracking-tight">{title}</h2>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  );
}

function KitRow({ label, children }: any) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function KitBtn({ variant = "primary", size = "md", children, disabled }: any) {
  const sizes: any = { xs: "h-7 px-2 text-xs rounded-md gap-1", sm: "h-8 px-3 text-xs rounded-lg gap-1.5", md: "h-10 px-4 text-sm rounded-xl gap-2", lg: "h-12 px-6 text-base rounded-xl gap-2", xl: "h-14 px-8 text-base rounded-2xl gap-2.5" };
  const variants: any = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
    gradient: "bg-gradient-to-br from-primary via-primary to-pink-500 text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/50 ring-1 ring-white/20 ring-inset",
    secondary: "bg-secondary text-foreground hover:bg-accent border",
    outline: "border bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    link: "text-primary hover:underline underline-offset-4 h-auto p-0",
  };
  return <button disabled={disabled} className={`inline-flex items-center justify-center font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}

function KitBadge({ color = "gray", children, dot, pulse }: any) {
  const colors: any = {
    gray: "bg-secondary text-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };
  const dotColors: any = { gray: "bg-muted-foreground", primary: "bg-primary", success: "bg-emerald-500", warning: "bg-orange-500", danger: "bg-destructive", info: "bg-blue-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors[color]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[color]} ${pulse ? "animate-pulse" : ""}`} />}
      {children}
    </span>
  );
}

function KitAlert({ type, title, message }: any) {
  const styles: any = {
    info: { cls: "border-blue-500/30 bg-blue-500/5", icon: <Info className="h-5 w-5 text-blue-500" /> },
    success: { cls: "border-emerald-500/30 bg-emerald-500/5", icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
    warning: { cls: "border-orange-500/30 bg-orange-500/5", icon: <AlertTriangle className="h-5 w-5 text-orange-500" /> },
    error: { cls: "border-destructive/30 bg-destructive/5", icon: <AlertCircle className="h-5 w-5 text-destructive" /> },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${s.cls}`}>
      <div className="shrink-0">{s.icon}</div>
      <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-foreground">{title}</div><div className="text-xs text-muted-foreground mt-0.5">{message}</div></div>
      <button className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}

function ColorSwatch({ name, cls, code }: any) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className={`h-16 w-full rounded-lg ${cls}`} />
      <div><div className="text-xs font-bold">{name}</div><div className="text-[10px] font-mono text-muted-foreground">{code}</div></div>
    </div>
  );
}

function Avatar({ size = "md", status }: any) {
  const sizes: any = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base", xl: "h-20 w-20 text-lg" };
  const dots: any = { xs: "h-1.5 w-1.5", sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3", xl: "h-4 w-4" };
  const statusColors: any = { online: "bg-emerald-500", away: "bg-orange-500", offline: "bg-muted-foreground" };
  return (
    <div className="relative inline-block">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary to-pink-500 border-2 border-background flex items-center justify-center font-bold text-white shadow-sm`}>EB</div>
      {status && <div className={`absolute bottom-0 right-0 ${dots[size]} rounded-full ${statusColors[status]} ring-2 ring-background`} />}
    </div>
  );
}
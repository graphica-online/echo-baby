export const PREBUFFER_MS = 2000;
export const MAX_CLIP_MS = 30000;
export const MIN_CLIP_MS = 400;
export const REARM_MS = 700;
export const PLAYBACK_REARM_MS = 1500;
export const WAVE_BARS = 80;
export const BUFFER_SIZE = 4096;

/**
 * Кодирует Float32Array в WAV (PCM 16bit)
 * Используем свой кодировщик, а не MediaRecorder — webm не играет в iOS Safari
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Вычисляет 80 пиков для мини-волны клипа
 * Квадратный корень + нормировка — тихие звуки видны лучше
 */
export function computePeaks(samples: Float32Array, bars: number = WAVE_BARS): number[] {
  const block = Math.max(1, Math.floor(samples.length / bars));
  const peaks: number[] = [];
  let max = 0;

  for (let b = 0; b < bars; b++) {
    const start = b * block;
    if (start >= samples.length) {
      peaks.push(0);
      continue;
    }
    let peak = 0;
    const end = Math.min(samples.length, start + block);
    for (let i = start; i < end; i++) {
      const a = Math.abs(samples[i]);
      if (a > peak) peak = a;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }

  if (max === 0) return peaks.map(() => 0);
  return peaks.map((p) => Math.min(1, Math.sqrt(p / max)));
}

/**
 * Форматирование времени клипа
 */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Форматирование длительности
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return (ms / 1000).toFixed(1).replace(".", ",") + " с";
}

/**
 * Группировка даты для вкладки "Избранное"
 * Возвращает "17 февраля 2025 · сегодня" / "вчера"
 */
export function formatDateGroup(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const clipDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const dateStr = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (clipDay.getTime() === today.getTime()) return `${dateStr} · сегодня`;
  if (clipDay.getTime() === yesterday.getTime()) return `${dateStr} · вчера`;
  return dateStr;
}

/**
 * Генерирует имя файла для скачивания
 */
export function clipFileName(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `echobaby-${hh}-${mm}-${ss}.wav`;
}
export type Clip = {
  id: string;
  blob: Blob;
  url: string;           // ObjectURL, создаётся при загрузке
  createdAt: number;     // timestamp
  durationMs: number;
  peaks: number[];       // 80 пиков для волны
  favorite: boolean;
  comment: string;
};

export type AppStatus = "idle" | "listening" | "recording" | "playing";

export type AppSettings = {
  palette: string;             // id палитры
  visualizer: string;          // id визуализатора
  sensitivity: number;         // 1-30%
  silenceMs: number;           // 300-3000
  maxClips: number;            // лимит клипов
  autoplay: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  palette: "violet",
  visualizer: "bars",
  sensitivity: 8,
  silenceMs: 1000,
  maxClips: 100,
  autoplay: true,
};
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Clip, AppSettings } from "@/types/clip";
import { DEFAULT_SETTINGS } from "@/types/clip";
import * as db from "@/lib/clip-storage";

export function useClipStorage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // 1. Инициализация: Загрузка настроек и клипов из базы данных
  useEffect(() => {
    async function initStorage() {
      try {
        // Загружаем настройки по одной или оставляем дефолт
        const savedPalette = await db.loadSetting<string>("palette");
        const savedVisualizer = await db.loadSetting<string>("visualizer");
        const savedSensitivity = await db.loadSetting<number>("sensitivity");
        const savedSilenceMs = await db.loadSetting<number>("silenceMs");
        const savedMaxClips = await db.loadSetting<number>("maxClips");
        const savedAutoplay = await db.loadSetting<boolean>("autoplay");

        setSettings({
          palette: savedPalette ?? DEFAULT_SETTINGS.palette,
          visualizer: savedVisualizer ?? DEFAULT_SETTINGS.visualizer,
          sensitivity: savedSensitivity ?? DEFAULT_SETTINGS.sensitivity,
          silenceMs: savedSilenceMs ?? DEFAULT_SETTINGS.silenceMs,
          maxClips: savedMaxClips ?? DEFAULT_SETTINGS.maxClips,
          autoplay: savedAutoplay ?? DEFAULT_SETTINGS.autoplay,
        });

        // Загружаем все аудиоклипы
        const loadedClips = await db.loadAllClips();
        setClips(loadedClips);
      } catch (err) {
        console.error("Failed to initialize storage:", err);
      } finally {
        setLoading(false);
      }
    }

    initStorage();
  }, []);

  // 2. Добавление новой аудиозаписи с умным вытеснением по лимиту
  const addClip = useCallback(async (newClip: Clip) => {
    setClips((prev) => {
      let next = [newClip, ...prev];

      // Если превысили установленный пользователем лимит
      if (next.length > settings.maxClips) {
        // Ищем самый старый не-избранный клип для удаления
        const nonFav = next.filter((c) => !c.favorite);
        
        if (nonFav.length > 0) {
          // Самый старый не-избранный находится в конце массива
          const oldestToRemove = nonFav[nonFav.length - 1];
          
          // Удаляем его из IndexedDB и очищаем его URL в браузере (чтобы не текла память)
          db.deleteClip(oldestToRemove.id).catch(console.error);
          URL.revokeObjectURL(oldestToRemove.url);
          
          next = next.filter((c) => c.id !== oldestToRemove.id);
        } else {
          // Если все записи до одной — избранные, то удаляем самую старую избранную
          const oldestFav = next[next.length - 1];
          db.deleteClip(oldestFav.id).catch(console.error);
          URL.revokeObjectURL(oldestFav.url);
          next = next.slice(0, -1);
        }
      }

      // Сохраняем свежий клип в IndexedDB
      db.saveClip(newClip).catch(console.error);

      return next;
    });
  }, [settings.maxClips]);

  // 3. Лайк / Избранное
  const toggleFavorite = useCallback(async (id: string) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updatedFav = !c.favorite;
          db.updateClip(id, { favorite: updatedFav }).catch(console.error);
          return { ...c, favorite: updatedFav };
        }
        return c;
      })
    );
  }, []);

  // 4. Обновление комментария
  const updateComment = useCallback(async (id: string, comment: string) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          db.updateClip(id, { comment }).catch(console.error);
          return { ...c, comment };
        }
        return c;
      })
    );
  }, []);

  // 5. Удаление клипа
  const removeClip = useCallback(async (id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        db.deleteClip(id).catch(console.error);
      }
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  // 6. Очистить всё
  const clearAll = useCallback(async () => {
    clips.forEach((c) => URL.revokeObjectURL(c.url));
    await db.clearAllClips().catch(console.error);
    setClips([]);
  }, [clips]);

  // 7. Обновление настроек с записью в IndexedDB
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      
      // Асинхронно пишем каждое изменившееся свойство в базу
      Object.entries(newSettings).forEach(([key, val]) => {
        db.saveSetting(key, val).catch(console.error);
      });

      return next;
    });
  }, []);

  return {
    clips,
    settings,
    loading,
    addClip,
    toggleFavorite,
    updateComment,
    removeClip,
    clearAll,
    updateSettings,
  };
}
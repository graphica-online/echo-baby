"use client";

import dynamic from "next/dynamic";

// Приведение к "any" отключает проверки типов модуля на сервере
// ssr: false — гарантирует, что тяжелый аудио-клиент рендерится строго в браузере
const EchoBaby = dynamic<any>(
  () => import("@/components/echo-baby") as any,
  { ssr: false }
);

export default function Home() {
  return <EchoBaby />;
}
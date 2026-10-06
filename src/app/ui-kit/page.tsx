"use client";

import dynamic from "next/dynamic";

// Кастуем сам Промис импорта как Promise<any>, 
// сохраняя правильное разрешение .default свойства во время выполнения в браузере.
const EchoBaby = dynamic<any>(
  () => (import("@/components/echo-baby") as Promise<any>).then((mod) => mod.default),
  { ssr: false }
);

export default function Home() {
  return <EchoBaby />;
}
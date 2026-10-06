"use client";

import dynamic from "next/dynamic";

// Используем абсолютный путь "@/components/ui-kit"
const UIKit = dynamic<any>(
  () => (import("@/components/ui-kit") as any).then((m: any) => m.default || m),
  { ssr: false }
);

export default function UIKitPage() {
  return <UIKit />;
}
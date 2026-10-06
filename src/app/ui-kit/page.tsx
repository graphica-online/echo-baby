"use client";

import dynamic from "next/dynamic";

const UIKit = dynamic(() => import("@/components/ui-kit"), {
  ssr: false,
});

export default function UIKitPage() {
  return <UIKit />;
}
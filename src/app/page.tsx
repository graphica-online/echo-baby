"use client";

import dynamic from "next/dynamic";

const EchoBaby = dynamic(() => import("@/components/echo-baby"), {
  ssr: false,
});

export default function Home() {
  return <EchoBaby />;
}
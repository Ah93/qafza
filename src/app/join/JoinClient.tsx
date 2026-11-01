"use client";

import { useSearchParams } from "next/navigation";
import { JoinFlow } from "@/components/student/JoinFlow";

export function JoinClient() {
  const code = useSearchParams().get("code") ?? "";
  return <JoinFlow initialCode={code} />;
}

"use client";

import type { Lesson } from "@/lib/lesson";
import { useFlow } from "../teacher/FlowProvider";
import { useStudent } from "./StudentProvider";

/** where a play screen gets its lesson: the built-in demo, the teacher's own preview, or the one entered by code */
export type PlayVariant = "demo" | "preview" | "joined";

export function usePlayLesson(variant: PlayVariant = "joined"): Lesson {
  const { lesson, sample } = useFlow();
  const { joined } = useStudent();
  if (variant === "demo") return sample;
  if (variant === "preview") return lesson;
  return joined?.lesson ?? sample;
}

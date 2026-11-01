import {
  BarChart3,
  CircleDot,
  Copy,
  Ellipsis,
  MessagesSquare,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import type { ModeId } from "@/lib/lesson";

export const MODE_ICONS: Record<ModeId, LucideIcon> = {
  slides: Presentation,
  infographic: BarChart3,
  diagram: CircleDot,
  timeline: Ellipsis,
  cards: Copy,
  dialogue: MessagesSquare,
};

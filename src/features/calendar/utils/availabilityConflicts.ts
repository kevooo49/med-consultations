import { parseISO } from "date-fns";
import type { Consultation, AvailabilityRule } from "../types";
import { isSlotInAvailability } from "./calendarMath";

export function consultationConflictsWithAvailability(
  consultation: Consultation,
  availabilityRules: AvailabilityRule[]
): boolean {
  const start = parseISO(consultation.start);
  const minutesFromStart = start.getHours() * 60 + start.getMinutes();

  return !isSlotInAvailability(start, minutesFromStart, availabilityRules);
}

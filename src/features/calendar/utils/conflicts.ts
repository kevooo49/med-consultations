import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import type { Consultation, Absence } from "../types";

export function consultationConflictsWithAbsence(
  consultation: Consultation,
  absence: Absence
): boolean {
  const visitDay = parseISO(consultation.start);

  return isWithinInterval(visitDay, {
    start: startOfDay(parseISO(absence.from)),
    end: endOfDay(parseISO(absence.to)),
  });
}

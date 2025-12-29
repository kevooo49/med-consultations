import {
  addDays,
  differenceInMinutes,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parse,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import type { AvailabilityRule, Absence, Consultation } from "../types";

export const SLOT_MINUTES = 30;
export const DEFAULT_VISIBLE_HOURS = 6;

/* =======================
   DATA / CZAS
======================= */

export function getWeekStart(d: Date) {
  // start tygodnia: poniedziałek
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function getDaysOfWeek(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function timeLabel(d: Date) {
  return format(d, "HH:mm");
}

export function dayHeaderLabel(d: Date) {
  return format(d, "EEE dd.MM");
}

export function clampToDay(d: Date) {
  const s = startOfDay(d);
  const e = endOfDay(d);
  return { s, e };
}

export function minutesFromTop(dayStart: Date, t: Date) {
  return differenceInMinutes(t, dayStart);
}

export function slotsBetween(start: Date, end: Date) {
  const mins = differenceInMinutes(end, start);
  return Math.ceil(mins / SLOT_MINUTES);
}

/* =======================
   TERAZ / PRZESZŁOŚĆ
======================= */

export function isPastEvent(end: Date, now: Date) {
  return isBefore(end, now);
}

export function isNowWithin(day: Date, now: Date) {
  return (
    isSameDay(day, now) &&
    isAfter(now, startOfDay(day)) &&
    isBefore(now, endOfDay(day))
  );
}

/* =======================
   DOSTĘPNOŚĆ LEKARZA
======================= */

export function isSlotInAvailability(
  day: Date,
  slotMinutesFromStart: number,
  availabilityRules: AvailabilityRule[]
): boolean {
  // brak dostępności = lekarz nie przyjmuje
  if (availabilityRules.length === 0) return false;

  return availabilityRules.some(rule => {
    /* -------- JEDNORAZOWA -------- */
    if (rule.type === "single") {
      if (!rule.date) return false;

      const ruleDay = parse(rule.date, "yyyy-MM-dd", new Date());
      if (!isSameDay(ruleDay, day)) return false;

      return isSlotInTimeRanges(slotMinutesFromStart, rule.timeRanges);
    }

    /* -------- CYKLICZNA -------- */
    if (rule.type === "recurring") {
      if (!rule.from || !rule.to || !rule.weekdays) return false;

      const inDateRange = isWithinInterval(day, {
        start: parseISO(rule.from),
        end: parseISO(rule.to),
      });

      if (!inDateRange) return false;

      const weekday = day.getDay(); // 0–6 (Nd–Sb)
      if (!rule.weekdays.includes(weekday)) return false;

      return isSlotInTimeRanges(slotMinutesFromStart, rule.timeRanges);
    }

    return false;
  });
}

/* =======================
   HELPERY
======================= */

function isSlotInTimeRanges(
  slotMinutesFromStart: number,
  timeRanges: { start: string; end: string }[]
): boolean {
  return timeRanges.some(range => {
    const [sh, sm] = range.start.split(":").map(Number);
    const [eh, em] = range.end.split(":").map(Number);

    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    return (
      slotMinutesFromStart >= startMin &&
      slotMinutesFromStart < endMin
    );
  });
}

export function isDayAbsent(day: Date, absences: Absence[]): boolean {
  const dayStart = startOfDay(day);

  return absences.some(a =>
    isWithinInterval(dayStart, {
      start: startOfDay(parseISO(a.from)),
      end: endOfDay(parseISO(a.to)),
    })
  );
}

export function consultationConflictsWithAbsence(
  consultation: Consultation,
  absence: Absence
): boolean {
  const start = parseISO(consultation.start);
  const end = parseISO(consultation.end);

  return isWithinInterval(start, {
    start: parseISO(absence.from),
    end: parseISO(absence.to),
  }) || isWithinInterval(end, {
    start: parseISO(absence.from),
    end: parseISO(absence.to),
  });
}
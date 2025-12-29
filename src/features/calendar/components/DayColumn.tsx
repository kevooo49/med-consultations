import { isSameDay, parseISO } from "date-fns";
import { useRef, useState } from "react";
import type { AvailabilityRule, Consultation, Absence } from "../types";
import { EventBlock } from "./EventBlock";
import { SelectionBlock } from "./SelectionBlock";
import clsx from "clsx";
import { BookingModal } from "./BookingModal";
import { isSlotInAvailability, isDayAbsent } from "../utils/calendarMath";


type Props = {
  day: Date;
  totalSlots: number;
  consultations: Consultation[];
  now: Date;
  onAddConsultation: (c: Consultation) => void;
  onCancelConsultation: (id: string) => void;
  availabilityRules: AvailabilityRule[];
  absences: Absence[];
};

export function DayColumn({
  day,
  totalSlots,
  consultations,
  now,
  onAddConsultation,
  onCancelConsultation,
  availabilityRules,
  absences
}: Props) {
  const isToday = isSameDay(day, now);
  const colRef = useRef<HTMLDivElement>(null);

  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRange, setModalRange] = useState<{ start: number; end: number } | null>(null);

  
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEvents = consultations.filter(c =>
    isSameDay(parseISO(c.start), day)
  );

  const dayAbsent = isDayAbsent(day, absences);

  console.log(
    "DayColumn",
    day.toISOString().slice(0, 10),
    "absences:",
    absences,
    "dayAbsent:",
    dayAbsent
  );


  // ❗ slot pod myszą
  function getSlotFromMouse(e: React.MouseEvent) {
    if (!colRef.current) return null;

    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = Math.floor(y / 60);

    if (slot < 0 || slot >= totalSlots) return null;
    return slot;
  }

  function isSlotFree(slot: number) {
    const slotStartMin = slot * 30;
    const slotEndMin = slotStartMin + 30;

    return !dayEvents.some(ev => {
      const start = parseISO(ev.start);
      const end = parseISO(ev.end);

      const evStart = start.getHours() * 60 + start.getMinutes();
      const evEnd = end.getHours() * 60 + end.getMinutes();

      return slotStartMin < evEnd && slotEndMin > evStart;
    });
  }

  function handleMouseDown(e: React.MouseEvent) {

    if (dayAbsent) return;

    const slot = getSlotFromMouse(e);
    if (slot === null) return;

    if (!isSlotFree(slot)) return;

    const minutesFromStart = slot * 30;

    const available = isSlotInAvailability(
      day,
      minutesFromStart,
      availabilityRules
    );

    if (!available) return;

    setSelectionStart(slot);
    setSelectionEnd(slot);
    setIsDragging(true);
  }


  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || selectionStart === null) return;

    const slot = getSlotFromMouse(e);
    if (slot === null) return;
    if (!isSlotFree(slot)) return;

    setSelectionEnd(slot);
  }

  function handleMouseUp() {
    if (!isDragging) return;

    setIsDragging(false);

    if (selectionStart !== null && selectionEnd !== null) {
      const from = Math.min(selectionStart, selectionEnd);
      const to = Math.max(selectionStart, selectionEnd);

      setModalRange({ start: from, end: to });
      setModalOpen(true);

    }
  }

  return (
    <div
      ref={colRef}
      className={clsx("dayCol", isToday && "todayCol", dayAbsent && "slotAbsent")}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* siatka */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const minutesFromStart = i * 30;

        // const available = isSlotInAvailability(
        //   day,
        //   minutesFromStart,
        //   availabilityRules
        // );
        const unavailable =
          dayAbsent || !isSlotInAvailability(day, minutesFromStart, availabilityRules);

        if (i === 0) {
          console.log(
            "First slot classes:",
            `slotBlock ${unavailable ? "slotUnavailable" : ""} ${dayAbsent ? "slotAbsent" : ""}`
          );
        }

        return (
          <div
            key={i}
            className={`slotBlock ${unavailable ? "slotUnavailable" : ""} ${dayAbsent ? "slotAbsent" : ""}`}
            style={{ top: minutesFromStart * 2 }}
          />
        );
      })}

      {/* wizyty */}
      {dayEvents.map(c => (
        <EventBlock
          key={c.id}
          consultation={c}
          dayStart={dayStart}
          now={now}
          onCancel={() => onCancelConsultation(c.id)}
        />
      ))}

      {/* zaznaczenie */}
      {selectionStart !== null && selectionEnd !== null && (
        <SelectionBlock
          startSlot={selectionStart}
          endSlot={selectionEnd}
        />
      )}

      {modalOpen && modalRange && (
        <BookingModal
          day={day}
          startSlot={modalRange.start}
          endSlot={modalRange.end}
          onClose={() => {
            setModalOpen(false);
            setModalRange(null);
            setSelectionStart(null);
            setSelectionEnd(null);
          }}
          onSave={(data) => {
            onAddConsultation(data);
            setModalOpen(false);
            setModalRange(null);
            setSelectionStart(null);
            setSelectionEnd(null);
          }}
        />
      )}

    </div>
  );
}

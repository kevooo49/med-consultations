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
  onAddConsultation?: (c: Consultation) => void;
  onCancelConsultation: (id: string) => void;
  availabilityRules: AvailabilityRule[];
  absences: Absence[];
  currentUserId?: string; 
};

export function DayColumn({
  day,
  totalSlots,
  consultations,
  now,
  onAddConsultation,
  onCancelConsultation,
  availabilityRules,
  absences,
  currentUserId
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

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // oblicza nad którym slotem jest myszka
  function getSlotFromMouse(e: React.MouseEvent) {
    if (!colRef.current) return null;
    const rect = colRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = Math.floor(y / 60);
    if (slot < 0 || slot >= totalSlots) return null;
    return slot;
  }

  // Sprawdza, czy slot zaczyna się w przeszłości względem 'now'
  function isSlotInPast(slot: number) {
    const slotTime = new Date(day);
    slotTime.setHours(0, 0, 0, 0);
    slotTime.setMinutes(slot * 30);

    return slotTime < now;
  }

  // sprawdza czy slot jest wolny i blokuje kolizje
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

  // sprawdza czy zakres slotów jest wolny
  function isRangeFree(start: number, end: number) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);

    for (let i = low; i <= high; i++) {
      if (!isSlotFree(i)) return false;
    }
    return true;
  }
  // sprawdza czy zakres slotów jest dostępny w grafiku lekarza
  function isRangeAvailable(start: number, end: number) {
    const low = Math.min(start, end);
    const high = Math.max(start, end);

    for (let i = low; i <= high; i++) {
      const minutesFromStart = i * 30;
      if (!isSlotInAvailability(day, minutesFromStart, availabilityRules)) {
        return false;
      }
    }
    return true;
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!onAddConsultation) return;
    if (dayAbsent) return;

    const slot = getSlotFromMouse(e);
    if (slot === null) return;
    if (!isSlotFree(slot)) return;
    if (isSlotInPast(slot)) return;
    const minutesFromStart = slot * 30;
    const available = isSlotInAvailability(day, minutesFromStart, availabilityRules);
    if (!available) return;

    setSelectionStart(slot);
    setSelectionEnd(slot);
    setIsDragging(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || selectionStart === null) return;
    const slot = getSlotFromMouse(e);
    if (slot === null) return;
    
    // Jeśli użytkownik próbuje przeciągnąć myszkę nad zajętym slotem,
    // ignorujemy ten ruch (niepozwalamy "przeskoczyć" wizyty).
    if (!isRangeFree(selectionStart, slot)) {
        return; 
    }

    if (!isRangeAvailable(selectionStart, slot)) return;

    if (isSlotInPast(slot)) return;
    
    setSelectionEnd(slot);
  }

  function handleMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);    
    if (selectionStart !== null && selectionEnd !== null) {
      // sprawdzamy jeszcze raz cały zakres przed otwarciem modala
      if (!isRangeFree(selectionStart, selectionEnd)) {
          alert("Wybrany zakres koliduje z inną wizytą!");
          setSelectionStart(null);
          setSelectionEnd(null);
          return;
      }
      // sprawdzamy dostępność w grafiku lekarza
      if (!isRangeAvailable(selectionStart, selectionEnd)) {
          alert("Lekarz nie przyjmuje w tych godzinach!");
          setSelectionStart(null);
          setSelectionEnd(null);
          return;
      }
      // sprawdzamy czy początek zakresu nie jest w przeszłości
      const startSlot = Math.min(selectionStart, selectionEnd);
      if (isSlotInPast(startSlot)) {
          alert("Nie można rezerwować wizyt w przeszłości!");
          setSelectionStart(null); setSelectionEnd(null); return;
      }

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
      style={{ cursor: onAddConsultation ? "pointer" : "default", position: 'relative' }}
    >
      {/* SIATKA TŁA */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const minutesFromStart = i * 30;
        const unavailable = dayAbsent || !isSlotInAvailability(day, minutesFromStart, availabilityRules);
        return (
          <div
            key={i}
            className={`slotBlock ${unavailable ? "slotUnavailable" : ""} ${dayAbsent ? "slotAbsent" : ""}`}
            style={{ top: minutesFromStart * 2 }}
          />
        );
      })}

      {/* WIZYTY */}
      {dayEvents.map(c => {
        const isMine = currentUserId && (c as any).patientId === currentUserId;
        const isDoctorOwner = currentUserId && c.doctorId === currentUserId;
        const isForeign = !isMine && !isDoctorOwner;

        return (
          <EventBlock
            key={c.id}
            consultation={c}
            dayStart={dayStart}
            now={now}
            onCancel={isForeign ? undefined : () => onCancelConsultation(c.id)}
            isForeign={isForeign} 
          />
        );
      })}

      {/* SELEKCJA */}
      {selectionStart !== null && selectionEnd !== null && (
        <SelectionBlock startSlot={selectionStart} endSlot={selectionEnd} />
      )}
      
      {isToday && (
        <div 
          className="nowIndicator" 
          style={{ top: nowMinutes * 2 }}
          title={`Teraz: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
        >
          <div className="nowDot" />
          <div className="nowLine" />
        </div>
      )}

      {/* MODAL */}
      {modalOpen && modalRange && onAddConsultation && (
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
      
      <style>{`
        .nowIndicator {
          position: absolute;
          left: 0;
          right: 0;
          z-index: 50; /* Musi być nad siatką, ale pod modalem */
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .nowDot {
          width: 7px;
          height: 7px;
          background: #ea4335;
          border-radius: 50%;
          position: absolute;
          left: -5px; /* Wystaje lekko poza kolumnę */
          box-shadow: 0 0 4px rgba(0,0,0,0.2);
        }
        .nowLine {
          height: 1px;
          background: #ea4335;
          width: 100%;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
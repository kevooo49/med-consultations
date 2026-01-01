import { isSameDay, parseISO } from "date-fns";
import type { Consultation, AvailabilityRule, Absence } from "../types";
import { dayHeaderLabel, getDaysOfWeek, SLOT_MINUTES } from "../utils/calendarMath";
import { TimeGutter } from "./TimeGutter";
import { DayColumn } from "./DayColumn";
import { NowIndicator } from "./NowIndicator";
import { useEffect, useRef, useState } from "react";
import { AvailabilityModal } from "./AvailabilityModal";
import { AvailabilityList } from "./AvailabilityList";
import { AbsenceList } from "./AbsenceList";
import { AbsenceModal } from "./AbsenceModal";

type Props = {
  weekStart: Date;
  consultations: Consultation[];
  now: Date;
  visibleHours: number;
  onAddConsultation?: (c: Consultation) => void;
  onCancelConsultation: (id: string) => void;
  availabilityRules: AvailabilityRule[];
  onAddAvailability?: (rule: AvailabilityRule) => void;
  onRemoveAvailability?: (id: string) => void;
  onAddAbsence?: (a: Absence) => void;
  onRemoveAbsence?: (id: string) => void;
  absences: Absence[];
  currentUserId?: string;
};

export function CalendarWeek({
  weekStart,
  consultations,
  now,
  visibleHours,
  onAddConsultation,
  onCancelConsultation,
  availabilityRules,
  onAddAvailability,
  onRemoveAvailability,
  onAddAbsence,
  onRemoveAbsence,
  absences,
  currentUserId
}: Props) {
  const days = getDaysOfWeek(weekStart);
  const FULL_DAY_HOURS = 24;
  const fullDaySlots = (FULL_DAY_HOURS * 60) / SLOT_MINUTES;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    let targetMinutes: number;

    if (hour >= 7 && hour <= 19) {
      targetMinutes = hour * 60 + minute - visibleHours * 30;
    } else {
      targetMinutes = 7 * 60;
    }
    const scrollTop = Math.max(0, targetMinutes * 2);
    scrollRef.current.scrollTop = scrollTop;
  }, []);

  // Logika czy pokazywać pasek narzędzi (tylko jeśli mamy jakieś akcje)
  const showToolbar = onAddAvailability || onAddAbsence;

  return (
    <div className="calendarGrid">
      
      {/* 1. PASEK NARZĘDZI (Jeśli lekarz) */}
      {showToolbar && (
        <div className="calendarToolbar">
          {onAddAvailability && (
            <button className="btn" onClick={() => setAvailabilityModalOpen(true)}>
              Dodaj dostępność
            </button>
          )}
          {onAddAbsence && (
            <button className="btn secondary" onClick={() => setAbsenceModalOpen(true)}>
              Dodaj absencję
            </button>
          )}
        </div>
      )}

      {/* 2. NAGŁÓWKI DNI */}
      <div className="weekHeaderRow">
        <div /> {/* Pusty róg nad czasem */}
        {days.map(d => {
          const count = consultations.filter(c => {
            const s = parseISO(c.start);
            return isSameDay(s, d) && c.status === "booked";
          }).length;
          const isToday = isSameDay(d, now);

          return (
            <div key={d.toISOString()} className={`dayHeader ${isToday ? "todayHeader" : ""}`}>
              <div>{dayHeaderLabel(d)}</div>
              <div className="count">Wizyt: {count}</div>
            </div>
          );
        })}
      </div>

      {/* 3. OBSZAR SCROLLOWANY */}
      <div className="calendarScroll" ref={scrollRef}>
        <TimeGutter totalSlots={fullDaySlots} />

        <div className="bodyRow" style={{ height: fullDaySlots * 60 }}>
          {days.map(d => (
            <DayColumn
              key={d.toISOString()}
              day={d}
              totalSlots={fullDaySlots}
              consultations={consultations}
              now={now}
              availabilityRules={availabilityRules}
              onAddConsultation={onAddConsultation}
              onCancelConsultation={onCancelConsultation}
              absences={absences}
              currentUserId={currentUserId}
            />
          ))}
          <NowIndicator weekDays={days} totalSlots={fullDaySlots} now={now} />
        </div>
      </div>

      {/* MODALE */}
      {availabilityModalOpen && onAddAvailability && (
        <AvailabilityModal
          absences={absences}
          onSave={(rule) => {
            onAddAvailability(rule);
            setAvailabilityModalOpen(false);
          }}
          onClose={() => setAvailabilityModalOpen(false)}
        />
      )}

      {absenceModalOpen && onAddAbsence && (
        <AbsenceModal
          onSave={(a) => {
            onAddAbsence(a);
            setAbsenceModalOpen(false);
          }}
          onClose={() => setAbsenceModalOpen(false)}
        />
      )}

      {/* LISTY EDYCJI (LEKARZ) */}
      {(onRemoveAvailability || onRemoveAbsence) && (
        <div className="listsGrid">
          {onRemoveAvailability && (
            <div className="listColumn">
              <h3>Twoje reguły dostępności</h3>
              <AvailabilityList
                rules={availabilityRules}
                onRemove={onRemoveAvailability}
              />
            </div>
          )}
          {onRemoveAbsence && (
            <div className="listColumn">
              <h3>Zaplanowane nieobecności</h3>
              <AbsenceList
                absences={absences}
                onRemove={onRemoveAbsence}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
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
  
  // Funkcje konsultacji (Pacjent rezerwuje, Lekarz widzi)
  onAddConsultation?: (c: Consultation) => void;
  onCancelConsultation: (id: string) => void;

  // Funkcje dostępności (Tylko lekarz - opcjonalne)
  availabilityRules: AvailabilityRule[];
  onAddAvailability?: (rule: AvailabilityRule) => void;
  onRemoveAvailability?: (id: string) => void;

  // Funkcje absencji (Tylko lekarz - opcjonalne)
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

  // pełna doba (24h)
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
      // centrowanie aktualnego czasu
      targetMinutes = hour * 60 + minute - visibleHours * 30;
    } else {
      // start od 7:00
      targetMinutes = 7 * 60;
    }

    const scrollTop = Math.max(0, targetMinutes * 2);
    scrollRef.current.scrollTop = scrollTop;
  }, []);

  return (
    <div className="calendarGrid">
      {/* Pasek z przyciskami - widoczny, ale przyciski tylko dla Lekarza */}
      <div className="calendarTopBar">
        {/* Tytuł usunąłem, bo masz go już w App.tsx nad komponentem, żeby nie dublować */}
        <div style={{ flex: 1 }}></div> 
        
        {/* Przycisk widoczny TYLKO jeśli przekazano funkcję (Lekarz) */}
        {onAddAvailability && (
          <button
            className="btn"
            onClick={() => setAvailabilityModalOpen(true)}
          >
            Dodaj dostępność
          </button>
        )}
        
        {/* Przycisk widoczny TYLKO jeśli przekazano funkcję (Lekarz) */}
        {onAddAbsence && (
          <button 
            className="btn secondary" 
            onClick={() => setAbsenceModalOpen(true)}
          >
            Dodaj absencję
          </button>
        )}
      </div>

      <div className="weekHeaderRow">
        <div />
        {days.map(d => {
          const count = consultations.filter(c => {
            const s = parseISO(c.start);
            return isSameDay(s, d) && c.status === "booked";
          }).length;

          const isToday = isSameDay(d, now);

          return (
            <div
              key={d.toISOString()}
              className={`dayHeader ${isToday ? "todayHeader" : ""}`}
            >
              <div>{dayHeaderLabel(d)}</div>
              <div className="count">Zarezerwowane: {count}</div>
            </div>
          );
        })}
      </div>

      {/* WSPÓLNY SCROLL */}
      <div className="calendarScroll" ref={scrollRef}>
        <TimeGutter totalSlots={fullDaySlots} />

        <div
          className="bodyRow"
          style={{ height: fullDaySlots * 60 }}
        >
          {days.map(d => (
            <DayColumn
              key={d.toISOString()}
              day={d}
              totalSlots={fullDaySlots}
              consultations={consultations}
              now={now}
              availabilityRules={availabilityRules}
              // Przekazujemy dalej (mogą być undefined - DayColumn musi to obsłużyć)
              onAddConsultation={onAddConsultation} 
              onCancelConsultation={onCancelConsultation}
              absences={absences}
              currentUserId={currentUserId}
            />
          ))}

          <NowIndicator
            weekDays={days}
            totalSlots={fullDaySlots}
            now={now}
          />
        </div>
      </div>

      {/* Modale - renderujemy warunkowo, choć stan i tak steruje widocznością */}
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

      {/* Listy edycji - widoczne tylko jeśli użytkownik ma prawo usuwać (Lekarz) */}
      {(onRemoveAvailability || onRemoveAbsence) && (
        <div className="listsGrid fullWidth">
          {onRemoveAvailability && (
            <div className="listColumn">
              <AvailabilityList
                rules={availabilityRules}
                onRemove={onRemoveAvailability}
              />
            </div>
          )}

          {onRemoveAbsence && (
            <div className="listColumn">
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
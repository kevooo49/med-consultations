import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, subWeeks } from "date-fns";
import { CalendarWeek } from "../features/calendar/components/CalendarWeek";
import { getWeekStart } from "../features/calendar/utils/calendarMath";
import { getConsultationsForDoctor } from "../services/consultationsService";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";
import "../styles/calendar.css";
import { consultationConflictsWithAbsence } from "../features/calendar/utils/conflicts";
import { InfoModal } from "../features/calendar/components/InfoModal";

export default function App() {
  const doctorId = "d1";

  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [now, setNow] = useState<Date>(() => new Date());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  
  const [absences, setAbsences] = useState<Absence[]>([]);

  useEffect(() => {
    getConsultationsForDoctor(doctorId).then(setConsultations);
  }, []);

  function handleAddConsultation(c: Consultation) {
    setConsultations(prev => [...prev, c]);
  }

  function handleCancelConsultation(id: string) {
    setConsultations(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, status: "cancelled" }
          : c
      )
    );
  }


  function handleAddAvailability(rule: AvailabilityRule) {
    setAvailabilityRules(prev => [...prev, rule]);
  }

  function handleRemoveAvailability(id: string) {
    setAvailabilityRules(prev => prev.filter(r => r.id !== id));
  }

  function handleAddAbsence(absence: Absence) {
    console.log("HANDLE ADD ABSENCE FIRED", absence);
    let cancelledAny = false;

    setConsultations(prev =>
      prev.map(c => {
        if (
          c.status === "booked" &&
          consultationConflictsWithAbsence(c, absence)
        ) {
          cancelledAny = true;
          return {
            ...c,
            status: "cancelled",
          };
        }
        return c;
      })
    );

    setAbsences(prev => [...prev, absence]);

    if (cancelledAny) {
      setInfoMessage(
        "Niektóre konsultacje kolidowały z absencją i zostały odwołane. Pacjenci zostali powiadomieni."
      );
    }
  }



  function handleRemoveAbsence(id: string) {
    setAbsences(prev => prev.filter(a => a.id !== id));
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="calendar">
      <div className="calendarTopBar">
        <div className="title">
          Kalendarz lekarza — tydzień {format(weekStart, "dd.MM")}–{format(addWeeks(weekStart, 1), "dd.MM")}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setAnchorDate(d => subWeeks(d, 1))}>◀ Poprzedni tydzień</button>
          <button className="btn" onClick={() => setAnchorDate(new Date())}>Dziś</button>
          <button className="btn" onClick={() => setAnchorDate(d => addWeeks(d, 1))}>Następny tydzień ▶</button>
        </div>
      </div>

      {infoMessage && (
        <InfoModal
          message={infoMessage}
          onClose={() => setInfoMessage(null)}
        />
      )}


      <CalendarWeek
        weekStart={weekStart}
        consultations={consultations}
        now={now}
        visibleHours={6}
        onAddConsultation={handleAddConsultation}
        onCancelConsultation={handleCancelConsultation}
        availabilityRules={availabilityRules}
        onAddAvailability={handleAddAvailability}
        onRemoveAvailability={handleRemoveAvailability}
        onAddAbsence={handleAddAbsence}
        onRemoveAbsence={handleRemoveAbsence}
        absences={absences}
        
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, subWeeks } from "date-fns";
import { CalendarWeek } from "../features/calendar/components/CalendarWeek";
import { getWeekStart } from "../features/calendar/utils/calendarMath";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";
import "../styles/calendar.css";
import { consultationConflictsWithAbsence } from "../features/calendar/utils/conflicts";
import { InfoModal } from "../features/calendar/components/InfoModal";
import { Cart } from "../features/calendar/components/Cart";
import { consultationConflictsWithAvailability } from "../features/calendar/utils/availabilityConflicts";


/* === SERVICES === */
import {
  getConsultationsForDoctor,
  addConsultation,
  cancelConsultation,
  saveConsultations,
} from "../services/consultationsService";

import {
  getAvailability,
  addAvailability,
} from "../services/availabilityService";

import {
  getAbsences,
  addAbsence,
  removeAbsence,
} from "../services/absencesService";

export default function App() {
  const doctorId = "d1";

  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [now, setNow] = useState<Date>(() => new Date());

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  const cartItems = consultations.filter(c => c.status === "draft");

  /* =====================
     INITIAL LOAD
  ===================== */
  useEffect(() => {
    getConsultationsForDoctor(doctorId).then(setConsultations);
    getAvailability().then(setAvailabilityRules);
    getAbsences().then(setAbsences);
  }, []);

  /* =====================
     CONSULTATIONS
  ===================== */
  async function handleAddConsultation(c: Consultation) {
    await addConsultation(c);
    setConsultations(prev => [...prev, c]);
  }

  async function handleCancelConsultation(id: string) {
    await cancelConsultation(id);
    setConsultations(prev => prev.filter(c => c.id !== id));
  }

  /* =====================
     AVAILABILITY
  ===================== */
  async function handleAddAvailability(rule: AvailabilityRule) {
    await addAvailability(rule);
    setAvailabilityRules(prev => [...prev, rule]);
  }

  async function handleRemoveAvailability(id: string) {
    const updatedAvailability = availabilityRules.filter(r => r.id !== id);

    let cancelledAny = false;

    const updatedConsultations = consultations.map(c => {
      if (
        c.status === "booked" &&
        consultationConflictsWithAvailability(c, updatedAvailability)
      ) {
        cancelledAny = true;
        return {
          ...c,
          status: "cancelled" as Consultation["status"],
        };
      }
      return c;
    });

    setAvailabilityRules(updatedAvailability);
    setConsultations(updatedConsultations);

    if (cancelledAny) {
      setInfoMessage(
        "Niektóre konsultacje kolidowały z usuwaną dostępnością i zostały odwołane. Pacjenci zostali powiadomieni."
      );
    }
  }


  /* =====================
     ABSENCES
  ===================== */
  async function handleAddAbsence(absence: Absence) {
    let cancelledAny = false;

    const updatedConsultations = consultations.map(c => {
      if (
        c.status === "booked" &&
        consultationConflictsWithAbsence(c, absence)
      ) {
        cancelledAny = true;
        return { ...c, status: "cancelled" as Consultation["status"] };
      }
      return c;
    });

    if (cancelledAny) {
      setInfoMessage(
        "Niektóre konsultacje kolidowały z absencją i zostały odwołane. Pacjenci zostali powiadomieni."
      );
    }

    await saveConsultations(updatedConsultations);
    await addAbsence(absence);

    setConsultations(updatedConsultations);
    setAbsences(prev => [...prev, absence]);
  }

  async function handleRemoveAbsence(id: string) {
    await removeAbsence(id);
    setAbsences(prev => prev.filter(a => a.id !== id));
  }

  /* =====================
     CART
  ===================== */
  async function handleRemoveFromCart(id: string) {
    const updated = consultations.filter(c => c.id !== id);
    await saveConsultations(updated);
    setConsultations(updated);
  }

  async function handleCheckout() {
    const updated = consultations.map(c =>
      c.status === "draft" ? { ...c, status: "booked" as Consultation["status"]} : c
    );

    await saveConsultations(updated);
    setConsultations(updated);
  }

  /* =====================
     CLOCK
  ===================== */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="calendar">
      <div className="calendarTopBar">
        <div className="title">
          Kalendarz lekarza — tydzień{" "}
          {format(weekStart, "dd.MM")}–{format(addWeeks(weekStart, 1), "dd.MM")}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setAnchorDate(d => subWeeks(d, 1))}>
            ◀ Poprzedni tydzień
          </button>
          <button className="btn" onClick={() => setAnchorDate(new Date())}>
            Dziś
          </button>
          <button className="btn" onClick={() => setAnchorDate(d => addWeeks(d, 1))}>
            Następny tydzień ▶
          </button>
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

      <Cart
        items={cartItems}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

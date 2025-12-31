import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, subWeeks } from "date-fns";
import { CalendarWeek } from "../features/calendar/components/CalendarWeek";
import { getWeekStart } from "../features/calendar/utils/calendarMath";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";
import "../styles/calendar.css";
import { consultationConflictsWithAbsence } from "../features/calendar/utils/conflicts";
import { consultationConflictsWithAvailability } from "../features/calendar/utils/availabilityConflicts";
import { InfoModal } from "../features/calendar/components/InfoModal";
import { Cart } from "../features/calendar/components/Cart";

/* === BACKENDS === */
import type { BackendType } from "../services/backend";
import { firebaseBackend } from "../services/firebaseBackend";
import { localBackend } from "../services/localBackend";

export default function App() {
  const doctorId = "d1";

  /* =====================
     STATE
  ===================== */
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [now, setNow] = useState<Date>(() => new Date());

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [backendType, setBackendType] = useState<BackendType>("firebase");

  const backend = backendType === "firebase"
    ? firebaseBackend
    : localBackend;

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  /* =====================
     DERIVED DATA
  ===================== */
  const doctorConsultations = useMemo(
    () => consultations.filter(c => c.doctorId === doctorId),
    [consultations, doctorId]
  );

  const cartItems = doctorConsultations.filter(c => c.status === "draft");

  /* =====================
     LISTENERS (DYNAMIC BACKEND)
  ===================== */
  useEffect(() => {
    const u1 = backend.listenConsultations(setConsultations);
    const u2 = backend.listenAvailability(setAvailabilityRules);
    const u3 = backend.listenAbsences(setAbsences);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [backendType]);

  /* =====================
     CONSULTATIONS
  ===================== */
  async function handleAddConsultation(c: Consultation) {
    await backend.addConsultation(c);
  }

  async function handleCancelConsultation(id: string) {
    await backend.removeConsultation(id);
  }

  /* =====================
     AVAILABILITY
  ===================== */
  async function handleAddAvailability(rule: AvailabilityRule) {
    await backend.addAvailability(rule);
  }

  async function handleRemoveAvailability(id: string) {
    const updatedAvailability = availabilityRules.filter(r => r.id !== id);

    let cancelledAny = false;

    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" &&
      consultationConflictsWithAvailability(c, updatedAvailability)
    );

    if (conflicts.length > 0) {
      cancelledAny = true;
      await Promise.all(
        conflicts.map(c =>
          backend.updateConsultation(c.id, { status: "cancelled" })
        )
      );
    }

    await backend.removeAvailability(id);

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

    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" &&
      consultationConflictsWithAbsence(c, absence)
    );

    if (conflicts.length > 0) {
      cancelledAny = true;
      await Promise.all(
        conflicts.map(c =>
          backend.updateConsultation(c.id, { status: "cancelled" })
        )
      );
    }

    await backend.addAbsence(absence);

    if (cancelledAny) {
      setInfoMessage(
        "Niektóre konsultacje kolidowały z absencją i zostały odwołane. Pacjenci zostali powiadomieni."
      );
    }
  }

  async function handleRemoveAbsence(id: string) {
    await backend.removeAbsence(id);
  }

  /* =====================
     CART
  ===================== */
  async function handleRemoveFromCart(id: string) {
    await backend.removeConsultation(id);
  }

  async function handleCheckout() {
    await Promise.all(
      cartItems.map(c =>
        backend.updateConsultation(c.id, { status: "booked" })
      )
    );
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

          {/* 🔁 BACKEND SWITCH */}
          <select
            value={backendType}
            onChange={e => setBackendType(e.target.value as BackendType)}
          >
            <option value="firebase">Firebase</option>
            <option value="local">Local JSON</option>
          </select>
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
        consultations={doctorConsultations}
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

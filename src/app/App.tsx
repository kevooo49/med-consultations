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

/* === AUTH === */
import { useAuth } from "../context/AuthContext";
import { AuthForm } from "../features/calendar/components/AuthForm";
import { UserList } from "../features/admin/UserList";

/* === REVIEWS === */
import { ReviewsSection } from "../features/reviews/ReviewsSection";

import { PersistenceSettings } from "../features/admin/PersistenceSettings";

export default function App() {
  const { user, logout } = useAuth();
  
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

  // Domyślny backend to Firebase. Switch widoczny tylko dla admina.
  const [backendType, setBackendType] = useState<BackendType>(() => {
    return (localStorage.getItem("backendType") as BackendType) || "firebase";
  });

  const handleBackendChange = (newType: BackendType) => {
    setBackendType(newType);
    localStorage.setItem("backendType", newType);
  };

  const backend = backendType === "firebase"
    ? firebaseBackend
    : localBackend;

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  /* =====================
      HELPERS - ROLE
  ===================== */
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isAdmin = user?.role === 'admin';

  /* =====================
      DERIVED DATA
  ===================== */
  const doctorConsultations = useMemo(
    () => consultations.filter(c => c.doctorId === doctorId),
    [consultations, doctorId]
  );

  // Koszyk widzi tylko pacjent
  const cartItems = useMemo(() => 
    doctorConsultations.filter(c => c.status === "draft" && (c as any).patientId === user?.uid),
    [doctorConsultations, user]);

  /* =====================
      LISTENERS
  ===================== */
  useEffect(() => {
    if (!user) return;
    if (isAdmin) return; // Admin nie potrzebuje ładować kalendarza

    const u1 = backend.listenConsultations(setConsultations);
    const u2 = backend.listenAvailability(setAvailabilityRules);
    const u3 = backend.listenAbsences(setAbsences);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [backendType, backend, user, isAdmin]);

  /* =====================
      HANDLERS
  ===================== */
  
  async function handleAddAvailability(rule: AvailabilityRule) {
    // Podwójne zabezpieczenie: UI nie powinno pozwolić, ale backend też sprawdza
    if (!isDoctor) return; 
    await backend.addAvailability(rule);
  }

  async function handleRemoveAvailability(id: string) {
    if (!isDoctor) return;

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
    if (cancelledAny) setInfoMessage("Usunięto dostępność (odwołano kolidujące wizyty).");
  }

  async function handleAddAbsence(absence: Absence) {
    if (!isDoctor) return;

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
    if (cancelledAny) setInfoMessage("Dodano absencję (odwołano kolidujące wizyty).");
  }

  async function handleRemoveAbsence(id: string) {
    if (!isDoctor) return;
    await backend.removeAbsence(id);
  }

  async function handleAddConsultation(c: Consultation) {
    // Pacjent rezerwuje (dodaje draft), Lekarz raczej nie rezerwuje sobie sam
    const consultationWithPatientId = {
      ...c,
      patientId: user?.uid,
      patient: {
        fullName: user?.email || "Nieznany",
        age: 30,
        gender: "Other"
      }
    };
    
    await backend.addConsultation(consultationWithPatientId as Consultation);
  }

  async function handleCancelConsultation(id: string) {
    const targetConsultation = consultations.find(c => c.id === id);

    if (!targetConsultation) return;

    if (isPatient) {
      const ownerId = (targetConsultation as any).patientId;
      
      if (ownerId !== user?.uid) {
        alert("Nie możesz anulować wizyty innego pacjenta.");
        return;
      }
    }

    await backend.removeConsultation(id);
  }

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

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* =====================
      RENDER
  ===================== */

  // 1. GOŚĆ (Niezalogowany) - Zgodnie z PDF widzi listę lekarzy (u nas AuthForm, bo mamy 1 lekarza)
  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h1>Portal Medyczny</h1>
        <p>Zaloguj się, aby umówić wizytę u lek. Jana Kowalskiego</p>
        <AuthForm />
      </div>
    );
  }

  // 2. ADMIN - Widok zarządzania
// === WIDOK ADMINA ===
  if (isAdmin) {
    return (
      <div className="calendar" style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
        <UserBar user={user} logout={logout} />
        <div style={{ padding: 40, overflowY: "auto" }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
             <h1>Panel Administratora</h1>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <span>Tryb bazy:</span>
               <select 
                 value={backendType} 
                 onChange={e => setBackendType(e.target.value as BackendType)}
                 style={{ padding: 5 }}
               >
                  <option value="firebase">Firebase</option>
                  <option value="local">Local JSON</option>
               </select>
             </div>
          </div>
          
          <div style={{ background: "#f9f9f9", border: "1px solid #ddd", borderRadius: 8 }}>
            <UserList />
          </div>
          <PersistenceSettings />
        </div>
      </div>
    );
  }

  // 3. LEKARZ i PACJENT - Widok Kalendarza
  return (
    <div className="calendar">
      <UserBar user={user} logout={logout} />

      <div className="calendarTopBar">
        <div className="title">
          {isDoctor ? "Mój Grafik" : "Rezerwacja Wizyty"} — tydzień{" "}
          {format(weekStart, "dd.MM")}–{format(addWeeks(weekStart, 1), "dd.MM")}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setAnchorDate(d => subWeeks(d, 1))}>◀</button>
          <button className="btn" onClick={() => setAnchorDate(new Date())}>Dziś</button>
          <button className="btn" onClick={() => setAnchorDate(d => addWeeks(d, 1))}>▶</button>
        </div>
        {/* Usunąłem Backend Switch dla Lekarza i Pacjenta */}
      </div>

      {infoMessage && (
        <InfoModal
          message={infoMessage}
          onClose={() => setInfoMessage(null)}
        />
      )}

      {/* Kluczowa zmiana: Przekazujemy handlery jako undefined, jeśli rola nie pozwala.
         Jeśli Twój CalendarWeek sprawdza "if (onAddAvailability)", to ukryje przyciski.
         Jeśli nie - będziemy musieli edytować CalendarWeek.tsx.
      */}
      <CalendarWeek
        weekStart={weekStart}
        consultations={doctorConsultations}
        now={now}
        visibleHours={6}
        
        // Rezerwacja: Tylko pacjent (draft)
        onAddConsultation={isPatient ? handleAddConsultation : undefined}
        // Anulowanie: Pacjent i Lekarz
        onCancelConsultation={handleCancelConsultation}
        
        // Dostępność: Tylko Lekarz
        availabilityRules={availabilityRules} // Pacjent potrzebuje widzieć reguły, żeby wiedzieć kiedy wolne, ale nie listę edycji
        onAddAvailability={isDoctor ? handleAddAvailability : undefined}
        onRemoveAvailability={isDoctor ? handleRemoveAvailability : undefined}
        
        // Absencje: Tylko Lekarz
        absences={absences}
        onAddAbsence={isDoctor ? handleAddAbsence : undefined}
        onRemoveAbsence={isDoctor ? handleRemoveAbsence : undefined}
        
        // Opcjonalnie: Przekażmy rolę, jeśli komponent to obsługuje
        // role={user.role} 


        currentUserId={user?.uid}
      />

      {/* Koszyk: Tylko dla Pacjenta (Zadanie 4: "Moj koszyk") */}
      {isPatient && (
        <Cart
          items={cartItems}
          onRemove={handleRemoveFromCart}
          onCheckout={handleCheckout}
        />
      )}

      <div style={{ marginTop: 40, borderTop: "2px solid #eee", width: "100%", gridColumn: "1 / -1" }}>
        <ReviewsSection doctorId={doctorId} />
      </div>
    </div>
  );
}

function UserBar({ user, logout }: { user: any, logout: () => void }) {
  const roleLabels: Record<string, string> = { patient: 'Pacjent', doctor: 'Lekarz', admin: 'Admin' };
  const roleColors: Record<string, string> = { patient: '#f0f2f5', doctor: '#e3f2fd', admin: '#ffebee' };
  
  return (
    <div style={{ 
      position: 'relative',
      zIndex: 9999,
      background: roleColors[user.role] || '#fff', 
      padding: "10px 20px", 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      borderBottom: "1px solid #ddd",
      marginBottom: 10
    }}>
      <div style={{ fontSize: "0.9rem", color: "#333" }}>
        Zalogowany: <strong>{user.email}</strong> 
        <span style={{ marginLeft: 10, padding: "2px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 4, fontWeight: "bold" }}>
          {roleLabels[user.role] || user.role}
        </span>
      </div>
      <button onClick={logout} className="btn" style={{ backgroundColor: "#ff6b6b", border: "none", padding: "6px 12px", fontSize: "0.85rem", cursor: 'pointer' }}>
        Wyloguj
      </button>
    </div>
  );
}
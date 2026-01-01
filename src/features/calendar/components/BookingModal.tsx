import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { Consultation } from "../types";
import { calculatePrice } from "../utils/pricing";
import { Link as LinkIcon } from "lucide-react"; // Dodano ikonę

export type ConsultationType =
  | "first_visit"
  | "control_visit"
  | "chronic_disease"
  | "prescription"
  | "online_consultation";

const CONSULTATION_TYPES: { value: ConsultationType; label: string }[] = [
  { value: "first_visit", label: "Pierwsza wizyta" },
  { value: "control_visit", label: "Wizyta kontrolna" },
  { value: "chronic_disease", label: "Choroba przewlekła" },
  { value: "prescription", label: "Recepta / kontynuacja leków" },
  { value: "online_consultation", label: "Konsultacja online (ogólna)" },
];

type Gender = "M" | "F" | "Other";

type Props = {
  day: Date;
  startSlot: number;
  endSlot: number;
  onClose: () => void;
  onSave: (c: Consultation) => void;
};

export function BookingModal({ day, startSlot, endSlot, onClose, onSave }: Props) {
  const [type, setType] = useState<ConsultationType | "">("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [age, setAge] = useState<string>(""); 
  const [notes, setNotes] = useState("");
  
  // ZMIANA: Zamiast plików, przechowujemy link (string)
  const [docLink, setDocLink] = useState("");
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fromMinutes = Math.min(startSlot, endSlot) * 30;
  const toMinutes = (Math.max(startSlot, endSlot) + 1) * 30;

  const from = useMemo(() => {
    const d = new Date(day);
    d.setHours(0, fromMinutes, 0, 0);
    return d;
  }, [day, fromMinutes]);

  const to = useMemo(() => {
    const d = new Date(day);
    d.setHours(0, toMinutes, 0, 0);
    return d;
  }, [day, toMinutes]);

  const isDirty =
    type !== "" ||
    fullName.trim() !== "" ||
    gender !== "" ||
    age !== "" ||
    notes.trim() !== "" ||
    docLink.trim() !== ""; // ZMIANA

  function handleCloseRequest() {
    if (!isDirty) {
      onClose();
      return;
    }
    const ok = window.confirm(
      "Masz niezapisane dane. Czy na pewno chcesz anulować rezerwację wizyty?"
    );
    if (ok) onClose();
  }

  const durationMin = toMinutes - fromMinutes;

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!type) {
      newErrors.type = "Wybierz typ konsultacji";
    }

    if (!fullName.trim()) {
      newErrors.fullName = "Imię i nazwisko jest wymagane";
    }

    if (!gender) {
      newErrors.gender = "Wybierz płeć pacjenta";
    }

    const ageNumber = Number(age);
    if (!age || Number.isNaN(ageNumber)) {
      newErrors.age = "Podaj wiek pacjenta";
    } else if (ageNumber < 0 || ageNumber > 120) {
      newErrors.age = "Wiek musi być w zakresie 0–120";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    const ok = validate();
    if (!ok) return;

    const safeType = type as Consultation["type"];
    const safeGender = gender as NonNullable<Consultation["patient"]>["gender"];
    const price = calculatePrice(durationMin);

    // ZMIANA: Tworzenie tablicy dokumentów z linku
    const documents = docLink 
      ? [{ name: "Dokumentacja zewnętrzna (Link)", url: docLink }] 
      : [];

    const consultation: Consultation = {
      id: crypto.randomUUID(),
      doctorId: "d1", // To zostanie nadpisane w App.tsx dynamicznym ID
      start: from.toISOString(),
      end: to.toISOString(),
      type: safeType,
      status: "draft",
      price,
      patient: {
        fullName, // To pole musi zostać zachowane!
        gender: safeGender,
        age: Number(age),
      },
      notes,
      documents, // Zapisujemy link
    };

    onSave(consultation);
  }

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <strong>
              {format(day, "dd.MM.yyyy")} • {format(from, "HH:mm")}–{format(to, "HH:mm")}{" "}
              <span style={{ opacity: 0.7, fontWeight: 500 }}>({durationMin} min)</span>
            </strong>
          </div>
          <button className="modalClose" onClick={handleCloseRequest} aria-label="Zamknij">
            ✕
          </button>
        </div>

        <div className="modalBody">
          <label>
            Typ konsultacji
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="">— wybierz —</option>
              {CONSULTATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && <span className="error">{errors.type}</span>}
          </label>

          <label>
            Imię i nazwisko pacjenta
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="np. Jan Kowalski"
            />
            {errors.fullName && <span className="error">{errors.fullName}</span>}
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Płeć pacjenta
              <select value={gender} onChange={(e) => setGender(e.target.value as any)}>
                <option value="">— wybierz —</option>
                <option value="M">Mężczyzna</option>
                <option value="F">Kobieta</option>
                <option value="Other">Inna / nie podaję</option>
              </select>
              {errors.gender && <span className="error">{errors.gender}</span>}
            </label>

            <label>
              Wiek pacjenta
              <input
                type="number"
                min={0}
                max={130}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="np. 34"
              />
              {errors.age && <span className="error">{errors.age}</span>}
            </label>
          </div>

          <label>
            Informacje dla lekarza
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. objawy, historia, pytania do lekarza..."
            />
          </label>

          {/* ZMIANA: Pole na link zamiast pliku */}
          <label>
            Dokumenty (Link do chmury)
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <LinkIcon size={18} style={{color: '#6b7280'}}/>
               <input
                 type="text"
                 value={docLink}
                 onChange={(e) => setDocLink(e.target.value)}
                 placeholder="Wklej link (np. Google Drive, Dropbox)..."
                 style={{ flex: 1 }}
               />
            </div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
               Lekarz otrzyma dostęp do tego linku w szczegółach wizyty.
            </div>
          </label>
        </div>

        <div className="modalFooter">
          <button className="btn secondary" onClick={handleCloseRequest}>
            Zamknij
          </button>
          <button className="btn primary" onClick={handleSubmit}>
            Dodaj do koszyka
          </button>
        </div>
      </div>
    </div>
  );
}
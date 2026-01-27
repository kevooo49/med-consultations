import { useState } from "react";
import type { AvailabilityRule, TimeRange, Absence } from "../types";
import { isWithinInterval, parseISO } from "date-fns";

type Props = {
  onSave: (rule: AvailabilityRule) => void;
  onClose: () => void;
  absences: Absence[];
};

const WEEKDAYS = [
  { label: "Nd", value: 0 },
  { label: "Pn", value: 1 },
  { label: "Wt", value: 2 },
  { label: "Śr", value: 3 },
  { label: "Cz", value: 4 },
  { label: "Pt", value: 5 },
  { label: "Sb", value: 6 },
];

function availabilityConflictsWithAbsence(
  mode: "single" | "recurring",
  data: { date?: string; fromDate?: string; toDate?: string },
  absences: Absence[]
): boolean {
  if (mode === "single" && data.date) {
    const day = parseISO(data.date);
    return absences.some(a =>
      isWithinInterval(day, { start: parseISO(a.from), end: parseISO(a.to) })
    );
  }
  if (mode === "recurring" && data.fromDate && data.toDate) {
    const from = parseISO(data.fromDate);
    const to = parseISO(data.toDate);
    return absences.some(a =>
      isWithinInterval(parseISO(a.from), { start: from, end: to }) ||
      isWithinInterval(parseISO(a.to), { start: from, end: to })
    );
  }
  return false;
}

export function AvailabilityModal({ onSave, onClose, absences }: Props) {
  const [mode, setMode] = useState<"single" | "recurring">("single");

  // Stan formularza
  const [date, setDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
    { start: "08:00", end: "12:30" },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Helpery UI
  function toggleWeekday(day: number) {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }
  function updateTimeRange(index: number, field: "start" | "end", value: string) {
    setTimeRanges(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }
  function addTimeRange() { setTimeRanges(prev => [...prev, { start: "16:00", end: "21:30" }]); }
  function removeTimeRange(index: number) { setTimeRanges(prev => prev.filter((_, i) => i !== index)); }

  function handleSave() {
    setError(null);
    if (timeRanges.length === 0) return;

    // Walidacja konfliktów
    const conflicts = availabilityConflictsWithAbsence(mode, { date, fromDate, toDate }, absences);
    if (conflicts) {
      setError("Dostępność koliduje z zaplanowaną absencją");
      return;
    }

    // Budujemy Payload
    let payload: any = {
      id: "",
      doctorId: "",
      timeRanges,   // Tablica godzin
      type: mode    // "single" lub "recurring"
    };

    if (mode === "single") {
      if (!date) return;
      payload.date = date; 
      // W trybie single nie dodajemy from/to/weekdays
    } else {
      if (!fromDate || !toDate || weekdays.length === 0) return;
      payload.from = fromDate;
      payload.to = toDate;
      payload.weekdays = weekdays;
      // W trybie recurring nie dodajemy date
    }

    // SANITYZACJA
    const cleanPayload = JSON.parse(JSON.stringify(payload));

    console.log("Wysyłam dostępność:", cleanPayload);
    onSave(cleanPayload);
    onClose();
  }

  return (
    <div className="modalBackdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <strong>Dodaj dostępność</strong>
          <button className="modalClose" onClick={onClose}>✕</button>
        </div>

        <div className="modalBody">
          {error && <div className="error">{error}</div>}
          
          <label>
            Typ dostępności
            <select value={mode} onChange={e => setMode(e.target.value as any)}>
              <option value="single">Jednorazowa</option>
              <option value="recurring">Cykliczna</option>
            </select>
          </label>

          {mode === "single" ? (
            <label>
              Data
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1 }}>
                  Od <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </label>
                <label style={{ flex: 1 }}>
                  Do <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </label>
              </div>
              
              <div style={{ margin: "10px 0" }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Dni tygodnia</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {WEEKDAYS.map(d => (
                    <label key={d.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input 
                        type="checkbox" 
                        checked={weekdays.includes(d.value)} 
                        onChange={() => toggleWeekday(d.value)} 
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 15, borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>Godziny pracy</div>
            {timeRanges.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input type="time" value={r.start} onChange={e => updateTimeRange(i, "start", e.target.value)} />
                <input type="time" value={r.end} onChange={e => updateTimeRange(i, "end", e.target.value)} />
                {timeRanges.length > 1 && <button onClick={() => removeTimeRange(i)}>✕</button>}
              </div>
            ))}
            <button onClick={addTimeRange} style={{ fontSize: "0.8rem" }}>+ Dodaj przedział</button>
          </div>
        </div>

        <div className="modalFooter">
          <button className="btn secondary" onClick={onClose}>Anuluj</button>
          <button className="btn primary" onClick={handleSave}>Zapisz</button>
        </div>
      </div>
    </div>
  );
}
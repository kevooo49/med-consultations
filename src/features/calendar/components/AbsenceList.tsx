import type { Absence } from "../types";

type Props = {
  absences: Absence[];
  onRemove: (id: string) => void;
};

export function AbsenceList({ absences, onRemove }: Props) {
  if (absences.length === 0) {
    return <div style={{ padding: 12, opacity: 0.7 }}>Brak absencji</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <strong>Absencje</strong>

      {absences.map(a => (
        <div key={a.id} style={{ display: "flex", justifyContent: "space-between" }}>
          <div>{a.from} – {a.to}</div>
          <button className="btn secondary" onClick={() => onRemove(a.id)}>
            Usuń
          </button>
        </div>
      ))}
    </div>
  );
}

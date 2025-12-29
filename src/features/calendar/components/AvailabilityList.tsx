import type { AvailabilityRule } from "../types";

type Props = {
  rules: AvailabilityRule[];
  onRemove: (id: string) => void;
};

export function AvailabilityList({ rules, onRemove }: Props) {
  if (rules.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>
        Brak zdefiniowanych dostępności
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Dostępności lekarza
      </div>

      {rules.map(rule => (
        <div
          key={rule.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 0",
            borderBottom: "1px solid #e5e7eb",
            fontSize: 13,
          }}
        >
          <div>{formatRule(rule)}</div>

          <button
            className="btn secondary"
            onClick={() => onRemove(rule.id)}
          >
            Usuń
          </button>
        </div>
      ))}
    </div>
  );
}

function formatRule(rule: AvailabilityRule): string {
  const hours = rule.timeRanges
    .map(r => `${r.start}–${r.end}`)
    .join(", ");

  if (rule.type === "single") {
    return `Jednorazowa: ${rule.date}, ${hours}`;
  }

  const days = rule.weekdays
    ?.map(d => ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"][d])
    .join(" ");

  return `Cykliczna: ${rule.from} – ${rule.to}, ${days}, ${hours}`;
}

import type { AvailabilityRule } from "../types";

type Props = {
  rules: AvailabilityRule[];
  onRemove: (id: string) => void;
};

export function AvailabilityList({ rules, onRemove }: Props) {
  if (!rules || rules.length === 0) {
    return <div style={{ padding: 12, opacity: 0.7 }}>Brak reguł dostępności</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <strong>Twoje reguły</strong>
      {rules.map(rule => (
        <div key={rule.id} style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "8px 0",
          borderBottom: "1px solid #eee",
          fontSize: "0.9rem"
        }}>
          <div>
            {formatRule(rule)}
          </div>
          <button className="btn secondary" onClick={() => onRemove(rule.id)} style={{ marginLeft: 10 }}>
            Usuń
          </button>
        </div>
      ))}
    </div>
  );
}

function formatRule(rule: AvailabilityRule): string {
  // Używamy pustej tablicy, jeśli timeRanges nie istnieje
  const ranges = rule.timeRanges || [];
  const hours = ranges.map(r => `${r.start}-${r.end}`).join(", ");

  if (rule.type === "single") {
    return `📅 ${rule.date || "Brak daty"} (${hours})`;
  } else {
    const daysMap = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
    // weekdays też może być undefined
    const daysStr = (rule.weekdays || []).map(d => daysMap[d]).join(" ");
    return `🔁 ${rule.from || "?"} - ${rule.to || "?"} [${daysStr}] (${hours})`;
  }
}
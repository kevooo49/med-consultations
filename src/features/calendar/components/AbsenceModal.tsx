import { useState } from "react";
import type { Absence } from "../types";

type Props = {
  onSave: (a: Absence) => void;
  onClose: () => void;
};

export function AbsenceModal({ onSave, onClose }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleSave() {
    if (!from || !to) return;

    onSave({
      id: crypto.randomUUID(),
      from,
      to,
    });

    onClose();
  }

  return (
    <div className="modalBackdrop">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <strong>Dodaj absencję</strong>
          <button className="modalClose" onClick={onClose}>✕</button>
        </div>

        <div className="modalBody">
          <label>
            Od
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>

          <label>
            Do
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </label>
        </div>

        <div className="modalFooter">
          <button className="btn secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn primary" onClick={handleSave}>
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title = "Potwierdzenie",
  message,
  confirmLabel = "Tak, odwołaj",
  cancelLabel = "Anuluj",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modalBackdrop">
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <strong>{title}</strong>
        </div>

        <div className="modalBody">
          <p style={{ fontSize: 14, lineHeight: 1.4 }}>{message}</p>
        </div>

        <div className="modalFooter">
          <button className="btn secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
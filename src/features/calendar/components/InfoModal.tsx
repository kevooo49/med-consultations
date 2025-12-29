type Props = {
  message: string;
  onClose: () => void;
};

export function InfoModal({ message, onClose }: Props) {
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <strong>Informacja</strong>
          <button className="modalClose" onClick={onClose}>✕</button>
        </div>

        <div className="modalBody">
          <p>{message}</p>
        </div>

        <div className="modalFooter">
          <button className="btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Onayla', onConfirm, onCancel, busy }) {
  if (!open) {
    return null;
  }
  return (
    <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="modal-card confirm-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted confirm-modal__message">{message}</p>
        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            İptal
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'İşleniyor…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

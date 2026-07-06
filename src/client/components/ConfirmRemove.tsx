interface ConfirmRemoveProps {
  date: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmRemove({ date, onCancel, onConfirm }: ConfirmRemoveProps) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <section className="confirm-panel">
        <h2 id="confirm-title">Remove logged workout?</h2>
        <p>{date} is already counted. Remove it only if that session did not happen.</p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Keep it
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            Remove workout
          </button>
        </div>
      </section>
    </div>
  );
}

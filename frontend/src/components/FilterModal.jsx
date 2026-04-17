export default function FilterModal({ isOpen, onClose, onClear, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal animate-fadeInUp" style={{ maxWidth: '420px', padding: '24px 28px' }}>
        <div className="modal-header" style={{ marginBottom: '20px' }}>
          <h2 className="modal-title" style={{ fontSize: '18px' }}>⚙️ Filters</h2>
          <button className="modal-close btn" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {children}
        </div>

        <div style={{ marginTop: '28px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {onClear && (
            <button className="btn btn-ghost" onClick={onClear} style={{ marginRight: 'auto' }}>
              Clear All
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose} style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            View Results
          </button>
        </div>
      </div>
    </div>
  );
}

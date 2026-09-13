import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div
      className="modal-overlay animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        className="card animate-scaleIn"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: '100%',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          background: 'var(--bg-card)',
          border: isDanger ? '1.5px solid #FCA5A5' : '1.5px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isDanger ? '#FEF2F2' : 'var(--green-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isDanger ? (
                <Trash2 size={20} color="#DC2626" />
              ) : (
                <AlertTriangle size={20} color="var(--color-green)" />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>{title}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SIET Inceptron Hub
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4, borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading} style={{ padding: '8px 18px' }}>
            {cancelText}
          </button>
          <button
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-sm`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', fontWeight: 700 }}
          >
            {isDanger && <Trash2 size={15} />}
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

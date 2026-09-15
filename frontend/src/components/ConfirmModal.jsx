import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  itemName = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  iconType = 'danger',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (iconType === 'danger') {
      return <Trash2 size={24} color="#DC2626" />;
    }
    return <AlertTriangle size={24} color="#D97706" />;
  };

  const getIconBg = () => {
    if (iconType === 'danger') return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(245, 158, 11, 0.1)';
  };

  const getConfirmBtnStyle = () => {
    if (confirmVariant === 'danger') {
      return {
        background: 'linear-gradient(135deg, #DC2626, #EF4444)',
        color: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
      };
    }
    return {
      background: 'var(--gradient-primary)',
      color: '#FFFFFF',
    };
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 32, 9, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="confirm-modal-card"
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(213, 239, 200, 0.6)',
          position: 'relative',
          animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-faint, #8AAD72)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: getIconBg(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {getIcon()}
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text, #0F2009)', marginBottom: '8px', lineHeight: 1.3 }}>
            {title}
          </h3>

          <p style={{ fontSize: '14px', color: 'var(--color-text-muted, #4A6E37)', lineHeight: 1.5, marginBottom: '24px' }}>
            {itemName ? (
              <>
                Are you sure you want to delete <strong style={{ color: 'var(--color-text, #0F2009)' }}>"{itemName}"</strong>? This action cannot be undone.
              </>
            ) : (
              message
            )}
          </p>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                border: '1px solid var(--border, #D5EFC8)',
                background: 'var(--bg-secondary, #FFFFFF)',
                color: 'var(--color-text, #0F2009)',
              }}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className="btn"
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                border: 'none',
                ...getConfirmBtnStyle(),
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

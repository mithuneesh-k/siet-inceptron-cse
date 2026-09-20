import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Watermelon SplitActions Component
 * Provides a primary action button coupled with a dropdown trigger button for secondary/destructive actions.
 */
export function SplitActions({
  primaryLabel,
  primaryIcon: PrimaryIcon,
  onPrimaryClick,
  primaryVariant = 'primary', // 'primary' | 'secondary' | 'ghost'
  dropdownActions = [], // Array of { label, icon: IconComponent, onClick, destructive?: boolean, hidden?: boolean }
  ariaLabel = 'More management actions',
  className = ''
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Filter out hidden actions
  const visibleActions = dropdownActions.filter(a => !a.hidden);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Color theme mapping
  const primaryBg = isLight ? '#ffffff' : 'var(--bg-card, #0f172a)';
  const primaryBorder = isLight ? '#d7e2d3' : 'var(--border, rgba(132, 204, 22, 0.25))';
  const primaryText = isLight ? '#166534' : '#84cc16';
  const primaryHover = isLight ? '#f0fdf4' : 'rgba(132, 204, 22, 0.12)';

  const menuBg = isLight ? '#ffffff' : '#0f172a';
  const menuBorder = isLight ? '#d7e2d3' : 'rgba(132, 204, 22, 0.25)';
  const menuShadow = isLight ? '0 10px 25px -5px rgba(15, 23, 42, 0.12)' : '0 14px 35px rgba(0, 0, 0, 0.4)';
  const itemText = isLight ? '#111827' : '#f8fafc';
  const itemHover = isLight ? '#f0fdf4' : 'rgba(255, 255, 255, 0.06)';
  const destructiveText = isLight ? '#dc2626' : '#ef4444';
  const destructiveHover = isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)';

  // If no dropdown actions, render simple primary button
  if (visibleActions.length === 0) {
    return (
      <button
        type="button"
        className={`btn btn-${primaryVariant} btn-sm ${className}`}
        onClick={onPrimaryClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'auto', cursor: 'pointer' }}
      >
        {PrimaryIcon && <PrimaryIcon size={14} />}
        <span>{primaryLabel}</span>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`split-actions-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: open ? 9999 : 5,
        borderRadius: 8,
        border: `1px solid ${primaryBorder}`,
        background: primaryBg,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 180ms ease'
      }}
    >
      {/* Primary Action Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          if (onPrimaryClick) onPrimaryClick(e);
        }}
        className="split-action-primary-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          fontSize: 12.5,
          fontWeight: 700,
          color: primaryText,
          background: 'transparent',
          border: 'none',
          borderTopLeftRadius: 7,
          borderBottomLeftRadius: 7,
          cursor: 'pointer',
          outline: 'none',
          transition: 'background-color 180ms ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = primaryHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {PrimaryIcon && <PrimaryIcon size={14} />}
        <span>{primaryLabel}</span>
      </button>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 18,
          background: isLight ? '#d7e2d3' : 'rgba(255, 255, 255, 0.15)',
          flexShrink: 0
        }}
      />

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="split-action-trigger-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px 8px',
          fontSize: 12,
          color: primaryText,
          background: open ? primaryHover : 'transparent',
          border: 'none',
          borderTopRightRadius: 7,
          borderBottomRightRadius: 7,
          cursor: 'pointer',
          outline: 'none',
          transition: 'background-color 180ms ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = primaryHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = open ? primaryHover : 'transparent')}
      >
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="split-actions-dropdown animate-fadeIn"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 160,
            background: menuBg,
            border: `1.5px solid ${menuBorder}`,
            borderRadius: 10,
            boxShadow: menuShadow,
            padding: '4px 0',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          {visibleActions.map((action, idx) => {
            const Icon = action.icon;
            const isDestructive = Boolean(action.destructive);

            return (
              <React.Fragment key={action.label || idx}>
                {isDestructive && idx > 0 && (
                  <div style={{ height: 1, background: isLight ? '#e5e7eb' : 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    if (action.onClick) action.onClick(e);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    fontSize: 12.5,
                    fontWeight: isDestructive ? 700 : 600,
                    color: isDestructive ? destructiveText : itemText,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDestructive ? destructiveHover : itemHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {Icon && <Icon size={14} style={{ color: isDestructive ? destructiveText : (isLight ? '#475569' : '#94a3b8') }} />}
                  <span>{action.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SplitActions;

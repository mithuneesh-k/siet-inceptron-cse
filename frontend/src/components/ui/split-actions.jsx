import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * SplitActions Component with Document Body Portal
 * Guarantees zero clipping from table rows, stacking contexts, or overflow:hidden parents.
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
  const [coords, setCoords] = useState({ top: 0, bottom: 0, right: 0, openUp: false });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter out hidden actions
  const visibleActions = dropdownActions.filter(a => !a.hidden);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 150 && rect.top > 150;

    setCoords({
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      right: window.innerWidth - rect.right,
      openUp
    });
  }, []);

  const handleToggleOpen = (e) => {
    e.stopPropagation();
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  // Color theme mapping
  const primaryBg = isLight ? '#ffffff' : 'var(--bg-card, #0f172a)';
  const primaryBorder = isLight ? '#d7e2d3' : 'var(--border, rgba(132, 204, 22, 0.25))';
  const primaryText = 'var(--color-green)';
  const primaryHover = 'var(--green-50)';

  const menuBg = isLight ? '#ffffff' : 'var(--bg-card, #0f172a)';
  const menuBorder = isLight ? '#d7e2d3' : 'var(--border-strong, rgba(132, 204, 22, 0.35))';
  const menuShadow = isLight 
    ? '0 12px 30px rgba(15, 23, 42, 0.16), 0 4px 10px rgba(15, 23, 42, 0.08)' 
    : '0 16px 40px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.4)';
  const itemText = isLight ? '#111827' : 'var(--color-text, #f8fafc)';
  const itemHover = isLight ? '#f0fdf4' : 'rgba(255, 255, 255, 0.08)';
  const destructiveText = '#ef4444';
  const destructiveHover = isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)';

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
        zIndex: 1,
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
          padding: '6px 13px',
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
        onClick={handleToggleOpen}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="split-action-trigger-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 9px',
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

      {/* Dropdown Menu Portaled Directly to document.body (Immune to table row stacking) */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="split-actions-dropdown animate-fadeIn"
          style={{
            position: 'fixed',
            top: coords.openUp ? 'auto' : `${coords.top}px`,
            bottom: coords.openUp ? `${coords.bottom}px` : 'auto',
            right: `${coords.right}px`,
            minWidth: 175,
            background: menuBg,
            border: `1.5px solid ${menuBorder}`,
            borderRadius: 12,
            boxShadow: menuShadow,
            padding: '5px 0',
            zIndex: 999999,
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {visibleActions.map((action, idx) => {
            const Icon = action.icon;
            const isDestructive = Boolean(action.destructive);

            return (
              <React.Fragment key={action.label || idx}>
                {isDestructive && idx > 0 && (
                  <div style={{ height: 1, background: isLight ? '#e5e7eb' : 'var(--border, rgba(255, 255, 255, 0.08))', margin: '4px 0' }} />
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
                    gap: 9,
                    padding: '9px 15px',
                    fontSize: 13,
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
                  {Icon && <Icon size={15} style={{ color: isDestructive ? destructiveText : (isLight ? '#475569' : 'var(--color-text-muted)') }} />}
                  <span>{action.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export default SplitActions;

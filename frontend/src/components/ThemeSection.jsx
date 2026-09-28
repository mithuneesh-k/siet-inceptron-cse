import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Sun, Moon, Check, RefreshCw } from 'lucide-react';
import './ThemeSection.css';

export default function ThemeSection({ title = "Theme & Appearance Settings" }) {
  const { theme, toggleTheme, colorTheme, setColorTheme, colorThemes } = useTheme();

  const handleReset = () => {
    setColorTheme('green');
  };

  return (
    <div className="theme-section-container card">
      {/* Section Header */}
      <div className="theme-section-header">
        <div className="theme-section-title-wrap">
          <div className="theme-title-icon-box">
            <Palette size={22} className="theme-palette-icon" />
          </div>
          <div>
            <h2 className="theme-section-title">{title}</h2>
            <p className="theme-section-subtitle">Customize your visual interface, colors, and color accents</p>
          </div>
        </div>
        {colorTheme !== 'green' && (
          <button 
            type="button" 
            className="btn btn-ghost btn-sm theme-reset-btn"
            onClick={handleReset}
            title="Reset to default theme"
          >
            <RefreshCw size={14} /> Reset Accent
          </button>
        )}
      </div>

      {/* Mode Selection (Dark / Light) */}
      <div className="theme-mode-block">
        <label className="theme-block-label">Display Mode</label>
        <div className="theme-mode-grid">
          <button
            type="button"
            className={`theme-mode-card ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => theme !== 'dark' && toggleTheme()}
          >
            <div className="theme-mode-icon-wrap dark">
              <Moon size={20} />
            </div>
            <div className="theme-mode-info">
              <div className="theme-mode-title">Obsidian Dark</div>
              <div className="theme-mode-desc">High contrast dark theme for low light</div>
            </div>
            {theme === 'dark' && (
              <div className="theme-active-check">
                <Check size={16} />
              </div>
            )}
          </button>

          <button
            type="button"
            className={`theme-mode-card ${theme === 'light' ? 'active' : ''}`}
            onClick={() => theme !== 'light' && toggleTheme()}
          >
            <div className="theme-mode-icon-wrap light">
              <Sun size={20} />
            </div>
            <div className="theme-mode-info">
              <div className="theme-mode-title">Clean Light</div>
              <div className="theme-mode-desc">Bright and crisp modern light theme</div>
            </div>
            {theme === 'light' && (
              <div className="theme-active-check">
                <Check size={16} />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Accent Color Palette Section */}
      <div className="theme-color-block">
        <div className="theme-block-label-row">
          <label className="theme-block-label">Accent Color Theme</label>
          <span className="theme-selected-badge">
            Current: <strong>{colorThemes.find(c => c.id === colorTheme)?.name || 'Default'}</strong>
          </span>
        </div>

        <div className="theme-color-grid">
          {colorThemes.map((item) => {
            const isSelected = colorTheme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`theme-color-card ${isSelected ? 'active' : ''}`}
                onClick={() => setColorTheme(item.id)}
              >
                {isSelected && (
                  <div className="theme-card-selected-check">
                    <Check size={12} />
                  </div>
                )}
                <div className="theme-dual-swatch-row">
                  <span 
                    className="theme-swatch primary" 
                    style={{ background: item.primaryColor || item.color }}
                  />
                  <span 
                    className="theme-swatch secondary" 
                    style={{ background: item.secondaryColor || '#1e293b' }}
                  />
                </div>
                <div className="theme-color-details">
                  <span className="theme-color-name">{item.name}</span>
                  {item.badge && (
                    <span className={`theme-color-badge badge-${item.id}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

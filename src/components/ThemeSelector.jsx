import React from 'react';
import { AVAILABLE_THEMES } from '../services/storageService';
import { Check, Sparkles, Moon, Sun } from 'lucide-react';

export const ThemeSelector = ({
  currentTheme,
  onChangeTheme,
  layout = 'grid', // 'grid' | 'drawer' | 'compact'
  onSelect
}) => {
  const handleSelect = (themeId) => {
    onChangeTheme(themeId);
    if (onSelect) onSelect(themeId);
  };

  if (layout === 'compact') {
    return (
      <div className="theme-compact-pills">
        {AVAILABLE_THEMES.map((theme) => {
          const isActive = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme.id)}
              className={`theme-pill-btn ${isActive ? 'theme-pill-active' : ''}`}
              title={`${theme.name}: ${theme.subtitle}`}
            >
              <span
                className="theme-pill-swatch"
                style={{
                  background: `linear-gradient(135deg, ${theme.preview.accent}, ${theme.preview.secondary})`
                }}
              />
              <span className="theme-pill-name">{theme.name.split(' ')[0]}</span>
              {isActive && <Check size={12} className="theme-pill-check" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (layout === 'drawer') {
    return (
      <div className="theme-drawer-menu">
        <div className="theme-drawer-header">
          <Sparkles size={14} className="text-accent" />
          <span>Select Theme Accent</span>
        </div>
        <div className="theme-drawer-list">
          {AVAILABLE_THEMES.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme.id)}
                className={`theme-drawer-item ${isActive ? 'theme-drawer-item-active' : ''}`}
              >
                <div className="theme-drawer-item-left">
                  <div
                    className="theme-swatch-circle"
                    style={{
                      backgroundColor: theme.preview.bg,
                      borderColor: theme.preview.border
                    }}
                  >
                    <div
                      className="swatch-inner-dot"
                      style={{
                        background: `linear-gradient(135deg, ${theme.preview.accent}, ${theme.preview.secondary})`
                      }}
                    />
                  </div>
                  <div className="theme-drawer-info">
                    <span className="theme-name">{theme.name}</span>
                    <span className="theme-sub">{theme.subtitle}</span>
                  </div>
                </div>
                <div className="theme-drawer-item-right">
                  {theme.isDark ? (
                    <Moon size={13} className="theme-mode-icon" />
                  ) : (
                    <Sun size={13} className="theme-mode-icon" />
                  )}
                  {isActive && <Check size={15} className="theme-check-active" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default 'grid' layout (Used in Settings Modal)
  return (
    <div className="theme-grid-container">
      {AVAILABLE_THEMES.map((theme) => {
        const isActive = currentTheme === theme.id;
        return (
          <div
            key={theme.id}
            onClick={() => handleSelect(theme.id)}
            className={`theme-card ${isActive ? 'theme-card-active' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelect(theme.id);
              }
            }}
          >
            {/* Theme Visual Preview Card */}
            <div
              className="theme-preview-box"
              style={{
                backgroundColor: theme.preview.bg,
                borderColor: theme.preview.border
              }}
            >
              {/* Mock Chat bubbles preview */}
              <div
                className="preview-msg-user"
                style={{
                  background: `linear-gradient(135deg, ${theme.preview.accent}, ${theme.preview.secondary})`
                }}
              />
              <div
                className="preview-msg-assistant"
                style={{
                  backgroundColor: theme.preview.surface,
                  borderColor: theme.preview.border
                }}
              >
                <span
                  className="preview-avatar-dot"
                  style={{ backgroundColor: theme.preview.accent }}
                />
                <div className="preview-lines">
                  <div
                    className="preview-line"
                    style={{ backgroundColor: theme.isDark ? '#e2e8f0' : '#334155' }}
                  />
                  <div
                    className="preview-line short"
                    style={{ backgroundColor: theme.isDark ? '#94a3b8' : '#64748b' }}
                  />
                </div>
              </div>

              {isActive && (
                <div className="theme-active-badge">
                  <Check size={12} />
                </div>
              )}
            </div>

            {/* Theme Meta Info */}
            <div className="theme-meta-row">
              <div className="theme-text-group">
                <div className="theme-title-row">
                  <span className="theme-title">{theme.name}</span>
                  <span className="theme-type-tag">
                    {theme.isDark ? 'Dark' : 'Light'}
                  </span>
                </div>
                <span className="theme-desc">{theme.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ThemeSelector;

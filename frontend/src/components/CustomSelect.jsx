import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className="custom-select-container" style={{ ...style, zIndex: isOpen ? 50 : 1 }} ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!selectedOption ? 'placeholder-text' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`chevron ${isOpen ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>

      {isOpen && (
        <div className="custom-select-menu animate-fadeIn">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
              {value === opt.value && <span className="check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

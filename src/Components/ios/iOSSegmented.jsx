import React from 'react';

export default function iOSSegmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`ios-segmented w-full ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'active' : ''}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

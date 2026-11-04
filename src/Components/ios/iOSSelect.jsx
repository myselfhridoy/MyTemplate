import React from 'react';

export default function iOSSelect({
  label,
  options = [],
  placeholder = 'Select',
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-semibold text-base-content/60 mb-1.5 px-1 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`ios-input appearance-none pr-10 cursor-pointer disabled:opacity-50 ${className}`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt, i) => (
            <option key={opt.value ?? i} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

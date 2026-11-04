import React from 'react';

export default function iOSInput({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-semibold text-base-content/60 mb-1.5 px-1 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`ios-input ${error ? 'border-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="text-[13px] text-error mt-1 px-1">{error}</p>}
    </div>
  );
}

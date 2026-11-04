import React, { useEffect, useRef } from 'react';

function IOSSheet({ open, onClose, title, children, maxHeight = '90vh' }) {
  const previousOverflow = useRef('');

  useEffect(() => {
    if (!open) return undefined;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow.current;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close sheet"
        className="absolute inset-0 bg-black/40 ios-fade"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ios-sheet relative w-full sm:max-w-lg bg-base-100 rounded-t-[20px] sm:rounded-[20px] shadow-2xl flex flex-col"
        style={{ maxHeight }}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-base-content/20" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
          <h2 className="ios-headline flex-1 text-center">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 w-8 h-8 rounded-full bg-base-content/10 flex items-center justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default IOSSheet;

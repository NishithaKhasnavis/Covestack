// src/components/ui/modal.tsx
import React, { ReactNode } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[min(92vw,720px)] rounded-2xl bg-white border shadow-soft">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button
            className="px-2 py-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t bg-gray-50">{footer}</div>}
      </div>
    </div>
  );
}

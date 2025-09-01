import { createPortal } from "react-dom";
import { useEffect } from "react";

type ModalProps = {
  /** If you also gate with `{open && <Modal/>}`, you can leave this alone */
  open?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Tailwind width class, e.g. "max-w-xl" */
  maxWidthClassName?: string;
};

export default function Modal({
  open = true,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
}: ModalProps) {
  // Close on ESC + lock background scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4">
        <div className={`w-full ${maxWidthClassName} rounded-2xl bg-white shadow-xl border`}>
          <div className="flex items-center gap-3 border-b px-4 h-12">
            <div className="font-medium">{title}</div>
            <button className="ml-auto btn h-8 px-3 border" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

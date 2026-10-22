"use client";

import { useEffect } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

const widths = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

export default function Modal({ title, onClose, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-lg shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-2xl leading-none"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

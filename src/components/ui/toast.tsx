"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, durationMs = 6000) => {
    const id = ++counter;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, action?: Toast["action"]) => useToasts.getState().push({ message, action });

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto flex items-center gap-3 rounded-[12px] border border-line-strong bg-elevated py-2 pr-2 pl-4 text-[13px] text-fg shadow-lg shadow-black/20"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-[8px] px-2 py-1 font-medium text-accent hover:bg-accent/10"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="rounded-[8px] p-1 text-muted hover:text-fg" onClick={() => dismiss(t.id)}>
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

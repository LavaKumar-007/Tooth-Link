import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";

/**
 * Accessible, production-quality Confirmation Modal for ToothLink.
 *
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Called when user cancels, clicks backdrop, or presses Escape
 * @param {Function} props.onConfirm - Called when user explicitly clicks the Confirm button
 * @param {string} [props.title="Confirm Action"] - Modal header title
 * @param {React.ReactNode} [props.message] - Description / warning message
 * @param {string} [props.confirmText="Confirm"] - Text for confirmation button
 * @param {string} [props.cancelText="Cancel"] - Text for cancel button
 * @param {"danger" | "warning" | "primary"} [props.variant="primary"] - Visual style variant
 * @param {boolean} [props.isLoading=false] - Whether confirmation action is currently processing
 * @param {React.ReactNode} [props.children] - Optional custom content between message and actions
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  children,
}) {
  const cancelBtnRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  // Focus management and escape key listener
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement;
      // Focus cancel button by default to prevent accidental confirmation of destructive actions
      const focusTimer = setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 50);

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape" && !isLoading) {
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
        if (
          previouslyFocusedElement.current &&
          typeof previouslyFocusedElement.current.focus === "function"
        ) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Variant styling configuration
  const variantConfig = {
    danger: {
      icon: <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden="true" />,
      iconBg: "bg-rose-100",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    },
    warning: {
      icon: <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden="true" />,
      iconBg: "bg-amber-100",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    primary: {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />,
      iconBg: "bg-emerald-100",
      confirmBtn: "bg-emerald-700 hover:bg-emerald-800 text-white focus:ring-emerald-600",
    },
  }[variant] || {
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />,
    iconBg: "bg-emerald-100",
    confirmBtn: "bg-emerald-700 hover:bg-emerald-800 text-white focus:ring-emerald-600",
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => {
            if (!isLoading) onClose();
          }}
          aria-hidden="true"
        />

        {/* Modal dialog container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-modal border border-slate-200 z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-ring disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header with icon and title */}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${variantConfig.iconBg}`}
            >
              {variantConfig.icon}
            </div>

            <div className="flex-1 pr-6">
              <h2
                id="confirmation-modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                {title}
              </h2>
              {message && (
                <div
                  id="confirmation-modal-description"
                  className="mt-2 text-sm text-slate-600 leading-relaxed"
                >
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Optional custom children */}
          {children && <div className="mt-4">{children}</div>}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-ring disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shadow-sm focus-ring disabled:opacity-50 ${variantConfig.confirmBtn}`}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

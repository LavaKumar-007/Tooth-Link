import React from "react";

/**
 * Universal status configuration mapping for ToothLink.
 * Covers requirements, requests, inventories, users, and verification states.
 */
const STATUS_CONFIGS = {
  // Requirement statuses
  WAITING: {
    label: "Waiting for Match",
    bg: "bg-amber-50 text-amber-900 border-amber-200",
    dotBg: "bg-amber-500",
  },
  MATCH_FOUND: {
    label: "Match Found",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold",
    dotBg: "bg-emerald-500 animate-pulse",
  },
  REQUESTED: {
    label: "Requested",
    bg: "bg-blue-50 text-blue-900 border-blue-200",
    dotBg: "bg-blue-500",
  },
  FULFILLED: {
    label: "Fulfilled",
    bg: "bg-purple-50 text-purple-900 border-purple-200",
    dotBg: "bg-purple-500",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dotBg: "bg-slate-400",
  },

  // Request statuses
  PENDING: {
    label: "Pending Review",
    bg: "bg-amber-50 text-amber-900 border-amber-200",
    dotBg: "bg-amber-500",
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "bg-teal-50 text-teal-900 border-teal-200",
    dotBg: "bg-teal-500",
  },
  REJECTED: {
    label: "Declined",
    bg: "bg-rose-50 text-rose-900 border-rose-200",
    dotBg: "bg-rose-500",
  },

  // Inventory statuses
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-200",
    dotBg: "bg-emerald-500",
  },
  UNAVAILABLE: {
    label: "Out of Stock",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dotBg: "bg-slate-400",
  },
  EXPIRED: {
    label: "Expired",
    bg: "bg-rose-50 text-rose-900 border-rose-200",
    dotBg: "bg-rose-500",
  },

  // Verification & User statuses
  APPROVED: {
    label: "Verified",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-300",
    dotBg: "bg-emerald-500",
  },
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-300",
    dotBg: "bg-emerald-500",
  },
  INACTIVE: {
    label: "Inactive",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dotBg: "bg-slate-400",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-50 text-emerald-900 border-emerald-300",
    dotBg: "bg-emerald-500",
  },
};

/**
 * Normalizes input status to safely lookup in STATUS_CONFIGS.
 */
function normalizeStatusKey(status) {
  if (!status) return "";
  return String(status).trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/**
 * Humanizes an unknown status token into a friendly title case string.
 */
function humanizeStatus(raw) {
  if (!raw) return "Unknown";
  const str = String(raw).trim();
  return str
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Accessible, medical-grade StatusBadge component.
 *
 * @param {string} props.status - Status key (e.g., PENDING, APPROVED, WAITING, MATCH_FOUND)
 * @param {string} [props.label] - Optional custom label to override default
 * @param {string} [props.size="sm"] - Size preset ("sm" | "md")
 * @param {boolean} [props.dot=true] - Whether to show the colored status indicator dot
 * @param {string} [props.className=""] - Additional class overrides
 */
export default function StatusBadge({
  status,
  label,
  size = "sm",
  dot = true,
  className = "",
}) {
  const normKey = normalizeStatusKey(status);
  const config = STATUS_CONFIGS[normKey] || {
    label: humanizeStatus(status),
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dotBg: "bg-slate-400",
  };

  const displayLabel = label || config.label;
  const sizeClasses =
    size === "md"
      ? "px-3 py-1 text-xs sm:text-sm font-medium"
      : "px-2.5 py-0.5 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide select-none ${config.bg} ${sizeClasses} ${className}`}
      data-status={normKey}
    >
      {dot && (
        <span
          className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${config.dotBg || "bg-current opacity-75"}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

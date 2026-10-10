import React from "react";

const STATUS_CONFIGS = {
  // Requirement statuses
  WAITING: { label: "Waiting for Match", bg: "bg-amber-50 text-amber-800 border-amber-200" },
  MATCH_FOUND: { label: "Match Found", bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold" },
  REQUESTED: { label: "Requested", bg: "bg-blue-50 text-blue-800 border-blue-200" },
  FULFILLED: { label: "Fulfilled", bg: "bg-purple-50 text-purple-800 border-purple-200" },
  CANCELLED: { label: "Cancelled", bg: "bg-slate-100 text-slate-600 border-slate-200" },

  // Request statuses
  PENDING: { label: "Pending Review", bg: "bg-amber-50 text-amber-800 border-amber-200" },
  ACCEPTED: { label: "Accepted", bg: "bg-teal-50 text-teal-800 border-teal-200" },
  REJECTED: { label: "Declined", bg: "bg-rose-50 text-rose-800 border-rose-200" },

  // Inventory statuses
  AVAILABLE: { label: "Available", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  UNAVAILABLE: { label: "Out of Stock", bg: "bg-slate-100 text-slate-600 border-slate-200" },
  EXPIRED: { label: "Expired", bg: "bg-red-50 text-red-700 border-red-200" },

  // Verification / User statuses
  APPROVED: { label: "Verified", bg: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  ACTIVE: { label: "Active", bg: "bg-emerald-50 text-emerald-800 border-emerald-300" },
};

export default function StatusBadge({ status, className = "" }) {
  const norm = String(status || "").toUpperCase();
  const config = STATUS_CONFIGS[norm] || {
    label: status || "Unknown",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide ${config.bg} ${className}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
      {config.label}
    </span>
  );
}

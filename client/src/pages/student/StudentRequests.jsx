import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Clock,
  CheckCircle,
  Building,
  MapPin,
  Calendar,
  Package,
  AlertCircle,
  ArrowRight,
  Filter,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Declined", value: "REJECTED" },
];

export default function StudentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/requests");
      setRequests(res.data?.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load resource requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (isMounted) await loadRequests();
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [loadRequests]);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#123d35]">
              My Specimen Resource Requests
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track fulfillment status, clinic approvals, and academic handover timelines.
            </p>
          </div>

          <Link
            to="/student/search"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded-lg px-2 py-1"
          >
            <span>Browse More Inventory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "ALL"
                ? requests.length
                : requests.filter((r) => r.status === f.value).length;
            const isActive = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition focus-ring ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-emerald-800 text-emerald-100" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800"
          >
            <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Request Cards List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs animate-pulse space-y-3"
              >
                <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>
            ))
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-card">
              <Layers size={40} className="mx-auto text-slate-400" />
              <h2 className="mt-3 text-base font-bold text-slate-800">
                {statusFilter === "ALL"
                  ? "No requests submitted yet"
                  : `No requests with status: ${statusFilter}`}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                When you locate compatible specimens in the inventory catalog, submit an official educational request to initiate clinic review.
              </p>
              <Link
                to="/student/search"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition focus-ring"
              >
                <Package size={14} />
                <span>Browse Inventory Catalog</span>
              </Link>
            </div>
          ) : (
            filteredRequests.map((r) => {
              const status = r.status;
              const isAccepted = status === "ACCEPTED";
              const isPending = status === "PENDING";
              const isFulfilled = status === "FULFILLED";
              const isRejected = status === "REJECTED";

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border bg-white p-6 shadow-card transition ${
                    isAccepted
                      ? "border-teal-300 ring-1 ring-teal-200/60"
                      : isFulfilled
                      ? "border-purple-300"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      {/* Top Heading */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-400">
                          Request #{r.id}
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {r.quantity}x {r.inventory?.arch || ""} {r.inventory?.toothType || "Specimens"}
                        </h2>
                        <StatusBadge status={r.status} size="sm" />
                      </div>

                      {/* Clinic Info */}
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building size={14} className="text-slate-400 shrink-0" />
                          <span>
                            {r.clinic?.clinicName || "Partner Dental Clinic"}
                            {r.clinic?.doctorName ? ` (${r.clinic.doctorName})` : ""}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span>{r.clinic?.location || "Clinic Location"}</span>
                        </p>
                      </div>

                      {/* Status Advice Notice */}
                      {isAccepted && (
                        <div className="mt-3 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-900 font-medium">
                          <strong>Allocation Approved:</strong> The clinic has accepted your request. Please check in-app notifications and contact the clinic for material collection under sanitization protocols.
                        </div>
                      )}
                      {isPending && (
                        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200/70 p-3 text-xs text-amber-900">
                          <strong>Pending Clinic Review:</strong> The clinic has received your request and will review specimen availability and anatomical compatibility.
                        </div>
                      )}
                      {isFulfilled && (
                        <div className="mt-3 rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900 font-medium">
                          <strong>Handover Complete:</strong> This resource allocation was successfully fulfilled and documented for your educational records.
                        </div>
                      )}
                      {isRejected && (
                        <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200/70 p-3 text-xs text-rose-900">
                          <strong>Allocation Declined:</strong> The clinic was unable to fulfill this request. You can browse other inventory lots or post an active requirement.
                        </div>
                      )}

                      {/* Timeline Indicators */}
                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Submitted: {new Date(r.requestedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                        </span>

                        {r.respondedAt && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            <span>Clinic Decision: {new Date(r.respondedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                          </span>
                        )}

                        {r.fulfilledAt && (
                          <span className="flex items-center gap-1.5 font-bold text-purple-700">
                            <CheckCircle size={13} />
                            <span>Fulfilled: {new Date(r.fulfilledAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

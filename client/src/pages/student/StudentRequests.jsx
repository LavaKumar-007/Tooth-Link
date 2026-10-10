import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  MapPin,
  Calendar,
  Package,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

export default function StudentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
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
  }

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              My Resource Requests
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track progress from clinic submission to fulfillment.
            </p>
          </div>

          <Link
            to="/student/search"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Find more inventory <ArrowRight size={14} />
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Layers size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No requests submitted yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                When you find matching clinic inventory, you can submit an official educational resource request here.
              </p>
              <Link
                to="/student/search"
                className="mt-5 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Browse Inventory
              </Link>
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {r.quantity} {r.inventory?.toothType || "Specimens"} ({r.inventory?.arch || "Arch"})
                      </h3>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Building size={14} className="text-slate-400" />
                        {r.clinic?.clinicName || "Partner Clinic"} {r.clinic?.doctorName ? `(${r.clinic.doctorName})` : ""}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        {r.clinic?.location || "Clinic Location"}
                      </p>
                    </div>

                    {/* Timeline indicators */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Requested: {new Date(r.requestedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {r.respondedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> Clinic Response: {new Date(r.respondedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {r.fulfilledAt && (
                        <span className="flex items-center gap-1 font-bold text-purple-700">
                          <CheckCircle size={12} /> Fulfilled: {new Date(r.fulfilledAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span>Request #{r.id}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

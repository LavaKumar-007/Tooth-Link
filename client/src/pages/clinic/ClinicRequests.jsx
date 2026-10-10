import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  CheckCircle,
  XCircle,
  User,
  GraduationCap,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

export default function ClinicRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [clinicProfile, setClinicProfile] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/requests");
      setRequests(res.data?.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load clinic requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setClinicProfile(res.data?.user || null);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadProfile();
  }, [loadRequests, loadProfile]);

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    setError("");
    try {
      await api.patch(`/requests/${id}/status`, { status: newStatus });
      setSuccessMsg(`Request status updated to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update request status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              Student Resource Requests
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and coordinate specimen requests submitted by dental students.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="ACCEPTED">Accepted / In Progress</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="REJECTED">Declined</option>
            </select>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {clinicProfile?.clinic?.verificationStatus &&
          clinicProfile.clinic.verificationStatus !== "APPROVED" && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <span className="font-bold">
                  {clinicProfile.clinic.verificationStatus === "PENDING"
                    ? "Clinic Verification Pending: "
                    : "Clinic Verification Declined: "}
                </span>
                {clinicProfile.clinic.verificationStatus === "PENDING"
                  ? "Your clinic registration is under review. You can review incoming requests, but accepting requests requires administrator approval."
                  : "Your clinic credentials could not be verified. Accepting requests is disabled."}
              </div>
            </div>
          )}

        {/* Status Alerts */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Requests List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading incoming requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Layers size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No requests found</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                No student requests currently match this filter. When students pair requirements with your inventory, they'll appear here.
              </p>
            </div>
          ) : (
            filteredRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        Request for {r.quantity}x {r.inventory?.arch} {r.inventory?.toothType}
                      </h3>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User size={14} className="text-emerald-700" />
                        {r.student?.user?.name || "Student"} ({r.student?.user?.email})
                      </p>
                      <p className="flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-slate-400" />
                        {r.student?.institution || "Dental College"} • ID: {r.student?.studentId}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        Location: {r.student?.location || "City"}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={14} />
                        Requested {new Date(r.requestedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>

                    {r.inventory && (
                      <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 flex items-center gap-3">
                        <span>
                          <strong>Matched Lot:</strong> #{r.inventory.id} ({r.inventory.toothType})
                        </span>
                        <span>
                          <strong>In Stock:</strong> {r.inventory.quantity} units
                        </span>
                        {r.inventory.condition && (
                          <span>
                            <strong>Condition:</strong> {r.inventory.condition}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(r.id, "ACCEPTED")}
                          disabled={
                            clinicProfile?.clinic?.verificationStatus !== "APPROVED" ||
                            updatingId === r.id
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            clinicProfile?.clinic?.verificationStatus !== "APPROVED"
                              ? "Administrator approval required to accept requests"
                              : ""
                          }
                        >
                          <CheckCircle size={14} />
                          {clinicProfile?.clinic?.verificationStatus !== "APPROVED"
                            ? "Approval Required to Accept"
                            : "Accept Request"}
                        </button>
                        <button
                          onClick={() => handleStatusChange(r.id, "REJECTED")}
                          disabled={updatingId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Decline
                        </button>
                      </>
                    )}

                    {r.status === "ACCEPTED" && (
                      <button
                        onClick={() => handleStatusChange(r.id, "FULFILLED")}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-800 disabled:opacity-50 shadow-sm"
                        title="Deduct inventory and mark complete"
                      >
                        <CheckCircle size={14} /> Mark as Fulfilled & Deduct Stock
                      </button>
                    )}

                    {r.status === "FULFILLED" && (
                      <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                        <CheckCircle size={14} /> Material Fulfilled
                      </span>
                    )}

                    {r.status === "REJECTED" && (
                      <span className="text-xs font-medium text-slate-400">Declined</span>
                    )}
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

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  Bell,
  Sparkles,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  X,
  Info,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

const TOOTH_TYPES = ["INCISOR", "CANINE", "PREMOLAR", "MOLAR"];
const ARCH_TYPES = ["MAXILLARY", "MANDIBULAR", "BOTH"];

export default function StudentRequirements() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Requirement Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newReq, setNewReq] = useState({
    toothType: "INCISOR",
    arch: "MAXILLARY",
    specificTooth: "",
    condition: "",
    quantity: 1,
    location: "Hyderabad",
    requiredBy: "",
    notifyEnabled: true,
  });

  // Matches Modal
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [activeReqForMatches, setActiveReqForMatches] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesList, setMatchesList] = useState([]);
  const [requestSubmittingId, setRequestSubmittingId] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);

  const loadRequirements = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/requirements");
      setRequirements(res.data?.requirements || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requirements.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setStudentProfile(res.data?.user || null);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    loadRequirements();
    loadProfile();
  }, [loadRequirements, loadProfile]);

  async function handleToggleNotify(req) {
    try {
      await api.patch(`/requirements/${req.id}/notify`, {
        enabled: !req.notifyEnabled,
      });
      setRequirements((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, notifyEnabled: !r.notifyEnabled } : r))
      );
      setSuccessMsg(
        `Notify Me ${!req.notifyEnabled ? "enabled" : "disabled"} for requirement #${req.id}`
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update Notify Me preference.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to cancel and delete this requirement?")) {
      return;
    }
    try {
      await api.delete(`/requirements/${id}`);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
      setSuccessMsg("Requirement deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete requirement.");
    }
  }

  async function viewMatches(req) {
    setActiveReqForMatches(req);
    setMatchesModalOpen(true);
    setMatchesLoading(true);
    try {
      const res = await api.get(`/requirements/${req.id}/matches`);
      setMatchesList(res.data?.matches || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to retrieve matches.");
    } finally {
      setMatchesLoading(false);
    }
  }

  async function handleCreateRequirement(e) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const payload = {
        toothType: newReq.toothType,
        arch: newReq.arch,
        quantity: parseInt(newReq.quantity, 10),
        location: newReq.location.trim(),
        notifyEnabled: Boolean(newReq.notifyEnabled),
      };
      if (newReq.specificTooth.trim()) payload.specificTooth = newReq.specificTooth.trim();
      if (newReq.condition.trim()) payload.condition = newReq.condition.trim();
      if (newReq.requiredBy) payload.requiredBy = new Date(newReq.requiredBy).toISOString();

      const res = await api.post("/requirements", payload);
      setCreateModalOpen(false);
      setNewReq({
        toothType: "INCISOR",
        arch: "MAXILLARY",
        specificTooth: "",
        condition: "",
        quantity: 1,
        location: "Hyderabad",
        requiredBy: "",
        notifyEnabled: true,
      });

      setSuccessMsg("Requirement posted successfully!");
      loadRequirements();

      if (res.data?.matchCount > 0) {
        viewMatches(res.data.requirement);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create requirement.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDirectRequest(match) {
    if (!activeReqForMatches) return;
    setRequestSubmittingId(match.inventoryId);
    try {
      await api.post("/requests", {
        requirementId: activeReqForMatches.id,
        inventoryId: match.inventoryId,
        quantity: Math.min(activeReqForMatches.quantity, match.quantity),
      });

      setSuccessMsg("Request sent successfully to clinic!");
      setMatchesModalOpen(false);
      loadRequirements();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setRequestSubmittingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              My Dental Resource Requirements
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submit your study specimen needs and receive automated clinic matches.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Plus size={18} /> Post New Requirement
          </button>
        </div>

        {/* Verification Status Warning */}
        {studentProfile?.student?.verificationStatus &&
          studentProfile.student.verificationStatus !== "APPROVED" && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <span className="font-bold">
                  {studentProfile.student.verificationStatus === "PENDING"
                    ? "Verification Pending: "
                    : "Verification Declined: "}
                </span>
                {studentProfile.student.verificationStatus === "PENDING"
                  ? "Your student account is pending approval. You can create requirements and inspect matches, but requesting items from clinics requires verified status."
                  : "Your student credentials were not approved. Material requesting is disabled."}
              </div>
            </div>
          )}

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

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading requirements...</div>
          ) : requirements.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <ClipboardList size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No requirements submitted yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Post your dental anatomy, endodontics, or prosthodontics specimen requirement to scan clinic availability automatically.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Post Your First Requirement
              </button>
            </div>
          ) : (
            requirements.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {req.quantity}x {req.arch} {req.toothType}
                      </h3>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin size={13} className="text-slate-400" /> {req.location}
                      </span>
                      {req.specificTooth && (
                        <span>
                          <strong>Tooth:</strong> {req.specificTooth}
                        </span>
                      )}
                      {req.condition && (
                        <span>
                          <strong>Condition:</strong> {req.condition}
                        </span>
                      )}
                      {req.requiredBy && (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          Needed by {new Date(req.requiredBy).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-slate-400">
                        Posted {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    <button
                      onClick={() => handleToggleNotify(req)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        req.notifyEnabled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      title={req.notifyEnabled ? "Notify Me is ON" : "Click to turn Notify Me ON"}
                    >
                      <Bell size={13} className={req.notifyEnabled ? "fill-emerald-700 text-emerald-700" : ""} />
                      {req.notifyEnabled ? "Notify Me: ON" : "Notify Me: OFF"}
                    </button>

                    <button
                      onClick={() => viewMatches(req)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-sm"
                    >
                      <Sparkles size={14} />
                      {req.status === "MATCH_FOUND" ? "View Matches" : "Check Matches"}
                    </button>

                    <button
                      onClick={() => handleDelete(req.id)}
                      className="rounded-xl p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                      title="Delete requirement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Post Study Resource Requirement</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRequirement} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tooth Type *
                    </label>
                    <select
                      value={newReq.toothType}
                      onChange={(e) => setNewReq({ ...newReq, toothType: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      required
                    >
                      {TOOTH_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Dental Arch *
                    </label>
                    <select
                      value={newReq.arch}
                      onChange={(e) => setNewReq({ ...newReq, arch: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      required
                    >
                      {ARCH_TYPES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Quantity Required *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newReq.quantity}
                      onChange={(e) => setNewReq({ ...newReq, quantity: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Location (City) *
                    </label>
                    <input
                      type="text"
                      value={newReq.location}
                      onChange={(e) => setNewReq({ ...newReq, location: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Specific Tooth (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Central Incisor"
                      value={newReq.specificTooth}
                      onChange={(e) => setNewReq({ ...newReq, specificTooth: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Condition (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sound, Restored"
                      value={newReq.condition}
                      onChange={(e) => setNewReq({ ...newReq, condition: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Required By (Deadline)
                  </label>
                  <input
                    type="date"
                    value={newReq.requiredBy}
                    onChange={(e) => setNewReq({ ...newReq, requiredBy: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReq.notifyEnabled}
                      onChange={(e) => setNewReq({ ...newReq, notifyEnabled: e.target.checked })}
                      className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-950">
                        Enable "Notify Me" Alerts
                      </span>
                      <p className="text-[11px] text-emerald-800 leading-tight">
                        Automatically receive an alert when a clinic lists matching specimens.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {creating ? "Submitting..." : "Submit Requirement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {matchesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Matching Inventory</h3>
                  <p className="text-xs text-slate-500">
                    Matches for: {activeReqForMatches?.quantity}x {activeReqForMatches?.arch} {activeReqForMatches?.toothType} in {activeReqForMatches?.location}
                  </p>
                </div>
                <button
                  onClick={() => setMatchesModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {matchesLoading ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    Evaluating matching algorithms...
                  </div>
                ) : matchesList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                    <Info size={32} className="mx-auto text-slate-400" />
                    <h4 className="mt-2 text-sm font-bold text-slate-800">No active matches found right now</h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      No certified clinics in {activeReqForMatches?.location} currently have matching {activeReqForMatches?.toothType} inventory. Ensure <strong>Notify Me</strong> is enabled to be alerted immediately once stock becomes available.
                    </p>
                  </div>
                ) : (
                  matchesList.map((m) => (
                    <div
                      key={m.inventoryId}
                      className="rounded-2xl border border-slate-200 p-5 shadow-sm transition hover:border-emerald-500"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {m.quantity} available • {m.arch} {m.toothType}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                              {m.matchScore}% Match
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {m.clinicName} {m.doctorName ? `(${m.doctorName})` : ""} • {m.location}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDirectRequest(m)}
                          disabled={
                            studentProfile?.student?.verificationStatus !== "APPROVED" ||
                            requestSubmittingId === m.inventoryId
                          }
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {studentProfile?.student?.verificationStatus !== "APPROVED"
                            ? "Approval Required"
                            : requestSubmittingId === m.inventoryId
                            ? "Sending..."
                            : "Request Material →"}
                        </button>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Compatibility Analysis:
                        </p>
                        <ul className="mt-1 space-y-1">
                          {m.matchReasons?.map((reason, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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
  Loader2,
  Building,
  Package,
  ShieldAlert,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import ConfirmationModal from "../../components/ConfirmationModal";
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
    location: "",
    requiredBy: "",
    notifyEnabled: true,
  });

  // Matches Modal
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [activeReqForMatches, setActiveReqForMatches] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesList, setMatchesList] = useState([]);

  // Delete Confirmation Modal
  const [deleteConfirmReq, setDeleteConfirmReq] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      const user = res.data?.user || null;
      setStudentProfile(user);
      if (user?.student?.location && !newReq.location) {
        setNewReq((prev) => ({ ...prev, location: user.student.location }));
      }
    } catch {
      // Ignored
    }
  }, [newReq.location]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!isMounted) return;
      await Promise.all([loadRequirements(), loadProfile()]);
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [loadRequirements, loadProfile]);

  const verificationStatus =
    studentProfile?.student?.verificationStatus || "PENDING";
  const isApproved = verificationStatus === "APPROVED";

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

  function handleDelete(req) {
    setDeleteConfirmReq(req);
  }

  async function confirmDelete() {
    if (!deleteConfirmReq) return;
    const id = deleteConfirmReq.id;
    try {
      setIsDeleting(true);
      await api.delete(`/requirements/${id}`);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
      setSuccessMsg("Requirement deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
      setDeleteConfirmReq(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete requirement.");
    } finally {
      setIsDeleting(false);
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
        location: (newReq.location || studentProfile?.student?.location || "").trim(),
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
        location: studentProfile?.student?.location || "",
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

      setSuccessMsg("Resource request submitted successfully to clinic!");
      setMatchesModalOpen(false);
      loadRequirements();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setRequestSubmittingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#123d35]">
              My Study Resource Requirements
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Define your academic specimen needs, enable automated alerts, and inspect matched clinic lots.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-ring"
          >
            <Plus size={18} />
            <span>Post New Requirement</span>
          </button>
        </div>

        {/* Verification Status Warning if Not Approved */}
        {!isApproved && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 shadow-2xs">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold">Account Verification Notice: </span>
              Your student account is currently{" "}
              <strong className="uppercase">{verificationStatus}</strong>. You can post and manage study requirements, but dispatching requests to clinics requires verified administrator approval.
            </div>
          </div>
        )}

        {/* Success Message Banner */}
        {successMsg && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-900 font-semibold shadow-2xs"
          >
            <CheckCircle size={18} className="text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800"
          >
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Requirements List Container */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs animate-pulse space-y-3"
              >
                <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-8 bg-slate-100 rounded-xl mt-3"></div>
              </div>
            ))
          ) : requirements.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-card">
              <ClipboardList size={40} className="mx-auto text-slate-400" />
              <h2 className="mt-3 text-base font-bold text-slate-800">
                No active requirements posted
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Post your first anatomical study requirement to enable the matching engine and receive automated Notify Me alerts when clinics list compatible lots.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition focus-ring"
              >
                <Plus size={16} />
                <span>Post Your First Requirement</span>
              </button>
            </div>
          ) : (
            requirements.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border bg-white p-6 shadow-card transition ${
                  req.status === "MATCH_FOUND"
                    ? "border-emerald-300 ring-1 ring-emerald-200"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    {/* Top line: Arch, Tooth, and StatusBadge */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-400">
                        #{req.id}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {req.quantity}x {req.arch} {req.toothType}
                      </h2>
                      <StatusBadge status={req.status} size="sm" />
                    </div>

                    {/* Metadata details */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        {req.location}
                      </span>

                      {req.specificTooth && (
                        <span>
                          Code: <strong className="text-slate-800">{req.specificTooth}</strong>
                        </span>
                      )}

                      {req.condition && (
                        <span>
                          Condition: <strong className="text-slate-800">{req.condition}</strong>
                        </span>
                      )}

                      {req.requiredBy && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar size={13} className="text-slate-400" />
                          Needed by: {new Date(req.requiredBy).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Notify Me, Matches, Delete */}
                  <div className="flex items-center gap-2 self-start">
                    {/* Notify Me Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleNotify(req)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition focus-ring ${
                        req.notifyEnabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                      title={req.notifyEnabled ? "Disable automated matching alerts" : "Enable automated matching alerts"}
                      aria-label={`Toggle Notify Me for requirement #${req.id}`}
                    >
                      <Bell size={13} className={req.notifyEnabled ? "text-emerald-700" : "text-slate-400"} />
                      <span>{req.notifyEnabled ? "Notify Me: ON" : "Notify Me: OFF"}</span>
                    </button>

                    {/* Matches Button */}
                    <button
                      type="button"
                      onClick={() => viewMatches(req)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition focus-ring shadow-2xs ${
                        req.status === "MATCH_FOUND"
                          ? "bg-emerald-700 text-white hover:bg-emerald-800 ring-2 ring-emerald-500/20"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Sparkles size={13} className={req.status === "MATCH_FOUND" ? "text-emerald-200" : "text-slate-400"} />
                      <span>{req.status === "MATCH_FOUND" ? "View Matches" : "Check Matches"}</span>
                    </button>

                    {/* Delete Action (opens ConfirmationModal) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(req)}
                      className="rounded-xl p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus-ring"
                      title="Delete requirement"
                      aria-label={`Delete requirement #${req.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Requirement Modal */}
        {createModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-req-title"
          >
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-modal border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 id="create-req-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Post Educational Study Requirement
                </h2>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 focus-ring"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRequirement} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="req-toothType"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Tooth Classification
                    </label>
                    <select
                      id="req-toothType"
                      value={newReq.toothType}
                      onChange={(e) => setNewReq({ ...newReq, toothType: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus-ring shadow-2xs"
                    >
                      {TOOTH_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="req-arch"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Dental Arch
                    </label>
                    <select
                      id="req-arch"
                      value={newReq.arch}
                      onChange={(e) => setNewReq({ ...newReq, arch: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus-ring shadow-2xs"
                    >
                      {ARCH_TYPES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="req-qty"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Quantity Needed
                    </label>
                    <input
                      id="req-qty"
                      type="number"
                      min="1"
                      value={newReq.quantity}
                      onChange={(e) => setNewReq({ ...newReq, quantity: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-ring shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="req-specificTooth"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Specific Tooth Code (Optional)
                    </label>
                    <input
                      id="req-specificTooth"
                      type="text"
                      placeholder="e.g. #14, FDI 26, Upper Right"
                      value={newReq.specificTooth}
                      onChange={(e) => setNewReq({ ...newReq, specificTooth: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-ring shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="req-location"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Target City / Location
                    </label>
                    <input
                      id="req-location"
                      type="text"
                      placeholder="e.g. Bangalore, Karnataka"
                      value={newReq.location}
                      onChange={(e) => setNewReq({ ...newReq, location: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-ring shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="req-requiredBy"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Deadline Date (Optional)
                    </label>
                    <input
                      id="req-requiredBy"
                      type="date"
                      value={newReq.requiredBy}
                      onChange={(e) => setNewReq({ ...newReq, requiredBy: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-ring shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="req-condition"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Preservation Condition / Study Context (Optional)
                  </label>
                  <input
                    id="req-condition"
                    type="text"
                    placeholder="e.g. Intact roots for endodontic instrumentation, non-carious"
                    value={newReq.condition}
                    onChange={(e) => setNewReq({ ...newReq, condition: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-ring shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    id="req-notifyEnabled"
                    type="checkbox"
                    checked={newReq.notifyEnabled}
                    onChange={(e) => setNewReq({ ...newReq, notifyEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <label htmlFor="req-notifyEnabled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Enable "Notify Me" automated matching alerts for this study requirement
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-ring disabled:opacity-50"
                  >
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    <span>{creating ? "Posting..." : "Post Requirement"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Matches Modal */}
        {matchesModalOpen && activeReqForMatches && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="matches-modal-title"
          >
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-modal border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 id="matches-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                    Compatible Clinic Inventory Matches
                  </h2>
                  <p className="text-xs text-slate-500">
                    Matched for Requirement #{activeReqForMatches.id} ({activeReqForMatches.quantity}x {activeReqForMatches.arch} {activeReqForMatches.toothType})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchesModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 focus-ring"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {!isApproved && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    <strong>Verification Notice:</strong> You can view compatibility details, but request submission to clinics requires an approved student account.
                  </span>
                </div>
              )}

              <div className="mt-4 space-y-3.5">
                {matchesLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin text-emerald-700" />
                    Checking matching engine...
                  </div>
                ) : matchesList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-[#f8fbfa] p-8 text-center">
                    <Sparkles size={32} className="mx-auto text-slate-400" />
                    <h3 className="mt-2 text-sm font-bold text-slate-800">
                      No matching specimens currently available
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      No clinic has listed compatible lots yet. Keep "Notify Me" active to receive an automated notification as soon as matching stock is published.
                    </p>
                  </div>
                ) : (
                  matchesList.map((m) => (
                    <div
                      key={m.inventoryId}
                      className="rounded-2xl border border-emerald-200 bg-[#f8fbfa] p-4.5 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {m.arch} {m.toothType} (Lot #{m.inventoryId})
                            </h3>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {m.quantity} Available
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                            <p className="flex items-center gap-1.5">
                              <Building size={13} className="text-slate-400" />
                              <span>{m.clinicName} • {m.location}</span>
                            </p>
                            {m.condition && (
                              <p className="text-slate-500">Condition: {m.condition}</p>
                            )}
                          </div>

                          {m.matchReasons?.length > 0 && (
                            <div className="mt-2.5 rounded-xl bg-white p-2.5 border border-slate-100">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                Match Compatibility:
                              </p>
                              <ul className="mt-1 space-y-1">
                                {m.matchReasons.map((reason, idx) => (
                                  <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Request Action Button */}
                        <div className="shrink-0 sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleDirectRequest(m)}
                            disabled={!isApproved || requestSubmittingId === m.inventoryId}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-800 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {requestSubmittingId === m.inventoryId && (
                              <Loader2 size={13} className="animate-spin" />
                            )}
                            <span>
                              {!isApproved
                                ? "Approval Required"
                                : requestSubmittingId === m.inventoryId
                                ? "Sending..."
                                : "Request Specimen"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Accessible Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteConfirmReq}
          onClose={() => {
            if (!isDeleting) setDeleteConfirmReq(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Tooth Requirement"
          message={
            deleteConfirmReq
              ? `Are you sure you want to cancel and delete requirement #${deleteConfirmReq.id} (${deleteConfirmReq.quantity}x ${deleteConfirmReq.toothType})? Any active matching or Notify-Me alerts for this request will be removed.`
              : "Are you sure you want to delete this requirement?"
          }
          confirmText="Delete Requirement"
          cancelText="Keep Requirement"
          variant="danger"
          isLoading={isDeleting}
        />
      </main>
    </div>
  );
}

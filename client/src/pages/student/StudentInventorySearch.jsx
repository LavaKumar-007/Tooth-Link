import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Building,
  CheckCircle,
  Package,
  X,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

const TOOTH_TYPES = ["ALL", "INCISOR", "CANINE", "PREMOLAR", "MOLAR"];
const ARCH_TYPES = ["ALL", "MAXILLARY", "MANDIBULAR", "BOTH"];

export default function StudentInventorySearch() {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTooth, setFilterTooth] = useState("ALL");
  const [filterArch, setFilterArch] = useState("ALL");
  const [filterLocation, setFilterLocation] = useState("");
  const [minQty, setMinQty] = useState(1);

  // Profile and verification state
  const [studentProfile, setStudentProfile] = useState(null);

  // Request modal state
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [myRequirements, setMyRequirements] = useState([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState("");
  const [requestQty, setRequestQty] = useState(1);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState("");
  const [requestError, setRequestError] = useState("");

  const loadInventories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (filterTooth !== "ALL") params.toothType = filterTooth;
      if (filterArch !== "ALL") params.arch = filterArch;

      const res = await api.get("/inventory", { params });
      setInventories(res.data?.inventories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory records.");
    } finally {
      setLoading(false);
    }
  }, [filterTooth, filterArch]);

  const loadStudentRequirements = useCallback(async () => {
    try {
      const res = await api.get("/requirements");
      setMyRequirements(res.data?.requirements || []);
    } catch {
      // Ignored
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
    let isMounted = true;
    async function init() {
      if (!isMounted) return;
      await Promise.all([loadInventories(), loadStudentRequirements(), loadProfile()]);
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [loadInventories, loadStudentRequirements, loadProfile]);

  const verificationStatus =
    studentProfile?.student?.verificationStatus || "PENDING";
  const isApproved = verificationStatus === "APPROVED";

  const filteredList = inventories.filter((item) => {
    if (filterLocation.trim()) {
      const matchLoc = (item.location || "")
        .toLowerCase()
        .includes(filterLocation.trim().toLowerCase());
      if (!matchLoc) return false;
    }
    if (minQty && item.quantity < Number(minQty)) {
      return false;
    }
    return true;
  });

  function openRequestModal(item) {
    setSelectedInventory(item);
    setRequestQty(Math.min(1, item.quantity));
    setRequestSuccess("");
    setRequestError("");

    const compatible = myRequirements.find(
      (r) =>
        r.toothType === item.toothType &&
        (r.arch === item.arch || item.arch === "BOTH") &&
        r.status !== "FULFILLED" &&
        r.status !== "CANCELLED"
    );
    setSelectedRequirementId(compatible ? String(compatible.id) : "");
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    setRequestError("");
    setRequestSuccess("");

    if (!selectedRequirementId) {
      setRequestError("Please select an active requirement to pair with this request.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await api.post("/requests", {
        requirementId: parseInt(selectedRequirementId, 10),
        inventoryId: selectedInventory.id,
        quantity: parseInt(requestQty, 10),
      });

      setRequestSuccess("Resource request submitted successfully to the clinic!");
      setTimeout(() => {
        setSelectedInventory(null);
        loadInventories();
        loadStudentRequirements();
      }, 1500);
    } catch (err) {
      setRequestError(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#123d35]">
              Browse Educational Tooth Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time sanitized specimens listed by certified dental practices for preclinical study.
            </p>
          </div>

          <Link
            to="/student/requirements"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded-lg px-2 py-1"
          >
            <Sparkles size={14} />
            <span>Post Specific Requirement →</span>
          </Link>
        </div>

        {/* Verification Status Warning if Not Approved */}
        {!isApproved && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 shadow-2xs">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold">
                {verificationStatus === "PENDING"
                  ? "Verification Pending: "
                  : "Verification Declined: "}
              </span>
              {verificationStatus === "PENDING"
                ? "Your student account is currently under institutional review. You are free to browse catalog listings, but submitting specimen allocation requests requires account approval by an administrator."
                : "Your student credentials could not be verified. Catalog browsing is allowed, but submitting resource requests is restricted."}
            </div>
          </div>
        )}

        {/* Search & Filter Controls Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="filter-tooth"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Tooth Classification
              </label>
              <select
                id="filter-tooth"
                value={filterTooth}
                onChange={(e) => setFilterTooth(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus-ring shadow-2xs"
              >
                {TOOTH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "ALL" ? "All Tooth Types" : t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-arch"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Dental Arch
              </label>
              <select
                id="filter-arch"
                value={filterArch}
                onChange={(e) => setFilterArch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus-ring shadow-2xs"
              >
                {ARCH_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a === "ALL" ? "All Arches" : a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-location"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                City / Location
              </label>
              <div className="relative">
                <input
                  id="filter-location"
                  type="text"
                  placeholder="Filter by city..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pl-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-ring shadow-2xs"
                />
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label
                htmlFor="filter-qty"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Minimum Quantity
              </label>
              <input
                id="filter-qty"
                type="number"
                min="1"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus-ring shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Results Counter & Filter Reset */}
        <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredList.length}</strong> listed specimen lots
          </span>
          {(filterTooth !== "ALL" || filterArch !== "ALL" || filterLocation !== "" || minQty !== 1) && (
            <button
              type="button"
              onClick={() => {
                setFilterTooth("ALL");
                setFilterArch("ALL");
                setFilterLocation("");
                setMinQty(1);
              }}
              className="font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800"
          >
            <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Inventory Cards Grid */}
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 rounded w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-9 bg-slate-200 rounded-xl mt-4"></div>
              </div>
            ))
          ) : filteredList.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-card">
              <Package size={40} className="mx-auto text-slate-400" />
              <h2 className="mt-3 text-base font-bold text-slate-800">
                No matching specimens available
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                No clinics currently have lots matching your filters. You can post a custom requirement to be alerted automatically via Notify Me when stock arrives.
              </p>
              <Link
                to="/student/requirements"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition focus-ring"
              >
                <Sparkles size={14} />
                <span>Post Requirement with Notify Me</span>
              </Link>
            </div>
          ) : (
            filteredList.map((item) => {
              const isAvailable = item.status === "AVAILABLE" && item.quantity > 0;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card transition hover:border-emerald-500 hover:shadow-card-hover"
                >
                  <div>
                    {/* Card Top: Arch & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          {item.arch} ARCH
                        </span>
                        <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {item.toothType}
                        </h2>
                      </div>
                      <StatusBadge status={item.status} size="sm" />
                    </div>

                    {/* Metadata Section */}
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      {item.specificTooth && (
                        <p className="text-slate-700">
                          <span className="font-semibold text-slate-900">Anatomical Code:</span>{" "}
                          {item.specificTooth}
                        </p>
                      )}

                      {item.condition && (
                        <p className="text-slate-700">
                          <span className="font-semibold text-slate-900">Sanitization & State:</span>{" "}
                          {item.condition}
                        </p>
                      )}

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Stock In Lot</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Package size={14} className="text-emerald-700" />
                          {item.quantity} available
                        </span>
                      </div>

                      <div className="pt-2 space-y-1 text-slate-500">
                        <p className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{item.location}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Building size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            {item.clinic?.clinicName || "Partner Dental Clinic"}
                            {item.clinic?.doctorName ? ` (${item.clinic.doctorName})` : ""}
                          </span>
                        </p>

                        {(item.availableFrom || item.availableUntil) && (
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar size={12} className="shrink-0" />
                            <span>
                              {item.availableFrom ? new Date(item.availableFrom).toLocaleDateString() : "Now"} –{" "}
                              {item.availableUntil ? new Date(item.availableUntil).toLocaleDateString() : "Indefinite"}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openRequestModal(item)}
                      disabled={!isAvailable}
                      className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition focus-ring shadow-2xs ${
                        !isAvailable
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : !isApproved
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          : "bg-emerald-700 text-white hover:bg-emerald-800"
                      }`}
                    >
                      {!isAvailable ? (
                        <span>Out of Stock</span>
                      ) : !isApproved ? (
                        <span>Request (Verification Required)</span>
                      ) : (
                        <>
                          <span>Request Specimen</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Request Modal */}
        {selectedInventory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-modal-title"
          >
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-modal border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 id="request-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Request Resource Allocation
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedInventory(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 focus-ring"
                  aria-label="Close request modal"
                >
                  <X size={18} />
                </button>
              </div>

              {requestSuccess ? (
                <div
                  role="status"
                  className="my-6 rounded-2xl bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-900 border border-emerald-200"
                >
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600" />
                  {requestSuccess}
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="mt-4 space-y-4">
                  {/* Selected Specimen Overview */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">
                        {selectedInventory.arch} {selectedInventory.toothType}
                      </span>
                      <StatusBadge status={selectedInventory.status} size="sm" />
                    </div>
                    <p className="text-slate-500">
                      Clinic: <strong>{selectedInventory.clinic?.clinicName}</strong> ({selectedInventory.location})
                    </p>
                    <p className="text-slate-500">
                      Available Stock: <strong>{selectedInventory.quantity} specimens</strong>
                    </p>
                  </div>

                  {requestError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                    >
                      <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  {/* Requirement Selection */}
                  <div>
                    <label
                      htmlFor="select-requirement"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Pair with Active Requirement
                    </label>
                    <select
                      id="select-requirement"
                      value={selectedRequirementId}
                      onChange={(e) => setSelectedRequirementId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus-ring shadow-2xs"
                      required
                    >
                      <option value="">-- Select Active Requirement --</option>
                      {myRequirements
                        .filter((r) => r.status !== "FULFILLED" && r.status !== "CANCELLED")
                        .map((req) => (
                          <option key={req.id} value={req.id}>
                            #{req.id}: {req.quantity}x {req.arch} {req.toothType} ({req.status})
                          </option>
                        ))}
                    </select>
                    {myRequirements.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-800">
                        You do not have any active requirements. Please create a requirement first in "My Requirements" to track educational need.
                      </p>
                    )}
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label
                      htmlFor="request-quantity"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Quantity to Request (Max: {selectedInventory.quantity})
                    </label>
                    <input
                      id="request-quantity"
                      type="number"
                      min="1"
                      max={selectedInventory.quantity}
                      value={requestQty}
                      onChange={(e) => setRequestQty(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-ring shadow-2xs"
                      required
                    />
                  </div>

                  {/* Verification Notice */}
                  {!isApproved && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                      <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>
                        <strong>Action Disabled:</strong> Account verification must be approved by an administrator before resource requests can be dispatched to clinics. Your current status is{" "}
                        <span className="font-bold uppercase">{verificationStatus}</span>.
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedInventory(null)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-ring"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isApproved || submittingRequest || !selectedRequirementId}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingRequest && <Loader2 size={14} className="animate-spin" />}
                      <span>
                        {!isApproved
                          ? "Verification Required"
                          : submittingRequest
                          ? "Submitting..."
                          : "Send Request to Clinic"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

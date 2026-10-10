import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Calendar,
  Building,
  CheckCircle,
  Package,
  X,
  AlertCircle,
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
    loadInventories();
    loadStudentRequirements();
    loadProfile();
  }, [loadInventories, loadStudentRequirements, loadProfile]);

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
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
            Browse Listed Educational Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time availability directly posted by certified dental clinics.
          </p>
        </div>

        {/* Verification Status Banner */}
        {studentProfile?.student?.verificationStatus &&
          studentProfile.student.verificationStatus !== "APPROVED" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <span className="font-bold">
                  {studentProfile.student.verificationStatus === "PENDING"
                    ? "Verification Pending: "
                    : "Verification Declined: "}
                </span>
                {studentProfile.student.verificationStatus === "PENDING"
                  ? "Your student account is awaiting administrator approval. You can browse clinic inventory and post requirements, but submitting requests requires verified approval."
                  : "Your student credentials could not be verified. Browsing is permitted, but submitting requests is disabled."}
              </div>
            </div>
          )}

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tooth Type
              </label>
              <select
                value={filterTooth}
                onChange={(e) => setFilterTooth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                {TOOTH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "ALL" ? "All Tooth Types" : t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dental Arch
              </label>
              <select
                value={filterArch}
                onChange={(e) => setFilterArch(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                {ARCH_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a === "ALL" ? "All Arches" : a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Location
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder="Filter by city..."
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Min Quantity
              </label>
              <input
                type="number"
                min="1"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredList.length}</strong> listed items
          </span>
          <button
            onClick={() => {
              setFilterTooth("ALL");
              setFilterArch("ALL");
              setFilterLocation("");
              setMinQty(1);
            }}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Reset Filters
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-16 text-center text-sm text-slate-400">
              Loading available inventory...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Package size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No matching inventory found</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                No clinics have listed specimens matching these filters yet. You can post a requirement and enable <strong>Notify Me</strong> to get alerted when matching inventory is added.
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-500 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {item.arch} ARCH
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900">{item.toothType}</h3>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    {item.specificTooth && (
                      <p>
                        <span className="font-semibold text-slate-700">Specific Tooth:</span> {item.specificTooth}
                      </p>
                    )}
                    {item.condition && (
                      <p>
                        <span className="font-semibold text-slate-700">Condition:</span> {item.condition}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Package size={14} className="text-emerald-700" />
                      {item.quantity} available in stock
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400" />
                      {item.location}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building size={14} className="text-slate-400" />
                      {item.clinic?.clinicName || "Dental Clinic"} {item.clinic?.doctorName ? `(${item.clinic.doctorName})` : ""}
                    </p>

                    {(item.availableFrom || item.availableUntil) && (
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={13} />
                        {item.availableFrom ? new Date(item.availableFrom).toLocaleDateString() : "Now"} –{" "}
                        {item.availableUntil ? new Date(item.availableUntil).toLocaleDateString() : "Indefinite"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => openRequestModal(item)}
                    disabled={item.status !== "AVAILABLE" || item.quantity <= 0}
                    className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request from Clinic →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedInventory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Request Resource from {selectedInventory.clinic?.clinicName || "Clinic"}
                </h3>
                <button
                  onClick={() => setSelectedInventory(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {requestSuccess ? (
                <div className="my-6 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">
                  <CheckCircle size={28} className="mx-auto mb-2 text-emerald-600" />
                  {requestSuccess}
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="mt-4 space-y-4">
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    <p>
                      <strong>Specimen:</strong> {selectedInventory.quantity}x {selectedInventory.arch} {selectedInventory.toothType}
                    </p>
                    <p>
                      <strong>Clinic:</strong> {selectedInventory.clinic?.clinicName} ({selectedInventory.location})
                    </p>
                  </div>

                  {requestError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {requestError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pair with Your Active Requirement
                    </label>
                    <select
                      value={selectedRequirementId}
                      onChange={(e) => setSelectedRequirementId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-600"
                      required
                    >
                      <option value="">-- Select Requirement --</option>
                      {myRequirements
                        .filter((r) => r.status !== "FULFILLED" && r.status !== "CANCELLED")
                        .map((req) => (
                          <option key={req.id} value={req.id}>
                            #{req.id}: {req.quantity}x {req.arch} {req.toothType} ({req.status})
                          </option>
                        ))}
                    </select>
                    {myRequirements.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        You do not have any active requirements. Please create a requirement first in the "My Requirements" tab.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Quantity to Request (Max: {selectedInventory.quantity})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedInventory.quantity}
                      value={requestQty}
                      onChange={(e) => setRequestQty(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  {studentProfile?.student?.verificationStatus !== "APPROVED" && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>
                        <strong>Approval Required:</strong> Only approved students can submit resource requests to clinics. Your account verification status is currently{" "}
                        <span className="font-semibold">{studentProfile?.student?.verificationStatus || "PENDING"}</span>.
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedInventory(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        studentProfile?.student?.verificationStatus !== "APPROVED" ||
                        submittingRequest ||
                        !selectedRequirementId
                      }
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {studentProfile?.student?.verificationStatus !== "APPROVED"
                        ? "Approval Required to Request"
                        : submittingRequest
                        ? "Submitting..."
                        : "Send Request to Clinic"}
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

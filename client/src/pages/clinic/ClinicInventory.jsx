import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  MapPin,
  Calendar,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

const TOOTH_TYPES = ["INCISOR", "CANINE", "PREMOLAR", "MOLAR"];
const ARCH_TYPES = ["MAXILLARY", "MANDIBULAR", "BOTH"];
const INVENTORY_STATUSES = ["AVAILABLE", "UNAVAILABLE", "EXPIRED"];

const initialForm = {
  toothType: "INCISOR",
  arch: "MAXILLARY",
  specificTooth: "",
  condition: "",
  quantity: 5,
  location: "Hyderabad",
  availableFrom: "",
  availableUntil: "",
  status: "AVAILABLE",
};

export default function ClinicInventory() {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const [clinicProfile, setClinicProfile] = useState(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/inventory?mine=true");
      setInventories(res.data?.inventories || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory records.");
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
    loadInventory();
    loadProfile();
  }, [loadInventory, loadProfile]);

  function openCreateModal() {
    if (clinicProfile?.clinic?.verificationStatus !== "APPROVED") {
      setError(
        "Access denied. Your clinic account must be verified and approved by an administrator before publishing inventory."
      );
      return;
    }
    setEditingItem(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setForm({
      toothType: item.toothType,
      arch: item.arch,
      specificTooth: item.specificTooth || "",
      condition: item.condition || "",
      quantity: item.quantity,
      location: item.location,
      availableFrom: item.availableFrom ? item.availableFrom.slice(0, 10) : "",
      availableUntil: item.availableUntil ? item.availableUntil.slice(0, 10) : "",
      status: item.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        toothType: form.toothType,
        arch: form.arch,
        quantity: parseInt(form.quantity, 10),
        location: form.location.trim(),
        status: form.status,
      };
      if (form.specificTooth.trim()) payload.specificTooth = form.specificTooth.trim();
      if (form.condition.trim()) payload.condition = form.condition.trim();
      if (form.availableFrom) payload.availableFrom = new Date(form.availableFrom).toISOString();
      if (form.availableUntil) payload.availableUntil = new Date(form.availableUntil).toISOString();

      if (editingItem) {
        await api.put(`/inventory/${editingItem.id}`, payload);
        setSuccessMsg("Inventory record updated successfully!");
      } else {
        await api.post("/inventory", payload);
        setSuccessMsg("Inventory record created! Compatible students with Notify Me enabled were notified.");
      }

      setModalOpen(false);
      loadInventory();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save inventory.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to remove this inventory item?")) return;
    try {
      await api.delete(`/inventory/${id}`);
      setInventories((prev) => prev.filter((item) => item.id !== id));
      setSuccessMsg("Inventory removed successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete inventory.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              My Clinic Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage listed educational material lots, quantities, and availability schedules.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            disabled={clinicProfile?.clinic?.verificationStatus !== "APPROVED"}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clinicProfile?.clinic?.verificationStatus !== "APPROVED" ? (
              "Approval Required to Publish"
            ) : (
              <>
                <Plus size={18} /> Add New Inventory Lot
              </>
            )}
          </button>
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
                  ? "Your clinic registration is awaiting administrator approval. You can view existing records, but publishing new inventory lots requires verified approval."
                  : "Your clinic credentials could not be verified. Publishing inventory is disabled."}
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

        {/* Inventory Cards */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading inventory...</div>
          ) : inventories.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Package size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No inventory listed yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Add your clinic's available dental specimens to enable automatic student matching and educational resource coordination.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Add Your First Inventory Lot
              </button>
            </div>
          ) : (
            inventories.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {item.quantity}x {item.arch} {item.toothType}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin size={13} className="text-slate-400" /> {item.location}
                      </span>
                      {item.specificTooth && (
                        <span>
                          <strong>Tooth:</strong> {item.specificTooth}
                        </span>
                      )}
                      {item.condition && (
                        <span>
                          <strong>Condition:</strong> {item.condition}
                        </span>
                      )}
                      {(item.availableFrom || item.availableUntil) && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar size={13} />
                          {item.availableFrom ? new Date(item.availableFrom).toLocaleDateString() : "Now"} –{" "}
                          {item.availableUntil ? new Date(item.availableUntil).toLocaleDateString() : "Indefinite"}
                        </span>
                      )}
                      <span className="text-slate-400">
                        Listed {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                      title="Remove inventory item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Add / Edit Inventory */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingItem ? "Edit Inventory Lot" : "List New Inventory Lot"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tooth Type *
                    </label>
                    <select
                      value={form.toothType}
                      onChange={(e) => setForm({ ...form, toothType: e.target.value })}
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
                      value={form.arch}
                      onChange={(e) => setForm({ ...form, arch: e.target.value })}
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
                      Quantity Available *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
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
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                      value={form.specificTooth}
                      onChange={(e) => setForm({ ...form, specificTooth: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Condition (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sound, Extracted clean"
                      value={form.condition}
                      onChange={(e) => setForm({ ...form, condition: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Available From
                    </label>
                    <input
                      type="date"
                      value={form.availableFrom}
                      onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Available Until
                    </label>
                    <input
                      type="date"
                      value={form.availableUntil}
                      onChange={(e) => setForm({ ...form, availableUntil: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    {INVENTORY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingItem ? "Update Inventory" : "Create Inventory"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

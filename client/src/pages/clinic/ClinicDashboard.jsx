import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  Clock,
  CheckCircle,
  Plus,
  AlertCircle,
  Building,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

export default function ClinicDashboard() {
  const [profile, setProfile] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const [meRes, invRes, reqRes] = await Promise.all([
        api.get("/auth/me").catch(() => null),
        api.get("/inventory?mine=true").catch(() => ({ data: { inventories: [] } })),
        api.get("/requests").catch(() => ({ data: { requests: [] } })),
      ]);

      if (meRes?.data?.user) {
        setProfile(meRes.data.user);
      }
      setInventories(invRes?.data?.inventories || []);
      setRequests(reqRes?.data?.requests || []);
    } catch {
      setErrorMsg("Failed to load clinic dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const clinicData = profile?.clinic || {};
  const totalStock = inventories.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const acceptedRequests = requests.filter((r) => r.status === "ACCEPTED");

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Verification Status Banner */}
        {clinicData.verificationStatus === "PENDING" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <span className="font-bold">Clinic Verification Pending: </span>
              Your clinic registration for <strong>{clinicData.clinicName || "your clinic"}</strong> is currently under review by ToothLink administrators. Publishing new inventory lots and accepting student requests require verified administrator approval.
            </div>
          </div>
        )}

        {clinicData.verificationStatus === "REJECTED" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div className="text-sm">
              <span className="font-bold">Clinic Verification Declined: </span>
              Your clinic registration could not be verified. Publishing inventory and accepting student requests are disabled. Please contact support.
            </div>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-emerald-950 p-8 text-white shadow-xl shadow-emerald-950/10 sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Building size={13} /> CERTIFIED CLINICAL PARTNER
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {clinicData.clinicName || profile?.name || "Clinic Portal"}
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-emerald-100">
              {clinicData.doctorName ? `Lead Doctor: ${clinicData.doctorName}` : "Coordinate educational resource availability for dental students."}{" "}
              • {clinicData.location || "Partner Location"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/clinic/inventory"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 transition"
              >
                <Plus size={17} /> Add New Inventory
              </Link>
              <Link
                to="/clinic/requests"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
              >
                <Layers size={17} /> Review Requests ({pendingRequests.length})
              </Link>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Lots</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{inventories.length}</span>
              <Package className="text-emerald-700 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Available Teeth</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-emerald-700">{totalStock}</span>
              <Sparkles className="text-emerald-700 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Student Requests</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-amber-600">{pendingRequests.length}</span>
              <Clock className="text-amber-600 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted / In Progress</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{acceptedRequests.length}</span>
              <CheckCircle className="text-teal-600 opacity-70" size={24} />
            </div>
          </div>
        </section>

        {/* Two Columns: Actionable Sections */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Pending Student Requests */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Incoming Requests</h3>
                <p className="text-xs text-slate-500">Awaiting your approval or fulfillment</p>
              </div>
              <Link to="/clinic/requests" className="text-xs font-bold text-emerald-700 hover:underline">
                View all ({requests.length}) →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No requests waiting for review. New student requests will appear here.
                </div>
              ) : (
                pendingRequests.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {r.quantity}x {r.inventory?.toothType || "specimens"}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Student: <span className="font-medium text-slate-700">{r.student?.user?.name || "Student"}</span> ({r.student?.institution})
                      </p>
                    </div>
                    <Link
                      to="/clinic/requests"
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Respond →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Inventory List */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">My Listed Inventory</h3>
                <p className="text-xs text-slate-500">Currently listed specimens in your clinic catalog</p>
              </div>
              <Link to="/clinic/inventory" className="text-xs font-bold text-emerald-700 hover:underline">
                Manage inventory →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading inventory...</div>
              ) : inventories.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No inventory listed yet. <Link to="/clinic/inventory" className="text-emerald-700 underline font-semibold">Add inventory</Link> to enable student matching.
                </div>
              ) : (
                inventories.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {item.quantity}x {item.arch} {item.toothType}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Condition: {item.condition || "Standard"} • {item.location}
                      </p>
                    </div>
                    <Link
                      to="/clinic/inventory"
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

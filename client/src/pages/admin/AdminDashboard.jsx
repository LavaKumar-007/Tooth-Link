import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Building,
  GraduationCap,
  Package,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import AdminVerificationQueue from "./AdminVerificationQueue";
import api from "../../lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/admin/stats");
      setStats(res.data?.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load platform statistics.");
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Top Hero Banner */}
        <section className="rounded-3xl bg-emerald-950 p-8 text-white shadow-xl shadow-emerald-950/10 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200">
                <ShieldCheck size={13} /> PLATFORM ADMINISTRATION
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                ToothLink Control Center
              </h1>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-emerald-100">
                Verify student institutional credentials and clinic partner licenses, oversee resource distribution, and maintain trusted education standards.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
              >
                <Users size={17} /> Browse All Users ({stats?.totalUsers || 0})
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Platform Overview Metrics */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Verifications
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-amber-600">
                {stats?.totalPendingVerifications || 0}
              </span>
              <ShieldAlert className="text-amber-600 opacity-70" size={24} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {stats?.pendingStudentVerifications || 0} Students • {stats?.pendingClinicVerifications || 0} Clinics
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registered Students
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.totalStudents || 0}
              </span>
              <GraduationCap className="text-emerald-700 opacity-70" size={24} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {stats?.approvedStudentVerifications || 0} Approved • {stats?.pendingStudentVerifications || 0} Pending
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registered Clinics
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.totalClinics || 0}
              </span>
              <Building className="text-emerald-700 opacity-70" size={24} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {stats?.approvedClinicVerifications || 0} Approved • {stats?.pendingClinicVerifications || 0} Pending
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Specimens
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-emerald-700">
                {stats?.availableInventory || 0}
              </span>
              <Package className="text-emerald-700 opacity-70" size={24} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {stats?.totalRequests || 0} Total Requests ({stats?.fulfilledRequests || 0} Fulfilled)
            </p>
          </div>
        </section>

        {/* Verification Queue Section */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Account Verification Queue
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Review and act on pending student institutional credentials and clinic partner licenses.
            </p>
          </div>

          <AdminVerificationQueue onActionComplete={loadStats} />
        </section>
      </main>
    </div>
  );
}

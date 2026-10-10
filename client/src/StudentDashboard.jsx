import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Layers,
  Sparkles,
  MapPin,
} from "lucide-react";
import Navbar from "./components/Navbar";
import StatusBadge from "./components/StatusBadge";
import api from "./lib/api";

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [meRes, reqsRes, requestsRes] = await Promise.all([
          api.get("/auth/me").catch(() => null),
          api.get("/requirements").catch(() => ({ data: { requirements: [] } })),
          api.get("/requests").catch(() => ({ data: { requests: [] } })),
        ]);

        if (isMounted) {
          if (meRes?.data?.user) {
            setProfile(meRes.data.user);
          }
          setRequirements(reqsRes?.data?.requirements || []);
          setRequests(requestsRes?.data?.requests || []);
        }
      } catch {
        if (isMounted) {
          setErrorMsg("Failed to load dashboard data. Please refresh.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const studentData = profile?.student || {};
  const activeRequirements = requirements.filter(
    (r) => r.status === "WAITING" || r.status === "MATCH_FOUND"
  );
  const matchFoundCount = requirements.filter((r) => r.status === "MATCH_FOUND").length;
  const pendingRequestsCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Verification Status Warning if Pending or Rejected */}
        {studentData.verificationStatus === "PENDING" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <span className="font-bold">Verification Pending: </span>
              Your student credentials for <strong>{studentData.institution || "your university"}</strong> are currently under review by ToothLink administrators. You may browse clinic inventory and post study requirements, but submitting specimen requests requires administrator approval.
            </div>
          </div>
        )}

        {studentData.verificationStatus === "REJECTED" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div className="text-sm">
              <span className="font-bold">Verification Declined: </span>
              Your student submission could not be verified. You may browse inventory and create requirements, but requesting educational material is disabled. Please contact support to submit updated credentials.
            </div>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-emerald-950 p-8 text-white shadow-xl shadow-emerald-950/10 sm:p-10">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles size={13} /> DENTAL EDUCATION HUB
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome, {profile?.name || "Student"}!
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-emerald-100">
              {studentData.institution ? `${studentData.institution} • Student ID: ${studentData.studentId}` : "Manage requirements and find certified educational resources."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/student/requirements"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 transition"
              >
                <ClipboardList size={17} /> Post Requirement
              </Link>
              <Link
                to="/student/search"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition"
              >
                <Search size={17} /> Browse Inventory
              </Link>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Requirements</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{activeRequirements.length}</span>
              <ClipboardList className="text-emerald-700 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matches Found</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-emerald-700">{matchFoundCount}</span>
              <Sparkles className="text-emerald-700 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{pendingRequestsCount}</span>
              <Clock className="text-amber-600 opacity-70" size={24} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fulfilled</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                {requests.filter((r) => r.status === "FULFILLED").length}
              </span>
              <CheckCircle className="text-purple-600 opacity-70" size={24} />
            </div>
          </div>
        </section>

        {/* Quick Nav Cards */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <Link
            to="/student/search"
            className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Search size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">Find Listed Resources</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Explore real-time clinic inventories with tooth types, locations, and availability dates.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              Open catalog <ArrowRight size={13} />
            </span>
          </Link>

          <Link
            to="/student/requirements"
            className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <ClipboardList size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">Manage Requirements</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Post educational requirements, view automated matches, and toggle Notify Me alerts.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              Manage requirements <ArrowRight size={13} />
            </span>
          </Link>

          <Link
            to="/student/requests"
            className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Layers size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">Track Resource Requests</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Monitor clinic acceptance, status transitions, and material fulfillments in one place.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              View requests <ArrowRight size={13} />
            </span>
          </Link>
        </section>

        {/* Recent Activity Sections */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Active Requirements List */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Active Requirements</h3>
                <p className="text-xs text-slate-500">Live requirements seeking compatible inventory</p>
              </div>
              <Link
                to="/student/requirements"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading requirements...</div>
              ) : activeRequirements.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No active requirements. <Link to="/student/requirements" className="text-emerald-700 underline font-semibold">Post a requirement</Link> to start matching.
                </div>
              ) : (
                activeRequirements.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {req.quantity}x {req.arch} {req.toothType}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {req.location}
                        </span>
                        {req.specificTooth && <span>Tooth: {req.specificTooth}</span>}
                        {req.notifyEnabled && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Notify Me Active
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/student/requirements"
                      className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      {req.status === "MATCH_FOUND" ? "View Matches" : "Details"}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Requests Status */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Resource Requests</h3>
                <p className="text-xs text-slate-500">Track clinic responses and dispatch statuses</p>
              </div>
              <Link
                to="/student/requests"
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No requests submitted yet. Find matches to request study specimens.
                </div>
              ) : (
                requests.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {r.quantity} {r.inventory?.toothType || "specimens"}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Clinic: <span className="font-medium text-slate-700">{r.clinic?.clinicName || "Partner Clinic"}</span> • {r.clinic?.location}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.requestedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
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

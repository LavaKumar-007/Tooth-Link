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
  GraduationCap,
  ShieldCheck,
  Building,
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
  const verificationStatus = studentData.verificationStatus || "PENDING";
  const activeRequirements = requirements.filter(
    (r) => r.status === "WAITING" || r.status === "MATCH_FOUND"
  );
  const matchFoundCount = requirements.filter((r) => r.status === "MATCH_FOUND").length;
  const pendingRequestsCount = requests.filter((r) => r.status === "PENDING").length;
  const fulfilledRequestsCount = requests.filter((r) => r.status === "FULFILLED").length;

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-2xs"
          >
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Verification Alert Banner: PENDING */}
        {verificationStatus === "PENDING" && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 shadow-2xs">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold">Institutional Credential Verification Pending: </span>
              Your enrollment details for{" "}
              <strong>{studentData.institution || "your dental institution"}</strong> are currently under review by ToothLink administrators. You can explore listed clinic inventory and post study requirements; submitting specimen allocation requests requires account approval.
            </div>
          </div>
        )}

        {/* Verification Alert Banner: REJECTED */}
        {verificationStatus === "REJECTED" && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-950 shadow-2xs">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-bold">Credential Verification Declined: </span>
              Your student credentials could not be verified by the administrator. Specimen requests remain locked. Please review your enrollment documentation or contact platform support.
            </div>
          </div>
        )}

        {/* Compact Clinical Executive Header */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                  <GraduationCap size={14} className="text-emerald-700" />
                  <span>DENTAL STUDENT PORTAL</span>
                </span>
                <StatusBadge status={verificationStatus} size="sm" />
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#123d35] sm:text-3xl">
                Welcome back, {profile?.name || "Dental Student"}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {studentData.institution && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Building size={14} className="text-slate-400" />
                    {studentData.institution}
                  </span>
                )}
                {studentData.studentId && (
                  <span>
                    ID: <strong className="text-slate-700">{studentData.studentId}</strong>
                  </span>
                )}
                {studentData.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    {studentData.location}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action CTA Group */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/student/requirements"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs transition hover:bg-emerald-800 focus-ring"
              >
                <ClipboardList size={16} />
                <span>Post Requirement</span>
              </Link>

              <Link
                to="/student/search"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-emerald-600 focus-ring"
              >
                <Search size={16} className="text-emerald-700" />
                <span>Browse Inventory</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Metrics Grid */}
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Requirements</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">{activeRequirements.length}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ClipboardList size={18} />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Seeking compatible inventory</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Matches Ready</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{matchFoundCount}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Sparkles size={18} />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-emerald-800 font-medium">Ready for resource review</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Requests</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{pendingRequestsCount}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock size={18} />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Awaiting clinic decision</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Fulfilled</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-purple-700">{fulfilledRequestsCount}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <CheckCircle size={18} />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Coordinated materials</p>
          </div>
        </section>

        {/* Quick Workflow Navigation Cards */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            to="/student/search"
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-card focus-ring"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Search size={20} />
            </div>
            <h2 className="mt-3 text-sm sm:text-base font-bold text-slate-900">
              Find Listed Resources
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Explore real-time clinic inventories with tooth types, locations, and availability dates.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              Open catalog <ArrowRight size={13} />
            </span>
          </Link>

          <Link
            to="/student/requirements"
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-card focus-ring"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <ClipboardList size={20} />
            </div>
            <h2 className="mt-3 text-sm sm:text-base font-bold text-slate-900">
              Manage Requirements
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Post educational requirements, view automated matches, and manage Notify Me alerts.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              View requirements <ArrowRight size={13} />
            </span>
          </Link>

          <Link
            to="/student/requests"
            className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-card focus-ring"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Layers size={20} />
            </div>
            <h2 className="mt-3 text-sm sm:text-base font-bold text-slate-900">
              Track Resource Requests
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Monitor clinic responses, review acceptance states, and coordinate material collection.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
              View requests <ArrowRight size={13} />
            </span>
          </Link>
        </section>

        {/* Recent Activity Sections */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Active Requirements List */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Active Requirements</h2>
                <p className="text-xs text-slate-500">Live study needs seeking compatible stock</p>
              </div>
              <Link
                to="/student/requirements"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded px-1"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading requirements...</div>
              ) : activeRequirements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active requirements.{" "}
                  <Link to="/student/requirements" className="text-emerald-700 underline font-semibold">
                    Post a requirement
                  </Link>{" "}
                  to initiate matching.
                </div>
              ) : (
                activeRequirements.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8fbfa]/50 p-3.5 transition hover:bg-slate-50/80"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {req.quantity}x {req.arch} {req.toothType}
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {req.location}
                        </span>
                        {req.specificTooth && <span>Tooth #{req.specificTooth}</span>}
                        {req.notifyEnabled && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Notify Me Active
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/student/requirements"
                      className="inline-flex items-center justify-center rounded-xl border border-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition focus-ring"
                    >
                      {req.status === "MATCH_FOUND" ? "View Matches" : "Details"}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Requests Status */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Resource Requests</h2>
                <p className="text-xs text-slate-500">Track clinic responses and material status</p>
              </div>
              <Link
                to="/student/requests"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded px-1"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No requests submitted yet. Browse catalog or check matches to submit requests.
                </div>
              ) : (
                requests.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8fbfa]/50 p-3.5 transition hover:bg-slate-50/80"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {r.quantity}x {r.inventory?.toothType || "Specimens"}
                        </span>
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Clinic: <strong className="text-slate-700">{r.clinic?.clinicName || "Partner Clinic"}</strong> • {r.clinic?.location}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
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

import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  Layers,
} from "lucide-react";
import AuthPage from "./AuthPage";
import StudentDashboard from "./StudentDashboard";
import StudentInventorySearch from "./pages/student/StudentInventorySearch";
import StudentRequirements from "./pages/student/StudentRequirements";
import StudentRequests from "./pages/student/StudentRequests";
import StudentNotificationsPage from "./pages/student/StudentNotificationsPage";
import ClinicDashboard from "./pages/clinic/ClinicDashboard";
import ClinicInventory from "./pages/clinic/ClinicInventory";
import ClinicRequests from "./pages/clinic/ClinicRequests";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminUsers from "./pages/admin/AdminUsers";
import StatusBadge from "./components/StatusBadge";

// Protect dashboard routes from unauthenticated users and unauthorized roles
function ProtectedRoute({ children, allowedRole }) {
  const token = sessionStorage.getItem("toothlink_token");

  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("toothlink_user") || "null");
  } catch {
    user = null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && String(user.role || "").toUpperCase() !== allowedRole) {
    const defaultRoute = {
      STUDENT: "/student/dashboard",
      CLINIC: "/clinic/dashboard",
      ADMIN: "/admin",
    }[String(user.role || "").toUpperCase()] || "/";

    return <Navigate to={defaultRoute} replace />;
  }

  return children;
}

// ToothLink landing page
function LandingPage() {
  const token = sessionStorage.getItem("toothlink_token");
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("toothlink_user") || "null");
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toUpperCase();
  const portalPath = {
    STUDENT: "/student/dashboard",
    CLINIC: "/clinic/dashboard",
    ADMIN: "/admin",
  }[role] || "/student/dashboard";

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35] flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-3 focus-ring rounded-xl p-1"
            aria-label="ToothLink Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-black text-white shadow-sm">
              T
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#123d35]">
                ToothLink
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
                Dental Education Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {token && user ? (
              <Link
                to={portalPath}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-ring"
              >
                <span>Go to {role ? role.charAt(0) + role.slice(1).toLowerCase() : ""} Portal</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-emerald-800 transition focus-ring"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-ring"
                >
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              {/* Left Column: Headline and Dual CTAs */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                  <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                  <span>Verified Educational Resource Coordination</span>
                </div>

                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#123d35] sm:text-5xl lg:text-6xl leading-[1.15]">
                  Bridging Clinical Practice &{" "}
                  <span className="text-emerald-700 block">
                    Dental Education.
                  </span>
                </h1>

                <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl">
                  ToothLink is a verified technology network connecting accredited dental clinics with dental students to coordinate non-viable extracted teeth for preclinical anatomical training, endodontic practice, and educational study.
                </p>

                {/* Distinct Student and Clinic Calls to Action */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Link
                    to="/register"
                    state={{ role: "STUDENT" }}
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-ring"
                  >
                    <GraduationCap size={18} />
                    <span>Join as Dental Student</span>
                    <ArrowRight size={15} />
                  </Link>

                  <Link
                    to="/register"
                    state={{ role: "CLINIC" }}
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:border-emerald-600 focus-ring"
                  >
                    <Building2 size={18} className="text-emerald-700" />
                    <span>Register as Dental Clinic</span>
                  </Link>
                </div>

                {/* Trust and Clinical Parameters */}
                <div className="mt-8 pt-6 border-t border-slate-200/70 grid grid-cols-3 gap-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>Verified Credentials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>Anatomical Criteria</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>Direct Coordination</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Specimen Coordination Preview Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-modal">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Live Coordination Flow
                      </p>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        Educational Resource Matching
                      </h2>
                    </div>
                    <StatusBadge status="MATCH_FOUND" size="sm" />
                  </div>

                  {/* Simulated Matching Item */}
                  <div className="mt-4 space-y-3.5">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                            Specimen Lot #402
                          </span>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            Premolars (Maxillary Arch)
                          </p>
                        </div>
                        <StatusBadge status="AVAILABLE" size="sm" />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="rounded-lg bg-white/80 p-2 border border-emerald-100/60">
                          <span className="text-slate-400 block text-[10px]">Quantity</span>
                          <span className="font-semibold text-slate-900">4 Specimens</span>
                        </div>
                        <div className="rounded-lg bg-white/80 p-2 border border-emerald-100/60">
                          <span className="text-slate-400 block text-[10px]">Sanitization</span>
                          <span className="font-semibold text-slate-900">Autoclaved / 10% Neutral</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Requirement Pair */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">
                          Study Requirement #188
                        </span>
                        <StatusBadge status="WAITING" size="sm" />
                      </div>
                      <p className="mt-1 text-xs text-slate-700 font-medium">
                        Endodontic Canal Access Study • Required by End of Term
                      </p>
                    </div>

                    {/* Alert Trigger Preview */}
                    <div className="rounded-2xl bg-[#123d35] p-4 text-white shadow-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-300" />
                        <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                          Automated "Notify Me" Alerts
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-200 leading-relaxed">
                        Students activate notification tracking; our matching engine detects compatible tooth types and notifies the student immediately via in-app alert.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Clear Workflow Section */}
        <section
          id="how-it-works"
          className="border-t border-b border-slate-200/70 bg-white py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Educational Workflow
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#123d35] tracking-tight">
                How ToothLink Operates
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                A structured three-step protocol ensuring non-viable extracted teeth are accounted for, sanitized, and coordinated exclusively for dental education.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-slate-200 bg-[#f8fbfa] p-7 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-700">01</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Building2 size={18} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Clinics List Available Resources
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Participating clinics record sanitized specimen lots, defining anatomical classification (incisor, canine, premolar, molar), dental arch, preservation condition, and availability.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
                  Verified clinic accountability
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-slate-200 bg-[#f8fbfa] p-7 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-700">02</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Search size={18} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Students Find Matching Needs
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Dental students search published lots or post specific academic requirements. Automated matching pairs compatible specimens and alerts the student when stock is available.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
                  Deterministic criteria matching
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-slate-200 bg-[#f8fbfa] p-7 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-700">03</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Layers size={18} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Coordinate Requests & Allocation
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Verified students submit structured requests with study context. Clinics review, approve, and hand over specimens for preclinical study with complete audit trail integrity.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
                  Controlled request lifecycle
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pre-footer Call to Action */}
        <section className="py-16 sm:py-20 bg-[#f8fbfa]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 shadow-card">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123d35] tracking-tight">
                Ready to coordinate educational dental resources?
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Join verified students and clinics today. Account registration requires institutional or clinical verification before requests can be submitted or lots published.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-ring"
                >
                  Create an Account →
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-ring"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">ToothLink — Dental Education Resource Network</p>
        <p className="mt-1 text-slate-500 max-w-xl mx-auto">
          Intended strictly for accredited preclinical training and academic research. Non-viable extracted specimens must be handled according to standard infection control protocols.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      {/* Student Protected Pages */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/search"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentInventorySearch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/requirements"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentRequirements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/requests"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/notifications"
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentNotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Clinic Protected Pages */}
      <Route
        path="/clinic/dashboard"
        element={
          <ProtectedRoute allowedRole="CLINIC">
            <ClinicDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clinic/inventory"
        element={
          <ProtectedRoute allowedRole="CLINIC">
            <ClinicInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clinic/requests"
        element={
          <ProtectedRoute allowedRole="CLINIC">
            <ClinicRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clinic/notifications"
        element={
          <ProtectedRoute allowedRole="CLINIC">
            <StudentNotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Pages */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verifications"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminVerifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

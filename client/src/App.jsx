import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
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
    <main className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-bold text-white shadow-sm">
            T
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">ToothLink</h1>
            <p className="text-xs text-slate-500">Dental Education Network</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {token && user ? (
            <Link
              to={portalPath}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 shadow-sm"
            >
              Go to Portal →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2.5 font-semibold text-slate-700 hover:text-emerald-700"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-emerald-700 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-800 shadow-sm"
              >
                Get started →
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-10 lg:py-24">
        <div>
          <div className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
            Connecting certified clinics with dental students
          </div>

          <h2 className="mt-7 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl text-[#123d35]">
            The study resources exist.
            <span className="mt-2 block text-emerald-700">
              The coordination shouldn't be difficult.
            </span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            ToothLink connects verified dental clinics with dental students to facilitate legitimate educational resource access through structured inventory, deterministic matching, and automated alerts.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-emerald-700 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800"
            >
              Join the Network →
            </Link>

            <a
              href="#how-it-works"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:border-emerald-600 transition"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-500 font-medium">
            <span>✓ Structured inventory</span>
            <span>✓ Match notifications</span>
            <span>✓ Verified clinics & students</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white bg-white p-6 shadow-2xl shadow-emerald-900/10 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Resource Coordination Dashboard
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            Find your next specimen match
          </h3>

          <div className="mt-7 space-y-4">
            <div className="rounded-2xl border border-slate-100 p-5 transition hover:border-emerald-200">
              <h4 className="font-bold text-slate-800">Student Requirements</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Specify tooth type, dental arch, quantity, and deadline for anatomical studies.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 p-5 transition hover:border-emerald-200">
              <h4 className="font-bold text-slate-800">Clinic Inventory</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Clinics list sanitized, legitimate educational teeth and respond directly to requests.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-950 p-5 text-white shadow-md">
              <span className="font-semibold text-emerald-200 text-xs uppercase tracking-wider">
                Automated Matching
              </span>
              <h4 className="mt-2 text-lg font-bold">
                Keep your requirement active.
              </h4>
              <p className="mt-1 text-sm leading-6 text-white/80">
                Enable "Notify Me" to receive immediate in-app and email alerts when matching specimens become available.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-slate-100 bg-white px-6 py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900">How ToothLink Works</h2>
            <p className="mt-2 text-slate-500 text-sm">A transparent four-step workflow designed for dental education.</p>
          </div>
          <div className="grid max-w-7xl gap-8 md:grid-cols-4">
            {[
              ["01", "Register & Verify", "Join as a dental student or clinic and complete quick credential verification."],
              ["02", "Specify or List", "Students post study requirements while clinics list available tooth lots."],
              ["03", "Deterministic Matching", "Our matching engine pairs compatible tooth types, arches, quantities, and locations."],
              ["04", "Request & Fulfill", "Students submit requests, clinics accept, and materials are coordinated responsibly."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-slate-100 p-6 bg-[#f8fbfa]/60">
                <p className="font-black text-xl text-emerald-700">{number}</p>
                <h3 className="mt-3 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-slate-500">
        ToothLink — Verified Dental Education Resource Coordination Platform.
      </footer>
    </main>
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

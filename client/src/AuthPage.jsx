import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import api from "./lib/api";

const initialForm = {
  name: "",
  email: "",
  password: "",
  institution: "",
  studentId: "",
  clinicName: "",
  doctorName: "",
  location: "",
  verificationDocument: "",
};

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const location = useLocation();
  const navigate = useNavigate();

  // Pre-select role if navigated from landing page with state
  const initialRole = location.state?.role === "CLINIC" ? "CLINIC" : "STUDENT";
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin) {
        const endpoint =
          role === "STUDENT"
            ? "/auth/register/student"
            : "/auth/register/clinic";

        const docValue = form.verificationDocument?.trim() || null;

        const payload =
          role === "STUDENT"
            ? {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                institution: form.institution.trim(),
                studentId: form.studentId.trim(),
                location: form.location.trim(),
                verificationDocument: docValue,
              }
            : {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                clinicName: form.clinicName.trim(),
                doctorName: form.doctorName.trim(),
                location: form.location.trim(),
                verificationDocument: docValue,
              };

        await api.post(endpoint, payload);

        navigate("/login", {
          replace: true,
          state: {
            message: "Registration submitted successfully. Please sign in with your credentials.",
          },
        });
        return;
      }

      // Clear any old client-side session before attempting login
      sessionStorage.removeItem("toothlink_token");
      sessionStorage.removeItem("toothlink_user");

      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const data = response.data;

      const token =
        data?.token ??
        data?.accessToken ??
        data?.data?.token ??
        data?.data?.accessToken;

      const user =
        data?.user ??
        data?.data?.user ??
        data?.data ??
        data;

      const userRole = String(user?.role ?? "").toUpperCase();

      if (!token) {
        throw new Error(
          "The login response did not contain a recognized authentication token."
        );
      }

      if (!["STUDENT", "CLINIC", "ADMIN"].includes(userRole)) {
        throw new Error(
          "The login response did not contain a recognized user role."
        );
      }

      // Save the session only after validating the login response
      sessionStorage.setItem("toothlink_token", token);
      sessionStorage.setItem("toothlink_user", JSON.stringify(user));

      const destination = {
        STUDENT: "/student/dashboard",
        CLINIC: "/clinic/dashboard",
        ADMIN: "/admin",
      }[userRole] || "/";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to authenticate. Please verify your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition shadow-2xs";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fbfa] px-4 py-12 sm:px-6 lg:px-8 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-lg">
        {/* Back Link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-800 transition focus-ring rounded-lg px-2 py-1"
        >
          <ArrowLeft size={16} />
          <span>Back to ToothLink</span>
        </Link>

        {/* Auth Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-modal sm:p-9">
          {/* Brand Mark */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <ShieldCheck size={26} />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {isLogin ? "Secure Login" : "Credential Verification"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#123d35]">
            {isLogin ? "Welcome back" : "Join ToothLink"}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isLogin
              ? "Sign in to access your dashboard, requirements, and requests."
              : "Register your account for verified dental education resource access."}
          </p>

          {/* Success Message Banner (e.g. redirected after registration) */}
          {location.state?.message && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 font-medium leading-relaxed"
            >
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{location.state.message}</span>
            </div>
          )}

          {/* Role Selection Tabs for Registration */}
          {!isLogin && (
            <div className="mt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Account Type
              </label>
              <div
                role="tablist"
                aria-label="Account Types"
                className="grid grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "STUDENT"}
                  onClick={() => setRole("STUDENT")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition focus-ring ${
                    role === "STUDENT"
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <GraduationCap
                      size={18}
                      className={role === "STUDENT" ? "text-emerald-700" : "text-slate-400"}
                    />
                    <span>Dental Student</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 font-normal">
                    Undergraduate / Resident
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "CLINIC"}
                  onClick={() => setRole("CLINIC")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition focus-ring ${
                    role === "CLINIC"
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Building2
                      size={18}
                      className={role === "CLINIC" ? "text-emerald-700" : "text-slate-400"}
                    />
                    <span>Dental Clinic</span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 font-normal">
                    Licensed Dental Practice
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-medium leading-relaxed"
            >
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="auth-name"
                  className={inputClass}
                  name="name"
                  value={form.name}
                  onChange={update}
                  autoComplete="name"
                  placeholder="e.g. Dr. Jane Doe / John Smith"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                className={inputClass}
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                autoComplete="email"
                placeholder="name@institution.edu"
                required
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  className={`${inputClass} pr-10`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={update}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus-ring rounded-lg"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin && role === "STUDENT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="auth-institution"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Dental College / University
                  </label>
                  <input
                    id="auth-institution"
                    className={inputClass}
                    name="institution"
                    value={form.institution}
                    onChange={update}
                    placeholder="e.g. Apex Dental College"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-studentId"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Student / Roll ID
                  </label>
                  <input
                    id="auth-studentId"
                    className={inputClass}
                    name="studentId"
                    value={form.studentId}
                    onChange={update}
                    placeholder="e.g. STU-2026-081"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && role === "CLINIC" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="auth-clinicName"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Clinic / Hospital Name
                  </label>
                  <input
                    id="auth-clinicName"
                    className={inputClass}
                    name="clinicName"
                    value={form.clinicName}
                    onChange={update}
                    placeholder="e.g. Metro Dental Care"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-doctorName"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                  >
                    Head Doctor / Licensee
                  </label>
                  <input
                    id="auth-doctorName"
                    className={inputClass}
                    name="doctorName"
                    value={form.doctorName}
                    onChange={update}
                    placeholder="e.g. Dr. Sarah Jenkins, BDS"
                    required
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label
                  htmlFor="auth-location"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  City & State Location
                </label>
                <input
                  id="auth-location"
                  className={inputClass}
                  name="location"
                  value={form.location}
                  onChange={update}
                  placeholder="e.g. Bangalore, Karnataka"
                  required
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <label
                  htmlFor="auth-doc"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  {role === "STUDENT"
                    ? "Student ID Card / Enrollment URL (Optional)"
                    : "Clinic License / Registration URL (Optional)"}
                </label>
                <input
                  id="auth-doc"
                  className={inputClass}
                  type="url"
                  name="verificationDocument"
                  value={form.verificationDocument}
                  onChange={update}
                  placeholder="https://drive.google.com/your-id.pdf"
                />
                <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                  Provide a secure link to your institutional credential for priority administrator review.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>
                {loading
                  ? "Processing..."
                  : isLogin
                    ? "Sign In"
                    : "Submit Registration"}
              </span>
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            {isLogin ? "Need a ToothLink account?" : "Already registered with ToothLink?"}{" "}
            <Link
              to={isLogin ? "/register" : "/login"}
              className="font-bold text-emerald-700 hover:text-emerald-900 focus-ring rounded px-1"
            >
              {isLogin ? "Create an account" : "Sign in here"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

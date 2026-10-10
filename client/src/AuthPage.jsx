
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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
  const [role, setRole] = useState("STUDENT");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

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
                name: form.name,
                email: form.email,
                password: form.password,
                institution: form.institution,
                studentId: form.studentId,
                location: form.location,
                verificationDocument: docValue,
              }
            : {
                name: form.name,
                email: form.email,
                password: form.password,
                clinicName: form.clinicName,
                doctorName: form.doctorName,
                location: form.location,
                verificationDocument: docValue,
              };

        await api.post(endpoint, payload);

        navigate("/login", {
          replace: true,
          state: {
            message: "Registration submitted. Please log in.",
          },
        });
        return;
      }

      // Clear any old client-side session before attempting login.
      sessionStorage.removeItem("toothlink_token");
      sessionStorage.removeItem("toothlink_user");

      const response = await api.post("/auth/login", {
        email: form.email,
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
          "The login response did not contain a recognized JWT token."
        );
      }

      if (!["STUDENT", "CLINIC", "ADMIN"].includes(userRole)) {
        throw new Error(
          "The login response did not contain a recognized user role."
        );
      }

      // Save the session only after validating the login response.
      sessionStorage.setItem("toothlink_token", token);
      sessionStorage.setItem("toothlink_user", JSON.stringify(user));

      const destination = {
        STUDENT: "/student/dashboard",
        CLINIC: "/clinic/dashboard",
        ADMIN: "/admin",
      }[userRole];

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to authenticate. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fbfa] px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} /> Back to ToothLink
        </Link>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={26} />
          </div>

          <h1 className="text-3xl font-extrabold text-[#123d35]">
            {isLogin ? "Welcome back" : "Join ToothLink"}
          </h1>

          <p className="mt-2 leading-6 text-slate-500">
            {isLogin
              ? "Log in to access your ToothLink account."
              : "Create an account for your dental education network."}
          </p>

          {location.state?.message && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {location.state.message}
            </p>
          )}

          {!isLogin && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["STUDENT", "Student"],
                ["CLINIC", "Clinic"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setRole(value)}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    role === value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Full name
                </label>
                <input
                  className={fieldClass}
                  name="name"
                  value={form.name}
                  onChange={update}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                className={fieldClass}
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                className={fieldClass}
                type="password"
                name="password"
                value={form.password}
                onChange={update}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={8}
              />
            </div>

            {!isLogin && role === "STUDENT" && (
              <>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Institution name
                  </label>
                  <input
                    className={fieldClass}
                    name="institution"
                    value={form.institution}
                    onChange={update}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Student ID
                  </label>
                  <input
                    className={fieldClass}
                    name="studentId"
                    value={form.studentId}
                    onChange={update}
                    required
                  />
                </div>
              </>
            )}

            {!isLogin && role === "CLINIC" && (
              <>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Clinic / hospital name
                  </label>
                  <input
                    className={fieldClass}
                    name="clinicName"
                    value={form.clinicName}
                    onChange={update}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Doctor name
                  </label>
                  <input
                    className={fieldClass}
                    name="doctorName"
                    value={form.doctorName}
                    onChange={update}
                    required
                  />
                </div>
              </>
            )}

            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Location
                </label>
                <input
                  className={fieldClass}
                  name="location"
                  value={form.location}
                  onChange={update}
                  placeholder="City, state"
                  required
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  {role === "STUDENT"
                    ? "Student ID / Verification Document Link (Optional)"
                    : "Clinic License / Verification Document Link (Optional)"}
                </label>
                <input
                  className={fieldClass}
                  type="url"
                  name="verificationDocument"
                  value={form.verificationDocument}
                  onChange={update}
                  placeholder="https://example.com/document.pdf"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Provide a link to your institutional credential for expedited administrator review.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isLogin ? "New to ToothLink?" : "Already have an account?"}{" "}
            <Link
              to={isLogin ? "/register" : "/login"}
              className="font-semibold text-emerald-700 hover:text-emerald-900"
            >
              {isLogin ? "Create account" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

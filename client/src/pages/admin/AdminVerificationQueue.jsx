import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  Building,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  FileQuestion,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import api from "../../lib/api";

export default function AdminVerificationQueue({ onActionComplete }) {
  const [activeTab, setActiveTab] = useState("STUDENTS"); // "STUDENTS" | "CLINICS"
  const [statusFilter, setStatusFilter] = useState("PENDING"); // "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  const [searchQuery, setSearchQuery] = useState("");

  const [students, setStudents] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [counts, setCounts] = useState({
    students: { pending: 0, approved: 0, rejected: 0, total: 0 },
    clinics: { pending: 0, approved: 0, rejected: 0, total: 0 },
    totalPending: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // "student" | "clinic"
    id: null,
    targetStatus: null, // "APPROVED" | "REJECTED"
    name: "",
    details: "",
    isSubmitting: false,
  });

  const fetchVerifications = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const res = await api.get(`/admin/verifications?status=${statusFilter}`);
        setStudents(res.data?.students || []);
        setClinics(res.data?.clinics || []);
        if (res.data?.counts) {
          setCounts(res.data.counts);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load verification queue. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleOpenConfirm = (type, item, targetStatus) => {
    const isStudent = type === "student";
    const name = isStudent
      ? item.user?.name || "Student Applicant"
      : item.clinicName || "Clinic Applicant";
    const details = isStudent
      ? `${item.institution} (Student ID: ${item.studentId})`
      : `Lead: Dr. ${item.doctorName} • ${item.location}`;

    setConfirmModal({
      isOpen: true,
      type,
      id: item.id,
      targetStatus,
      name,
      details,
      isSubmitting: false,
    });
  };

  const handleCloseConfirm = () => {
    if (!confirmModal.isSubmitting) {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleConfirmAction = async () => {
    const { type, id, targetStatus, name } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isSubmitting: true }));
    setError("");

    try {
      const endpoint =
        type === "student"
          ? `/admin/verifications/student/${id}`
          : `/admin/verifications/clinic/${id}`;

      await api.patch(endpoint, { status: targetStatus });

      setSuccessMsg(
        `Successfully marked ${type === "student" ? "student" : "clinic"} "${name}" as ${targetStatus}.`
      );
      setTimeout(() => setSuccessMsg(""), 4500);

      setConfirmModal({
        isOpen: false,
        type: null,
        id: null,
        targetStatus: null,
        name: "",
        details: "",
        isSubmitting: false,
      });

      // Refresh list and notify parent if provided
      await fetchVerifications(true);
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          `Failed to update ${type} verification status.`
      );
      setConfirmModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Filter students or clinics based on search query
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.user?.name || "").toLowerCase();
    const email = (s.user?.email || "").toLowerCase();
    const inst = (s.institution || "").toLowerCase();
    const stuId = (s.studentId || "").toLowerCase();
    const loc = (s.location || "").toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      inst.includes(q) ||
      stuId.includes(q) ||
      loc.includes(q)
    );
  });

  const filteredClinics = clinics.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const clinicName = (c.clinicName || "").toLowerCase();
    const doctorName = (c.doctorName || "").toLowerCase();
    const email = (c.user?.email || "").toLowerCase();
    const loc = (c.location || "").toLowerCase();
    return (
      clinicName.includes(q) ||
      doctorName.includes(q) ||
      email.includes(q) ||
      loc.includes(q)
    );
  });

  const currentCount =
    activeTab === "STUDENTS" ? counts.students : counts.clinics;

  return (
    <div className="space-y-6">
      {/* Verification Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
            Total Pending
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-900">
              {counts.totalPending}
            </span>
            <ShieldAlert size={20} className="text-amber-600 opacity-70" />
          </div>
          <p className="mt-1 text-[11px] text-amber-700/80">
            {counts.students.pending} Students • {counts.clinics.pending} Clinics
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Approved Students
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900">
              {counts.students.approved}
            </span>
            <GraduationCap size={20} className="text-emerald-700 opacity-70" />
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80">
            Active Student Accounts
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Approved Clinics
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900">
              {counts.clinics.approved}
            </span>
            <Building size={20} className="text-emerald-700 opacity-70" />
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80">
            Verified Partner Clinics
          </p>
        </div>

        <div className="rounded-2xl border border-red-200/80 bg-red-50/60 p-4">
          <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">
            Rejected Accounts
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-red-900">
              {counts.students.rejected + counts.clinics.rejected}
            </span>
            <XCircle size={20} className="text-red-600 opacity-70" />
          </div>
          <p className="mt-1 text-[11px] text-red-700/80">
            {counts.students.rejected} Students • {counts.clinics.rejected} Clinics
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {/* Navigation Tabs and Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
          {/* Primary Tabs: Students & Clinics */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("STUDENTS")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-sm ${
                activeTab === "STUDENTS"
                  ? "bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <GraduationCap size={16} />
              <span>Pending Students</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                  activeTab === "STUDENTS"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {counts.students.pending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("CLINICS")}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-sm ${
                activeTab === "CLINICS"
                  ? "bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Building size={16} />
              <span>Pending Clinics</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                  activeTab === "CLINICS"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {counts.clinics.pending}
              </span>
            </button>
          </div>

          {/* Action Row: Refresh & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Pills */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { label: "Pending", value: "PENDING", count: currentCount.pending },
                { label: "Approved", value: "APPROVED", count: currentCount.approved },
                { label: "Rejected", value: "REJECTED", count: currentCount.rejected },
                { label: "All", value: "ALL", count: currentCount.total },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === item.value
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchVerifications(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-50"
              title="Refresh queue data"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin text-emerald-700" : ""}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder={
              activeTab === "STUDENTS"
                ? "Search by student name, email, institution, ID, or location..."
                : "Search by clinic name, doctor, email, or location..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 py-2.5 pl-11 text-xs sm:text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          <Search size={16} className="absolute left-4 top-3 text-slate-400" />
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 animate-fadeIn">
            <CheckCircle size={18} className="text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900 animate-fadeIn">
            <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              <button
                onClick={() => fetchVerifications(true)}
                className="ml-3 underline text-red-800 hover:text-red-950 font-bold text-xs"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Verification Cards Queue */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={28} className="mx-auto animate-spin text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Loading verification queue...
              </p>
            </div>
          ) : activeTab === "STUDENTS" ? (
            filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
                <ShieldCheck size={40} className="mx-auto text-emerald-600" />
                <h3 className="mt-3 text-base font-bold text-slate-800">
                  {statusFilter === "PENDING"
                    ? "No Pending Students in Queue"
                    : `No Students Found (${statusFilter})`}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {statusFilter === "PENDING"
                    ? "All student credential registrations have been processed."
                    : `No student accounts currently match the filter "${statusFilter}".`}
                </p>
              </div>
            ) : (
              filteredStudents.map((stu) => (
                <div
                  key={stu.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          {stu.user?.name || "Student Applicant"}
                        </h3>

                        {/* Verification Status Badge */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            stu.verificationStatus === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : stu.verificationStatus === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {stu.verificationStatus === "APPROVED"
                            ? "✓ Verified & Approved"
                            : stu.verificationStatus === "REJECTED"
                              ? "✗ Rejected"
                              : "⏳ Pending Verification"}
                        </span>

                        {/* Account Status Badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            stu.user?.status === "ACTIVE"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          User Account: {stu.user?.status || "PENDING"}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid gap-2 text-xs sm:grid-cols-2 text-slate-600 pt-1">
                        <p className="flex items-center gap-1.5 font-medium text-slate-800">
                          <GraduationCap size={15} className="text-emerald-700 shrink-0" />
                          <span>
                            {stu.institution} • ID:{" "}
                            <span className="font-mono text-slate-900 font-semibold">
                              {stu.studentId}
                            </span>
                          </span>
                        </p>

                        <p className="flex items-center gap-1.5">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <span>{stu.user?.email || "No email"}</span>
                        </p>

                        <p className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span>{stu.location}</span>
                        </p>

                        <p className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>
                            Registered:{" "}
                            {new Date(stu.createdAt).toLocaleDateString([], {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </p>
                      </div>

                      {/* Verification Document Link */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        {stu.verificationDocument ? (
                          <a
                            href={stu.verificationDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-950"
                          >
                            <FileText size={14} className="text-emerald-700" />
                            <span>View Verification Document</span>
                            <ExternalLink size={12} className="text-emerald-700" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                            <FileQuestion size={14} />
                            <span>No verification document URL provided</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                      {stu.verificationStatus !== "APPROVED" && (
                        <button
                          onClick={() => handleOpenConfirm("student", stu, "APPROVED")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                        >
                          <CheckCircle size={15} />
                          <span>Approve Student</span>
                        </button>
                      )}

                      {stu.verificationStatus !== "REJECTED" && (
                        <button
                          onClick={() => handleOpenConfirm("student", stu, "REJECTED")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 hover:border-red-300"
                        >
                          <XCircle size={15} />
                          <span>Reject</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : filteredClinics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
              <ShieldCheck size={40} className="mx-auto text-emerald-600" />
              <h3 className="mt-3 text-base font-bold text-slate-800">
                {statusFilter === "PENDING"
                  ? "No Pending Clinics in Queue"
                  : `No Clinics Found (${statusFilter})`}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter === "PENDING"
                  ? "All clinic provider registrations have been reviewed."
                  : `No clinic accounts currently match the filter "${statusFilter}".`}
              </p>
            </div>
          ) : (
            filteredClinics.map((clinic) => (
              <div
                key={clinic.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {clinic.clinicName}
                      </h3>

                      {/* Verification Status Badge */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          clinic.verificationStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : clinic.verificationStatus === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {clinic.verificationStatus === "APPROVED"
                          ? "✓ Verified & Approved"
                          : clinic.verificationStatus === "REJECTED"
                            ? "✗ Rejected"
                            : "⏳ Pending Verification"}
                      </span>

                      {/* Account Status Badge */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          clinic.user?.status === "ACTIVE"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        User Account: {clinic.user?.status || "PENDING"}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid gap-2 text-xs sm:grid-cols-2 text-slate-600 pt-1">
                      <p className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Building size={15} className="text-emerald-700 shrink-0" />
                        <span>Lead Doctor: Dr. {clinic.doctorName}</span>
                      </p>

                      <p className="flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400 shrink-0" />
                        <span>{clinic.user?.email || "No email"}</span>
                      </p>

                      <p className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span>{clinic.location}</span>
                      </p>

                      <p className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>
                          Registered:{" "}
                          {new Date(clinic.createdAt).toLocaleDateString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </p>
                    </div>

                    {/* Verification Document Link */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {clinic.verificationDocument ? (
                        <a
                          href={clinic.verificationDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-950"
                        >
                          <FileText size={14} className="text-emerald-700" />
                          <span>View Clinic License / Credential</span>
                          <ExternalLink size={12} className="text-emerald-700" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                          <FileQuestion size={14} />
                          <span>No verification document URL provided</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    {clinic.verificationStatus !== "APPROVED" && (
                      <button
                        onClick={() => handleOpenConfirm("clinic", clinic, "APPROVED")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                      >
                        <CheckCircle size={15} />
                        <span>Approve Clinic</span>
                      </button>
                    )}

                    {clinic.verificationStatus !== "REJECTED" && (
                      <button
                        onClick={() => handleOpenConfirm("clinic", clinic, "REJECTED")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 hover:border-red-300"
                      >
                        <XCircle size={15} />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-black/5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  confirmModal.targetStatus === "APPROVED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {confirmModal.targetStatus === "APPROVED" ? (
                  <CheckCircle size={24} />
                ) : (
                  <XCircle size={24} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {confirmModal.targetStatus === "APPROVED"
                    ? `Approve ${confirmModal.type === "student" ? "Student" : "Clinic"}`
                    : `Reject ${confirmModal.type === "student" ? "Student" : "Clinic"}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmation required before status transition
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {confirmModal.name}
              </p>
              <p className="text-slate-500">{confirmModal.details}</p>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmModal.targetStatus === "APPROVED"
                ? confirmModal.type === "student"
                  ? "Approving this student will mark their credentials as verified and activate their account, allowing them to submit specimen requests."
                  : "Approving this clinic will mark their license as verified and activate their account, allowing them to publish inventory lots and accept requests."
                : `Rejecting this ${confirmModal.type} will restrict their account access and prevent them from utilizing platform exchange features.`}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseConfirm}
                disabled={confirmModal.isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmModal.isSubmitting}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
                  confirmModal.targetStatus === "APPROVED"
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {confirmModal.isSubmitting && (
                  <RefreshCw size={13} className="animate-spin" />
                )}
                <span>
                  {confirmModal.targetStatus === "APPROVED"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

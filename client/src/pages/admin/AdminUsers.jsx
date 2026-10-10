import React, { useState, useEffect, useCallback } from "react";
import { Search, Mail, Building, GraduationCap } from "lucide-react";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/admin/users");
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load platform users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      const matchInst = (u.student?.institution || "").toLowerCase().includes(q);
      const matchClinic = (u.clinic?.clinicName || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchInst && !matchClinic) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              Platform Users Directory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse and inspect all registered student, clinic, and administrative accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="CLINIC">Clinics</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-6 relative">
          <input
            type="text"
            placeholder="Search by name, email, university or clinic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 pl-11 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
          />
          <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Users List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading directory...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              No matching users found.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{u.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : u.role === "CLINIC"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {u.role}
                    </span>
                    <StatusBadge status={u.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail size={13} /> {u.email}
                    </span>
                    {u.student && (
                      <span className="flex items-center gap-1 text-slate-700">
                        <GraduationCap size={13} className="text-emerald-700" />
                        {u.student.institution} (ID: {u.student.studentId})
                      </span>
                    )}
                    {u.clinic && (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Building size={13} className="text-emerald-700" />
                        {u.clinic.clinicName} (Dr. {u.clinic.doctorName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

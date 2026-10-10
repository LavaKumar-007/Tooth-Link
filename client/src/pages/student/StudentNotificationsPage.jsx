import React, { useState, useEffect, useCallback } from "react";
import { Bell, Clock } from "lucide-react";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/notifications");
      setNotifications(res.data?.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#123d35]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123d35]">
              Notifications & Alerts
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Match updates, clinic decisions, and system alerts.
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {unreadCount} Unread
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Bell size={36} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-800">No notifications yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                You'll receive notifications when matching resources become available or when clinics respond to your requests.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start justify-between rounded-2xl border p-5 shadow-sm transition ${
                  notif.isRead
                    ? "border-slate-200/80 bg-white opacity-85"
                    : "border-emerald-300 bg-emerald-50/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={11} />
                    {new Date(notif.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="ml-4 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

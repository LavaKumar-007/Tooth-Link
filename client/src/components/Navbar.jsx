import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  User as UserIcon,
  Search,
  ClipboardList,
  Package,
  Layers,
  ShieldAlert,
} from "lucide-react";
import api from "../lib/api";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  let user = {};
  try {
    user = JSON.parse(sessionStorage.getItem("toothlink_user") || "{}");
  } catch {
    user = {};
  }

  const role = String(user.role || "").toUpperCase();

  // Fetch notifications periodically
  useEffect(() => {
    let isMounted = true;
    async function loadNotifications() {
      try {
        const res = await api.get("/notifications");
        if (isMounted) {
          setNotifications(res.data?.notifications || []);
          setUnreadCount(res.data?.unreadCount || 0);
        }
      } catch {
        // Silently catch if unauthenticated or network issue
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id, e) {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("toothlink_token");
    sessionStorage.removeItem("toothlink_user");
    navigate("/login", { replace: true });
  }

  const studentLinks = [
    { label: "Dashboard", path: "/student/dashboard", icon: Sparkles },
    { label: "Find Inventory", path: "/student/search", icon: Search },
    { label: "My Requirements", path: "/student/requirements", icon: ClipboardList },
    { label: "My Requests", path: "/student/requests", icon: Layers },
  ];

  const clinicLinks = [
    { label: "Dashboard", path: "/clinic/dashboard", icon: Sparkles },
    { label: "My Inventory", path: "/clinic/inventory", icon: Package },
    { label: "Incoming Requests", path: "/clinic/requests", icon: Layers },
  ];

  const adminLinks = [
    { label: "Overview", path: "/admin", icon: Sparkles },
    { label: "Verifications", path: "/admin/verifications", icon: ShieldAlert },
    { label: "Platform Users", path: "/admin/users", icon: UserIcon },
  ];

  const navLinks =
    role === "STUDENT"
      ? studentLinks
      : role === "CLINIC"
        ? clinicLinks
        : role === "ADMIN"
          ? adminLinks
          : [];

  const homePath =
    role === "STUDENT"
      ? "/student/dashboard"
      : role === "CLINIC"
        ? "/clinic/dashboard"
        : role === "ADMIN"
          ? "/admin"
          : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo & Role Badge */}
        <div className="flex items-center gap-6">
          <Link to={homePath} className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 font-black text-white shadow-sm">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#123d35]">
                  ToothLink
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {role}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4">
            {navLinks.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-emerald-700" : "text-slate-400"} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:outline-none"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl ring-1 ring-black/5 z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900">Notifications</h4>
                  <span className="text-xs text-slate-500">
                    {unreadCount} unread
                  </span>
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notif) => (
                      <div
                        key={notif.id}
                        className={`py-3 px-2 rounded-lg transition ${
                          notif.isRead ? "opacity-75" : "bg-emerald-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {notif.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock size={10} />
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
                              onClick={(e) => markAsRead(notif.id, e)}
                              className="shrink-0 text-slate-400 hover:text-emerald-700"
                              title="Mark as read"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {role === "STUDENT" && (
                  <div className="mt-3 border-t border-slate-100 pt-2 text-center">
                    <Link
                      to="/student/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      View all notifications →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Name Tag */}
          <div className="hidden sm:flex items-center gap-2 pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
              {(user.name || "U")[0]}
            </div>
            <span className="text-xs font-medium text-slate-700 max-w-[130px] truncate">
              {user.name || "Account"}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            title="Log out of session"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-emerald-700" : "text-slate-400"} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

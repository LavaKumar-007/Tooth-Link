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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setNotifDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  const allNotificationsPath =
    role === "CLINIC"
      ? "/clinic/notifications"
      : "/student/notifications";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo & Role Pill */}
        <div className="flex items-center gap-6">
          <Link
            to={homePath}
            className="flex items-center gap-2.5 focus-ring rounded-xl p-1"
            aria-label="ToothLink Portal Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 font-black text-white shadow-xs">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#123d35]">
                  ToothLink
                </span>
                {role && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                    {role}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            aria-label="Primary Portal Navigation"
            className="hidden md:flex items-center gap-1 pl-2"
          >
            {navLinks.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs lg:text-sm font-semibold transition focus-ring ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? "text-emerald-700 shrink-0" : "text-slate-400 shrink-0"}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Notifications, Account Tag, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-ring shadow-2xs"
              aria-label={`Notifications (${unreadCount} unread)`}
              aria-haspopup="true"
              aria-expanded={notifDropdownOpen}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu with Responsive Viewport Clamping */}
            {notifDropdownOpen && (
              <div
                role="region"
                aria-label="Notification panel"
                className="fixed sm:absolute inset-x-4 top-16 sm:inset-auto sm:right-0 sm:top-full mt-2 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-modal z-50 max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      Notifications
                    </h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 sm:hidden"
                    aria-label="Close notification panel"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-2 overflow-y-auto divide-y divide-slate-100 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className={`py-3 px-2 rounded-xl transition ${
                          notif.isRead ? "opacity-75" : "bg-emerald-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900">
                              {notif.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
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
                              type="button"
                              onClick={(e) => markAsRead(notif.id, e)}
                              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-emerald-700 transition focus-ring"
                              title="Mark as read"
                              aria-label="Mark notification as read"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {(role === "STUDENT" || role === "CLINIC") && (
                  <div className="mt-3 border-t border-slate-100 pt-2 text-center">
                    <Link
                      to={allNotificationsPath}
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 focus-ring rounded px-2 py-1"
                    >
                      View all notification history →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Name Tag & Status Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-emerald-900 border border-emerald-200">
              {(user.name || "U")[0]}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 max-w-[130px] truncate leading-tight">
                {user.name || "User"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">
                {user.institution || user.clinicName || (user.email ? user.email.split("@")[0] : role)}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 focus-ring shadow-2xs"
            title="Log out of session"
            aria-label="Log out of session"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-ring shadow-2xs"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-3 md:hidden shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="mb-3 flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-900">
                {(user.name || "U")[0]}
              </div>
              <span className="text-xs font-bold text-slate-800 truncate">
                {user.name || "Account"} ({role})
              </span>
            </div>
          </div>

          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {navLinks.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-emerald-700 shrink-0" : "text-slate-400 shrink-0"}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

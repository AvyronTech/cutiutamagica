import { useState, useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import avyronLogo from "@/assets/avyron-logo.jpg";
import { PwaInstallButton } from "@/admin/PwaInstallButton";
import type { AdminNotification } from "@/lib/admin-contracts";
import {
  dismissNotification,
  getAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/admin.functions";
import {
  LayoutDashboard,
  ShoppingCart,
  QrCode,
  BarChart3,
  Plug,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  ShoppingBag,
  Plus,
  Zap,
  Truck,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  TrendingUp,
  LogOut,
  Warehouse,
  FileText,
  RotateCcw,
  Store,
  Send,
  Users,
  Mail,
  BellRing,
  Bot,
  Volume2,
  VolumeX,
} from "lucide-react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/orders", label: "Comenzi", icon: ShoppingCart },
  { path: "/admin/products", label: "Produse", icon: ShoppingBag },
  { path: "/admin/inventory", label: "Stocuri", icon: Warehouse },
  { path: "/admin/shipping", label: "Livrare", icon: Truck },
  { path: "/admin/billing", label: "Facturare", icon: FileText },
  { path: "/admin/returns", label: "Retururi", icon: RotateCcw },
  { path: "/admin/financiar", label: "Financiar", icon: Wallet },
  { path: "/admin/platforms", label: "Platforme", icon: Store },
  { path: "/admin/posts", label: "Postări", icon: Send },
  { path: "/admin/customers", label: "Clienți", icon: Users },
  { path: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { path: "/admin/notifications", label: "Notificări", icon: BellRing },
  { path: "/admin/ai", label: "Agenți AI", icon: Bot },
  { path: "/admin/statistics", label: "Statistici", icon: BarChart3 },
  { path: "/admin/integrations", label: "Conectori", icon: Plug },
  { path: "/admin/qr-generator", label: "Coduri QR", icon: QrCode },
  { path: "/admin/settings", label: "Setări", icon: Settings },
];

const quickActions = [
  { label: "Comenzi", icon: Plus, path: "/admin/orders", color: "bg-purple-600" },
  { label: "Generează QR", icon: QrCode, path: "/admin/qr-generator", color: "bg-amber-600" },
  { label: "Verifică AWB", icon: Truck, path: "/admin/integrations", color: "bg-emerald-600" },
  { label: "Acces rapid", icon: Zap, path: "/admin/integrations", color: "bg-blue-600" },
];

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "alert":
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "target":
      return <Target className="w-4 h-4 text-purple-400" />;
    default:
      return <Info className="w-4 h-4 text-blue-400" />;
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(getAdminNotifications);
  const readNotification = useServerFn(markNotificationRead);
  const readAllNotifications = useServerFn(markAllNotificationsRead);
  const removeNotification = useServerFn(dismissNotification);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousUnread = useRef(0);
  const location = useRouterState({ select: (s) => s.location });

  const notificationsQuery = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => fetchNotifications(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const notifications = notificationsQuery.data?.notifications ?? [];

  const handleLogout = () => {
    window.location.assign("/cdn-cgi/access/logout");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setSoundEnabled(localStorage.getItem("cutiuta:notification-sound") === "on");
  }, []);

  useEffect(() => {
    if (soundEnabled && unreadCount > previousUnread.current && previousUnread.current > 0) {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.24);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.25);
      }
    }
    previousUnread.current = unreadCount;
  }, [soundEnabled, unreadCount]);

  const setNotificationsCache = (update: (items: AdminNotification[]) => AdminNotification[]) => {
    queryClient.setQueryData<{ notifications: AdminNotification[] }>(
      ["admin", "notifications"],
      (current) => ({ notifications: update(current?.notifications ?? []) }),
    );
  };

  const readMutation = useMutation({
    mutationFn: (notificationId: string) => readNotification({ data: { notificationId } }),
    onSuccess: (_, notificationId) =>
      setNotificationsCache((items) =>
        items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      ),
  });
  const readAllMutation = useMutation({
    mutationFn: () => readAllNotifications(),
    onSuccess: () =>
      setNotificationsCache((items) => items.map((item) => ({ ...item, read: true }))),
  });
  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) => removeNotification({ data: { notificationId } }),
    onSuccess: (_, notificationId) =>
      setNotificationsCache((items) => items.filter((item) => item.id !== notificationId)),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setFabOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showNotifications &&
        !target.closest(".notification-panel") &&
        !target.closest(".notification-trigger")
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifications]);

  // Close notifications on page navigation
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : "w-64 flex-shrink-0"
        } bg-[#0B1120] border-r border-[#1E293B] flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-purple-500/30">
              <img src={avyronLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white whitespace-nowrap">Cutiuța Magică</h1>
              <p className="text-[10px] text-purple-300 whitespace-nowrap font-medium">
                Admin Premium Control Panel
              </p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-[#1E293B] text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-white hover:bg-[#1E293B]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-purple-400" : "group-hover:text-white"}`}
                />
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Avyron Logo + Version */}
        <div className="p-4 border-t border-[#1E293B]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#334155]/50 opacity-70">
              <img src={avyronLogo} alt="Avyron" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <p className="text-xs text-slate-500">v2.1 • Premium</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 md:h-16 border-b border-[#1E293B] bg-[#0B1120]/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger button - mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-[#1E293B] text-slate-400 -ml-1"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <PwaInstallButton />
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notification-trigger relative p-2 rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Notification Panel - Fixed positioning for all pages */}
              {showNotifications && (
                <div className="notification-panel fixed right-4 top-14 md:top-16 w-80 md:w-96 bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl z-[100] max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-[#334155]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-semibold text-white">Notificări</h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-[10px] rounded-full font-medium">
                          {unreadCount} noi
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !soundEnabled;
                          setSoundEnabled(next);
                          localStorage.setItem("cutiuta:notification-sound", next ? "on" : "off");
                        }}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-[#334155] hover:text-white"
                        aria-label={soundEnabled ? "Oprește sunetele" : "Pornește sunetele"}
                        title={soundEnabled ? "Oprește sunetele" : "Pornește sunetele"}
                      >
                        {soundEnabled ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <VolumeX className="h-4 w-4" />
                        )}
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => readAllMutation.mutate()}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Marchează citite
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh] divide-y divide-[#334155]/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Nicio notificare</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.read && readMutation.mutate(notif.id)}
                          className={`p-3 hover:bg-[#0F172A]/50 transition-colors cursor-pointer ${
                            !notif.read ? "bg-purple-500/5 border-l-2 border-l-purple-500" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <NotificationIcon
                                type={
                                  notif.severity === "success"
                                    ? "success"
                                    : notif.severity === "warning" ||
                                        notif.severity === "error" ||
                                        notif.severity === "critical"
                                      ? "alert"
                                      : notif.type
                                }
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p
                                  className={`text-xs font-medium ${!notif.read ? "text-white" : "text-slate-300"}`}
                                >
                                  {notif.title}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissMutation.mutate(notif.id);
                                  }}
                                  className="p-0.5 rounded hover:bg-[#334155] text-slate-500 hover:text-slate-300"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{notif.message}</p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {new Date(notif.createdAt).toLocaleString("ro-RO")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-[#334155] bg-[#0F172A]/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500">Alerte operaționale D1</span>
                      </div>
                      <Link
                        to="/admin/settings"
                        onClick={() => setShowNotifications(false)}
                        className="text-[10px] text-purple-400 hover:text-purple-300"
                      >
                        Configurează →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-500/30">
                <img src={avyronLogo} alt="Admin" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-medium text-slate-200 hidden sm:inline">Admin</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                title="Deconectare"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0F172A] pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Floating Action Button - Mobile */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* FAB Menu Items */}
          {fabOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end mb-3">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={idx}
                    to={action.path}
                    className="flex items-center gap-3 animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => setFabOpen(false)}
                  >
                    <span className="bg-[#1E293B] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-[#334155]">
                      {action.label}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* FAB Button */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-xl flex items-center justify-center transition-all duration-300 ${
              fabOpen ? "rotate-45" : ""
            }`}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

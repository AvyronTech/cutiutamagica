import { useState, useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  Truck,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  UserRoundPlus,
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
  MessageCircle,
  Megaphone,
  DatabaseBackup,
  ShieldCheck,
  WandSparkles,
  Stars,
  Boxes,
  ChevronDown,
} from "lucide-react";
import { logoutAdminAccount } from "@/lib/admin-auth.functions";

type NavItem = { path: string; label: string; icon: typeof LayoutDashboard };

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Principal",
    items: [{ path: "/admin", label: "Prezentare generală", icon: LayoutDashboard }],
  },
  {
    label: "Comerț",
    items: [
      { path: "/admin/orders", label: "Comenzi", icon: ShoppingCart },
      { path: "/admin/products", label: "Produse", icon: ShoppingBag },
      { path: "/admin/chat", label: "Chat clienți", icon: MessageCircle },
      { path: "/admin/personalizations", label: "Personalizări", icon: WandSparkles },
    ],
  },
  {
    label: "Social Media Agent",
    items: [
      { path: "/admin/ai", label: "Agent Codex", icon: Bot },
      { path: "/admin/marketing", label: "Marketing", icon: Megaphone },
      { path: "/admin/posts", label: "Postări", icon: Send },
    ],
  },
  {
    label: "Operațiuni",
    items: [
      { path: "/admin/reviews", label: "Recenzii", icon: MessageCircle },
      { path: "/admin/inventory", label: "Stocuri", icon: Warehouse },
      { path: "/admin/suppliers", label: "Aprovizionare", icon: Boxes },
      { path: "/admin/billing", label: "Facturare", icon: FileText },
      { path: "/admin/shipping", label: "Livrare", icon: Truck },
      { path: "/admin/financiar", label: "Financiar", icon: Wallet },
      { path: "/admin/returns", label: "Retururi", icon: RotateCcw },
      { path: "/admin/platforms", label: "Canale de vânzare", icon: Store },
    ],
  },
  {
    label: "Clienți și creștere",
    items: [
      { path: "/admin/customers", label: "Clienți", icon: Users },
      { path: "/admin/rewards", label: "Magic Rewards", icon: Stars },
      { path: "/admin/referrals", label: "Recomandări", icon: UserRoundPlus },
      { path: "/admin/promotions", label: "Promoții", icon: Target },
      { path: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { path: "/admin/email", label: "E-mail și rapoarte", icon: Mail },
    ],
  },
  {
    label: "Analiză și control",
    items: [
      { path: "/admin/statistics", label: "Statistici", icon: BarChart3 },
      { path: "/admin/traffic", label: "Trafic", icon: TrendingUp },
      { path: "/admin/notifications", label: "Notificări", icon: BellRing },
      { path: "/admin/integrations", label: "Integrări", icon: Plug },
      { path: "/admin/accounts", label: "Conturi și dispozitive", icon: ShieldCheck },
      { path: "/admin/backups", label: "Backup", icon: DatabaseBackup },
      { path: "/admin/qr-generator", label: "Coduri QR", icon: QrCode },
      { path: "/admin/settings", label: "Setări", icon: Settings },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

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
  const logout = useServerFn(logoutAdminAccount);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    Operațiuni: true,
    "Clienți și creștere": true,
    "Analiză și control": true,
  });
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

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/auth");
    }
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
    <div className="admin-workspace relative flex h-dvh overflow-hidden bg-[#080f1e] text-slate-100">
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
        } flex flex-col border-r border-white/10 bg-[radial-gradient(circle_at_0_0,rgba(163,123,255,.12),transparent_34%),#0b1424] shadow-[16px_0_44px_rgba(0,0,0,.12)]`}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-2xl border border-amber-200/30 bg-amber-100/10 p-1 shadow-[0_8px_28px_rgba(233,190,104,.12)]">
              <img
                src="/brand/music-box-universal.webp"
                alt="Cutiuța Magică"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white whitespace-nowrap">Cutiuța Magică</h1>
              <p className="whitespace-nowrap text-[10px] font-medium tracking-[.14em] text-amber-200/80">
                ATELIER · ADMIN
              </p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Închide meniul"
              className="p-2 rounded-lg hover:bg-[#1E293B] text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Navigare administrare" className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => {
            const hasActiveItem = group.items.some(
              (item) =>
                location.pathname === item.path ||
                (item.path !== "/admin" && location.pathname.startsWith(`${item.path}/`)),
            );
            const collapsed = collapsedGroups[group.label] && !hasActiveItem;
            return (
              <section key={group.label} className="mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((current) => ({
                      ...current,
                      [group.label]: !current[group.label],
                    }))
                  }
                  className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-expanded={!collapsed}
                >
                  {group.label}
                  <ChevronDown className={`h-3 w-3 transition ${collapsed ? "-rotate-90" : ""}`} />
                </button>
                {!collapsed && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== "/admin" && location.pathname.startsWith(`${item.path}/`));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
                            isActive
                              ? "border-amber-200/25 bg-[linear-gradient(105deg,rgba(241,194,119,.17),rgba(164,125,233,.1))] text-white shadow-[inset_3px_0_0_#f4ce9f]"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[.07] hover:text-white"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-amber-200" : "text-slate-400 group-hover:text-white"}`}
                          />
                          <span className="whitespace-nowrap text-[13px] font-medium">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-medium text-slate-200">Cutiuța Magică</p>
          <p className="mt-1 text-[11px] text-slate-400">Comerț · conținut · relații clienți</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="relative z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#0c1627]/90 px-4 backdrop-blur-xl md:h-[76px] md:px-7">
          <div className="flex items-center gap-3">
            {/* Hamburger button - mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Deschide meniul"
                className="p-2 rounded-lg hover:bg-[#1E293B] text-slate-400 -ml-1"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="hidden min-w-0 md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-200/70">
                Cutiuța Magică / Administrare
              </p>
              <p className="truncate text-sm font-medium text-white">
                {navItems.find((item) => item.path === location.pathname)?.label ??
                  "Spațiu de lucru"}
              </p>
            </div>
            <div className="relative hidden lg:block lg:ml-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={navSearch}
                onChange={(event) => setNavSearch(event.target.value)}
                placeholder="Caută o secțiune…"
                className="w-60 rounded-xl border border-white/10 bg-white/[.05] py-2.5 pl-9 pr-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-amber-200/50"
              />
              {navSearch.trim() && (
                <div className="absolute left-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-[#334155] bg-[#101a2b] p-1.5 shadow-2xl">
                  {navItems
                    .filter((item) =>
                      item.label
                        .toLocaleLowerCase("ro-RO")
                        .includes(navSearch.toLocaleLowerCase("ro-RO")),
                    )
                    .slice(0, 7)
                    .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setNavSearch("")}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-[#1E293B] hover:text-white"
                      >
                        <item.icon className="h-4 w-4 text-purple-400" />
                        {item.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
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
                <div className="notification-panel fixed right-4 top-16 z-[100] flex max-h-[80vh] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#172237]/85 shadow-[0_24px_70px_rgba(0,0,0,.4)] backdrop-blur-2xl md:top-[76px]">
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
              <div
                className="grid h-8 w-8 place-items-center rounded-xl border border-amber-200/20 bg-amber-200/10 text-xs font-semibold text-amber-100"
                aria-hidden="true"
              >
                CM
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
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_92%_0%,rgba(116,93,162,.13),transparent_28%),linear-gradient(180deg,#0c1728,#0a1322)] p-4 pb-12 md:p-7">
          <div className="mx-auto w-full max-w-[1560px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

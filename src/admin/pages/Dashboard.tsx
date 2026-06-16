import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Calendar,
  Clock,
  Sun,
  Moon,
  Sunrise,
  Coffee
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { orders, platformStats } from '@/admin/data/mockData';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getAdminDashboard } from '@/lib/admin.functions';

const quickLinks = [
  { name: 'SameDay Courier', url: 'https://www.sameday.ro', color: '#F59E0B' },
  { name: 'FanCourier', url: 'https://www.fancourier.ro', color: '#10B981' },
  { name: 'Verificare AWB', url: 'https://www.sameday.ro/tracking', color: '#7C3AED' },
  { name: 'eMag Marketplace', url: 'https://marketplace.emag.ro', color: '#3B82F6' },
];

function getFormattedDate(): string {
  const now = new Date();
  const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getFormattedTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

function getGreeting(): { text: string; emoji: string; description: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) {
    return {
      text: 'Bună dimineața',
      emoji: '☀️',
      description: 'Începe o zi productivă! Verifică comenzile noi.',
      Icon: Sunrise
    };
  }
  if (hour >= 9 && hour < 12) {
    return {
      text: 'Bună dimineața',
      emoji: '☕',
      description: 'Timp perfect pentru procesarea comenzilor.',
      Icon: Coffee
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      text: 'Bună ziua',
      emoji: '🌤️',
      description: 'Verifică statusul livrărilor de azi.',
      Icon: Sun
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      text: 'Bună seara',
      emoji: '🌙',
      description: 'Rezumatul zilei - vezi ce ai realizat!',
      Icon: Moon
    };
  }
  return {
    text: 'Noapte bună',
    emoji: '🌙',
    description: 'Odihnește-te, mâine e o zi nouă!',
    Icon: Moon
  };
}

export default function Dashboard() {
  const fetchDashboard = useServerFn(getAdminDashboard);
  const { data: live } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => fetchDashboard(),
    staleTime: 30_000,
  });

  const liveStats = live?.stats;
  const stats = [
    {
      label: 'Comenzi Totale',
      value: liveStats ? String(liveStats.ordersTotal) : '—',
      change: liveStats ? `${liveStats.ordersCount30d} / 30z` : '',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'from-purple-500 to-purple-700',
    },
    {
      label: 'Venituri 30z',
      value: liveStats ? `${liveStats.revenue30d.toLocaleString('ro-RO')} RON` : '—',
      change: 'Live',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-700',
    },
    {
      label: 'Produse Active',
      value: liveStats ? `${liveStats.productsActive}` : '—',
      change: liveStats ? `/ ${liveStats.productsTotal} total` : '',
      trend: 'up' as const,
      icon: Package,
      color: 'from-emerald-500 to-emerald-700',
    },
    {
      label: 'Comenzi Deschise',
      value: liveStats ? String(liveStats.ordersOpen) : '—',
      change: 'În procesare',
      trend: 'up' as const,
      icon: Truck,
      color: 'from-cyan-500 to-cyan-700',
    },
  ];

  const recentOrders = (live?.recentOrders && live.recentOrders.length > 0)
    ? live.recentOrders
    : orders.slice(0, 7);
  const [currentTime, setCurrentTime] = useState(getFormattedTime());
  const greeting = getGreeting();

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getFormattedTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Title with Date - Dynamic greeting synced with time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white">{greeting.text}! {greeting.emoji}</h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm mt-1">{greeting.description}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1E293B]/60 border border-[#334155]/50">
          <Calendar className="w-4 h-4 text-purple-400" />
          <div className="text-right">
            <p className="text-xs md:text-sm font-medium text-white">{getFormattedDate()}</p>
            <div className="flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-slate-500" />
              <p className="text-[10px] text-slate-400">{currentTime} • Sincronizat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-3 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className={`flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-[11px] md:text-sm text-slate-400 mt-0.5 md:mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Orders - Takes 2 columns */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-white">Comenzi Recente</h3>
            <a href="/orders" className="text-purple-400 text-xs md:text-sm hover:text-purple-300 transition-colors">
              Vezi toate →
            </a>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1E293B]/50 transition-colors border-b border-[#334155]/30 last:border-0">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-purple-300">
                      {order.customer.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs md:text-sm font-medium text-slate-200 truncate">{order.customer}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium whitespace-nowrap ${
                        order.platform === 'Cutiuța Magică' ? 'platform-cutiuta' :
                        order.platform === 'eMag' ? 'platform-emag' :
                        order.platform === 'OLX' ? 'platform-olx' :
                        order.platform === 'Vinted' ? 'platform-vinted' :
                        order.platform === 'Instagram' ? 'platform-instagram' :
                        order.platform === 'TikTok' ? 'platform-tiktok' : 'platform-facebook'
                      }`}>
                        {order.platform}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-slate-400 truncate">{order.products}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs md:text-sm font-semibold text-white">{order.total} RON</p>
                  <span className={`text-[10px] md:text-xs ${
                    order.status === 'Nouă' ? 'text-blue-400' :
                    order.status === 'Procesare' ? 'text-amber-400' :
                    order.status === 'Expediată' ? 'text-purple-400' :
                    order.status === 'Livrată' ? 'text-emerald-400' : 'text-red-400'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Comenzi pe Platforme</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={platformStats}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
              >
                {platformStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {platformStats.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }}></div>
                  <span className="text-slate-300">{p.name}</span>
                </div>
                <span className="text-slate-400">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Acces Rapid</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {quickLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[#0F172A] border border-[#334155] hover:border-purple-500/50 transition-all group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${link.color}20` }}>
                <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: link.color }} />
              </div>
              <span className="text-xs md:text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">{link.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
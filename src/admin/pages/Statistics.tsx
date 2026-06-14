import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Repeat, Share2, Heart } from 'lucide-react';
import { monthlyStats, platformStats, deliveryStats } from '@/data/mockData';

const weeklyData = [
  { day: 'Lun', comenzi: 12, venituri: 1800 },
  { day: 'Mar', comenzi: 15, venituri: 2200 },
  { day: 'Mie', comenzi: 8, venituri: 1200 },
  { day: 'Joi', comenzi: 18, venituri: 2700 },
  { day: 'Vin', comenzi: 22, venituri: 3300 },
  { day: 'Sâm', comenzi: 25, venituri: 3800 },
  { day: 'Dum', comenzi: 14, venituri: 2100 }
];

const topProducts = [
  { name: 'Set bijuterii handmade', vanzari: 45, venituri: 8550 },
  { name: 'Cutie cadou premium', vanzari: 38, venituri: 4940 },
  { name: 'Brățară personalizată', vanzari: 32, venituri: 2400 },
  { name: 'Colier cu nume', vanzari: 28, venituri: 4060 },
  { name: 'Cercei argint', vanzari: 24, venituri: 2280 }
];

const socialMediaStats = [
  { name: 'Instagram', followers: 12400, engagement: 4.8, posts: 156, color: '#E1306C' },
  { name: 'Facebook', followers: 8900, engagement: 2.3, posts: 89, color: '#1877F2' },
  { name: 'TikTok', followers: 5600, engagement: 8.2, posts: 42, color: '#69C9D0' },
  { name: 'Pinterest', followers: 3200, engagement: 3.1, posts: 210, color: '#E60023' },
];

const socialGrowthData = [
  { month: 'Ian', instagram: 8200, facebook: 7100, tiktok: 1200, pinterest: 2100 },
  { month: 'Feb', instagram: 8800, facebook: 7300, tiktok: 1800, pinterest: 2300 },
  { month: 'Mar', instagram: 9400, facebook: 7600, tiktok: 2400, pinterest: 2500 },
  { month: 'Apr', instagram: 9900, facebook: 7900, tiktok: 3100, pinterest: 2600 },
  { month: 'Mai', instagram: 10600, facebook: 8200, tiktok: 3800, pinterest: 2800 },
  { month: 'Iun', instagram: 11200, facebook: 8400, tiktok: 4300, pinterest: 2900 },
  { month: 'Iul', instagram: 11500, facebook: 8500, tiktok: 4600, pinterest: 3000 },
  { month: 'Aug', instagram: 11800, facebook: 8600, tiktok: 4900, pinterest: 3000 },
  { month: 'Sep', instagram: 12000, facebook: 8700, tiktok: 5100, pinterest: 3100 },
  { month: 'Oct', instagram: 12100, facebook: 8800, tiktok: 5300, pinterest: 3100 },
  { month: 'Nov', instagram: 12200, facebook: 8850, tiktok: 5500, pinterest: 3150 },
  { month: 'Dec', instagram: 12400, facebook: 8900, tiktok: 5600, pinterest: 3200 },
];

const kpis = [
  { label: 'Venituri Totale', value: '95,200 RON', change: '+15.3%', trend: 'up', icon: DollarSign, color: 'from-purple-500 to-purple-700' },
  { label: 'Comenzi Totale', value: '583', change: '+12.5%', trend: 'up', icon: ShoppingBag, color: 'from-amber-500 to-amber-700' },
  { label: 'Clienți Unici', value: '342', change: '+8.1%', trend: 'up', icon: Users, color: 'from-emerald-500 to-emerald-700' },
  { label: 'Rată Returnare', value: '3.2%', change: '-0.5%', trend: 'down', icon: Repeat, color: 'from-cyan-500 to-cyan-700' }
];

export default function Statistics() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Statistici</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Analizează performanța magazinului și rețelelor sociale</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="glass-card rounded-xl p-3 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className={`flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                  {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.change}
                </div>
              </div>
              <p className="text-lg md:text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-[11px] md:text-sm text-slate-400 mt-0.5 md:mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Revenue */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Evoluție Venituri Lunare</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyStats}>
              <defs>
                <linearGradient id="colorVanzari" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }}
              />
              <Area type="monotone" dataKey="vanzari" stroke="#7C3AED" fillOpacity={1} fill="url(#colorVanzari)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Orders */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Comenzi Săptămâna Curentă</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }}
              />
              <Bar dataKey="comenzi" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Social Media Stats Section */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-pink-400" />
          Statistici Rețele Sociale
        </h2>
        
        {/* Social Media KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {socialMediaStats.map((social) => (
            <div key={social.name} className="glass-card rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: social.color }}></div>
                <span className="text-xs md:text-sm font-medium text-slate-300">{social.name}</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-white">{social.followers.toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-slate-400">urmăritori</p>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#334155]/50">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-pink-400" />
                  <span className="text-[10px] md:text-xs text-slate-300">{social.engagement}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] md:text-xs text-slate-300">{social.posts} post.</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Growth Chart */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Creștere Urmăritori (2024)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={socialGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
              <Line type="monotone" dataKey="instagram" stroke="#E1306C" strokeWidth={2} dot={false} name="Instagram" />
              <Line type="monotone" dataKey="facebook" stroke="#1877F2" strokeWidth={2} dot={false} name="Facebook" />
              <Line type="monotone" dataKey="tiktok" stroke="#69C9D0" strokeWidth={2} dot={false} name="TikTok" />
              <Line type="monotone" dataKey="pinterest" stroke="#E60023" strokeWidth={2} dot={false} name="Pinterest" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3">
            {socialMediaStats.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }}></div>
                <span className="text-xs text-slate-400">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Platform Distribution */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Distribuție Platforme</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={platformStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {platformStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
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

        {/* Delivery Methods */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Metode de Livrare</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={deliveryStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {deliveryStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {deliveryStats.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}></div>
                  <span className="text-slate-300">{d.name}</span>
                </div>
                <span className="text-slate-400">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Top Produse</h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 w-5">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-slate-200 truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-[#334155] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                        style={{ width: `${(product.vanzari / 45) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] md:text-xs text-slate-400">{product.vanzari}</span>
                  </div>
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-emerald-400 whitespace-nowrap">{product.venituri} RON</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Orders Line Chart */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Trend Comenzi Lunare</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
            <YAxis stroke="#94A3B8" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
            <Line type="monotone" dataKey="comenzi" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
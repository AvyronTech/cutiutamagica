import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Wallet,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const products = [
  { id: 'all', name: 'Toate produsele', revenue: 14200, expenses: 5100, orders: 95 },
  { id: '1', name: 'Set bijuterii handmade', revenue: 3800, expenses: 1200, orders: 20 },
  { id: '2', name: 'Cutie cadou premium', revenue: 2590, expenses: 800, orders: 20 },
  { id: '3', name: 'Brățară personalizată', revenue: 2250, expenses: 600, orders: 30 },
  { id: '4', name: 'Colier personalizat', revenue: 2175, expenses: 700, orders: 15 },
  { id: '5', name: 'Cutie muzicală vintage', revenue: 1592, expenses: 900, orders: 8 },
  { id: '6', name: 'Gravură personalizată', revenue: 1793, expenses: 900, orders: 2 },
];

const monthlyRevenue = [
  { month: 'Ian', venituri: 8200, cheltuieli: 3100, profit: 5100 },
  { month: 'Feb', venituri: 9100, cheltuieli: 3400, profit: 5700 },
  { month: 'Mar', venituri: 10500, cheltuieli: 3800, profit: 6700 },
  { month: 'Apr', venituri: 9800, cheltuieli: 3600, profit: 6200 },
  { month: 'Mai', venituri: 11200, cheltuieli: 4100, profit: 7100 },
  { month: 'Iun', venituri: 12800, cheltuieli: 4500, profit: 8300 },
  { month: 'Iul', venituri: 13500, cheltuieli: 4800, profit: 8700 },
  { month: 'Aug', venituri: 12100, cheltuieli: 4300, profit: 7800 },
  { month: 'Sep', venituri: 14200, cheltuieli: 5100, profit: 9100 },
  { month: 'Oct', venituri: 15800, cheltuieli: 5600, profit: 10200 },
  { month: 'Nov', venituri: 16500, cheltuieli: 5900, profit: 10600 },
  { month: 'Dec', venituri: 18200, cheltuieli: 6400, profit: 11800 },
];

const expenseCategories = [
  { name: 'Materiale', value: 35, color: '#7C3AED' },
  { name: 'Transport', value: 25, color: '#F59E0B' },
  { name: 'Marketing', value: 18, color: '#3B82F6' },
  { name: 'Comisioane', value: 12, color: '#10B981' },
  { name: 'Altele', value: 10, color: '#EF4444' },
];

const recentTransactions = [
  { id: 1, description: 'Vânzare - Set bijuterii handmade', amount: 189.99, type: 'income', date: '10 Iun', platform: 'Cutiuța Magică' },
  { id: 2, description: 'Comision eMag - Comandă #EM-456', amount: -12.50, type: 'expense', date: '10 Iun', platform: 'eMag' },
  { id: 3, description: 'Vânzare - Brățară personalizată x3', amount: 225.00, type: 'income', date: '9 Iun', platform: 'Instagram' },
  { id: 4, description: 'Transport SameDay - 5 colete', amount: -45.00, type: 'expense', date: '9 Iun', platform: 'Curier' },
  { id: 5, description: 'Vânzare - Cutie cadou premium', amount: 129.50, type: 'income', date: '9 Iun', platform: 'OLX' },
  { id: 6, description: 'Materiale - Argint 925 (50g)', amount: -180.00, type: 'expense', date: '8 Iun', platform: 'Furnizor' },
  { id: 7, description: 'Vânzare - Colier personalizat', amount: 145.00, type: 'income', date: '8 Iun', platform: 'TikTok' },
  { id: 8, description: 'Reclamă Instagram - Campanie', amount: -85.00, type: 'expense', date: '7 Iun', platform: 'Marketing' },
];

const reports = [
  { name: 'Raport Lunar - Mai 2026', type: 'PDF', date: '01.06.2026', size: '2.4 MB' },
  { name: 'Situație TVA - T2 2026', type: 'PDF', date: '15.05.2026', size: '1.8 MB' },
  { name: 'Raport Vânzări pe Platforme', type: 'Excel', date: '05.06.2026', size: '3.1 MB' },
  { name: 'Raport Cheltuieli Transport', type: 'PDF', date: '03.06.2026', size: '1.2 MB' },
];

export default function Financiar() {
  const [selectedPeriod, setSelectedPeriod] = useState('luna');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const currentProduct = products.find(p => p.id === selectedProduct) || products[0];
  const profit = currentProduct.revenue - currentProduct.expenses;
  const margin = currentProduct.revenue > 0 ? Math.round((profit / currentProduct.revenue) * 100) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Financiar</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Rapoarte financiare și statistici detaliate</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="saptamana">Săptămâna</option>
            <option value="luna">Luna</option>
            <option value="trimestru">Trimestru</option>
            <option value="an">An 2026</option>
          </select>
          <button className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Raport</span>
          </button>
        </div>
      </div>

      {/* Mini Cash Register - Product Selector */}
      <div className="glass-card rounded-xl p-4 md:p-5 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Mini Cash Register</h3>
            <p className="text-xs text-slate-400">Selectează un produs pentru detalii financiare</p>
          </div>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 max-w-[200px]"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Product Financial KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-slate-400">Venituri</span>
            </div>
            <p className="text-base md:text-lg font-bold text-white">{currentProduct.revenue.toLocaleString()} <span className="text-xs text-slate-400">RON</span></p>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-slate-400">Cheltuieli</span>
            </div>
            <p className="text-base md:text-lg font-bold text-white">{currentProduct.expenses.toLocaleString()} <span className="text-xs text-slate-400">RON</span></p>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-slate-400">Profit</span>
            </div>
            <p className="text-base md:text-lg font-bold text-emerald-400">{profit.toLocaleString()} <span className="text-xs text-slate-400">RON</span></p>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-400">Marja</span>
            </div>
            <p className="text-base md:text-lg font-bold text-white">{margin}%</p>
            <div className="w-full h-1.5 bg-[#334155] rounded-full mt-1.5">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full" style={{ width: `${margin}%` }}></div>
            </div>
          </div>
        </div>

        {selectedProduct !== 'all' && (
          <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-purple-300">
              <span className="font-medium">{currentProduct.orders} comenzi</span> procesate pentru acest produs
            </span>
          </div>
        )}
      </div>

      {/* Tranzacții Recente - MOVED UP */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-base md:text-lg font-semibold text-white">Tranzacții Recente</h3>
          <button className="text-purple-400 text-xs hover:text-purple-300 transition-colors">Vezi toate →</button>
        </div>
        <div className="space-y-1.5">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#1E293B]/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'income' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {tx.type === 'income' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-slate-200 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{tx.date}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-400">{tx.platform}</span>
                  </div>
                </div>
              </div>
              <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {tx.type === 'income' ? '+' : ''}{tx.amount} RON
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Venituri vs Cheltuieli Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-semibold text-white">Venituri vs Cheltuieli</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                <span className="text-[10px] text-slate-400">Venituri</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <span className="text-[10px] text-slate-400">Cheltuieli</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
              <Area type="monotone" dataKey="venituri" stroke="#7C3AED" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              <Area type="monotone" dataKey="cheltuieli" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Categories */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3">Categorii Cheltuieli</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                {expenseCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {expenseCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }}></div>
                  <span className="text-slate-300">{cat.name}</span>
                </div>
                <span className="text-slate-400">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Trend */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Evoluție Profit Net</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
            <YAxis stroke="#94A3B8" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }} />
            <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Reports - MOVED BELOW */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-base md:text-lg font-semibold text-white">Rapoarte</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium transition-colors border border-purple-500/30">
            <Receipt className="w-3.5 h-3.5" />
            Generează Raport Nou
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reports.map((report, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#0F172A] border border-[#334155]/50 hover:border-purple-500/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{report.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{report.date}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-400">{report.size}</span>
                  </div>
                </div>
              </div>
              <button className="p-1.5 rounded-md hover:bg-[#334155] text-slate-500 group-hover:text-purple-400 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
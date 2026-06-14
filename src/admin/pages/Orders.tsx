import { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  Package,
  Plus,
  X,
  Save,
  Edit3,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  XCircle,
  Copy,
  MessageSquare
} from 'lucide-react';
import { orders as allOrders, type Order, platformColors } from '@/admin/data/mockData';

const platforms = ['Toate', 'Cutiuța Magică', 'eMag', 'OLX', 'Vinted', 'Facebook', 'Instagram', 'TikTok'];
const statuses = ['Toate', 'Nouă', 'Procesare', 'Expediată', 'Livrată', 'Returnată', 'Anulată'];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'Nouă': return <AlertCircle className="w-3.5 h-3.5 text-blue-400" />;
    case 'Procesare': return <Clock className="w-3.5 h-3.5 text-amber-400" />;
    case 'Expediată': return <Truck className="w-3.5 h-3.5 text-purple-400" />;
    case 'Livrată': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case 'Returnată': return <RotateCcw className="w-3.5 h-3.5 text-red-400" />;
    case 'Anulată': return <XCircle className="w-3.5 h-3.5 text-gray-400" />;
    default: return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Nouă': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Procesare': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Expediată': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Livrată': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Returnată': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Anulată': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${colors[status] || ''}`}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const cls = platform === 'Cutiuța Magică' ? 'platform-cutiuta' :
    platform === 'eMag' ? 'platform-emag' :
    platform === 'OLX' ? 'platform-olx' :
    platform === 'Vinted' ? 'platform-vinted' :
    platform === 'Instagram' ? 'platform-instagram' :
    platform === 'TikTok' ? 'platform-tiktok' : 'platform-facebook';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {platform}
    </span>
  );
}

// Order Detail/Edit Panel
function OrderDetailPanel({ order, onClose, onUpdateStatus }: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
}) {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyAWB = () => {
    if (order.awb) {
      navigator.clipboard.writeText(order.awb);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveStatus = () => {
    onUpdateStatus(order.id, currentStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{order.orderNumber}</h3>
              <div className="flex items-center gap-2">
                <PlatformBadge platform={order.platform} />
                <span className="text-[10px] text-slate-500">{order.date}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#334155] text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Info */}
        <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Client</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">{order.customer}</span>
              <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30 transition-colors">
                <Phone className="w-3 h-3" />
                Sună
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>{order.address}, {order.city}</span>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalii Comandă</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Produse:</span>
              <span className="text-sm text-white">{order.products}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Total:</span>
              <span className="text-lg font-bold text-white">{order.total} RON</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Livrare:</span>
              <span className="text-sm text-slate-200">{order.deliveryMethod}</span>
            </div>
            {order.awb && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">AWB:</span>
                <button onClick={handleCopyAWB} className="flex items-center gap-1.5 text-sm text-purple-300 font-mono hover:text-purple-200">
                  {order.awb}
                  <Copy className="w-3 h-3" />
                  {copied && <span className="text-[10px] text-emerald-400">✓</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Update */}
        <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155]/50 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Actualizează Status</p>
          <div className="grid grid-cols-3 gap-2">
            {(['Nouă', 'Procesare', 'Expediată', 'Livrată', 'Returnată', 'Anulată'] as Order['status'][]).map((s) => (
              <button
                key={s}
                onClick={() => setCurrentStatus(s)}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentStatus === s
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 ring-1 ring-purple-500/30'
                    : 'bg-[#1E293B] text-slate-400 border border-[#334155] hover:text-white hover:border-[#475569]'
                }`}
              >
                <StatusIcon status={s} />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notă internă</p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adaugă o notă pentru această comandă..."
            rows={2}
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveStatus}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" /> Salvează
          </button>
          <a
            href={`/qr-generator?order=${order.orderNumber}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" /> QR
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Order Modal (Mini Cash Register)
function AddOrderModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customer: '',
    phone: '',
    address: '',
    city: '',
    platform: 'Cutiuța Magică' as Order['platform'],
    products: '',
    total: '',
    deliveryMethod: 'EasyBox' as Order['deliveryMethod'],
    notes: ''
  });

  const handleSubmit = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">🧾 Adaugă Comandă Nouă</h3>
            <p className="text-xs text-slate-400 mt-0.5">Mini casă de marcat</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#334155] text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#0F172A]/50 border border-[#334155]/50 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nume *</label>
                <input type="text" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Maria Popescu" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Telefon *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0721 234 567" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
            </div>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresă / EasyBox" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Oraș" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>

          <div className="p-3 rounded-xl bg-[#0F172A]/50 border border-[#334155]/50 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comandă</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Platformă</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Order['platform'] })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                  {Object.keys(platformColors).map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Livrare</label>
                <select value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value as Order['deliveryMethod'] })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                  <option value="EasyBox">EasyBox</option>
                  <option value="Curier SameDay">SameDay</option>
                  <option value="Curier FanCourier">FanCourier</option>
                  <option value="Curier Cargus">Cargus</option>
                  <option value="Curier DPD">DPD</option>
                  <option value="Ridicare personală">Ridicare</option>
                </select>
              </div>
            </div>
            <input type="text" value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} placeholder="Produse (ex: Set bijuterii x2)" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Total (RON) *</label>
                <input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="189.99" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notă</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opțional" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Salvează Comanda
          </button>
          <button onClick={onClose} className="px-5 py-3 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors">
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(allOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Toate');
  const [selectedStatus, setSelectedStatus] = useState('Toate');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.products.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatform === 'Toate' || order.platform === selectedPlatform;
    const matchesStatus = selectedStatus === 'Toate' || order.status === selectedStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Comenzi</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">{filteredOrders.length} comenzi • Gestionare multi-platformă</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddOrder(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adaugă Comandă</span>
            <span className="sm:hidden">Adaugă</span>
          </button>
          <button className="hidden sm:flex items-center gap-2 px-3 py-2.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-300 rounded-lg text-xs font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Caută client, nr. comandă..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg border transition-colors md:hidden ${
                showFilters ? 'bg-purple-600/20 border-purple-500/30 text-purple-300' : 'bg-[#0F172A] border-[#334155] text-slate-400'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'flex' : 'hidden md:flex'}`}>
            <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              {platforms.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              {statuses.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List - Clean card-based design for both mobile and desktop */}
      <div className="space-y-2 md:space-y-3">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className="glass-card rounded-xl p-3 md:p-4 cursor-pointer hover:border-purple-500/30 hover:bg-[#1E293B]/80 transition-all group"
          >
            <div className="flex items-center justify-between">
              {/* Left: Main info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-[#334155]/50">
                  <span className="text-xs font-bold text-purple-300">
                    {order.customer.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{order.customer}</p>
                    <PlatformBadge platform={order.platform} />
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                    <span className="text-[10px] md:text-xs text-slate-500 font-mono">{order.orderNumber}</span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] md:text-xs text-slate-500 truncate">{order.products}</span>
                  </div>
                </div>
              </div>

              {/* Right: Price, status, date */}
              <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 ml-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">{order.date}</p>
                  <p className="text-[10px] text-slate-500">{order.deliveryMethod}</p>
                </div>
                <p className="text-sm md:text-base font-bold text-white whitespace-nowrap">{order.total} <span className="text-xs text-slate-400">RON</span></p>
                <StatusBadge status={order.status} />
                <Eye className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors hidden md:block" />
              </div>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nu s-au găsit comenzi</p>
            <p className="text-slate-500 text-xs mt-1">Încearcă alte filtre sau adaugă o comandă nouă</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {filteredOrders.length} din {orders.length} comenzi
        </p>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#334155] text-slate-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 rounded-lg bg-purple-600/20 text-purple-300 text-sm font-medium">1</span>
          <button className="p-2 rounded-lg hover:bg-[#334155] text-slate-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddOrder && <AddOrderModal onClose={() => setShowAddOrder(false)} />}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
import { useState } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Tag,
  Percent,
  Eye,
  EyeOff,
  Package,
  Star,
  TrendingUp,
  Clock,
  Save,
  X,
  Image as ImageIcon,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { realProducts, type Product } from '@/admin/data/mockData';

const categories = [
  { value: 'toate', label: 'Toate' },
  { value: 'cutiute-muzicale', label: 'Cutiuțe Muzicale' },
  { value: 'accesorii', label: 'Accesorii' },
  { value: 'servicii', label: 'Servicii' },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'activ': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'inactiv': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    'promovare': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  const labels: Record<string, string> = {
    'activ': 'Activ',
    'inactiv': 'Inactiv',
    'promovare': '🔥 Promoție',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${colors[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>(realProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('toate');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showPromoModal, setShowPromoModal] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkPromo, setShowBulkPromo] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'toate' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkPromotion = (discount: number, endDate: string) => {
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        const originalPrice = p.originalPrice || p.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
        return {
          ...p,
          status: 'promovare' as const,
          price: newPrice,
          originalPrice,
          promotion: { discount, endDate }
        };
      }
      return p;
    }));
    setSelectedProducts([]);
    setShowBulkPromo(false);
  };

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'activ').length,
    promotions: products.filter(p => p.status === 'promovare').length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

  const handleSaveEdit = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditingProduct(null);
  };

  const handleToggleStatus = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, status: p.status === 'activ' ? 'inactiv' : 'activ' };
      }
      return p;
    }));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSelectedProducts(prev => prev.filter(id => id !== productId));
  };

  const handleSetPromotion = (productId: string, discount: number, endDate: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const originalPrice = p.originalPrice || p.price;
        const newPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
        return {
          ...p,
          status: 'promovare' as const,
          price: newPrice,
          originalPrice,
          promotion: { discount, endDate }
        };
      }
      return p;
    }));
    setShowPromoModal(null);
  };

  const handleRemovePromotion = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId && p.originalPrice) {
        return {
          ...p,
          status: 'activ' as const,
          price: p.originalPrice,
          originalPrice: undefined,
          promotion: undefined
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Produse & Servicii</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Catalog sincronizat cu cutiutamagica.eu · {products.length} produse</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProducts.length > 0 && (
            <button
              onClick={() => setShowBulkPromo(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors"
            >
              <Tag className="w-4 h-4" />
              Promoție ({selectedProducts.length})
            </button>
          )}
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adaugă Produs</span>
            <span className="sm:hidden">Adaugă</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">Total</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Active</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{stats.active}</p>
        </div>
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Promoții</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{stats.promotions}</p>
        </div>
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">Stoc 0</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white">{stats.outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={selectAll}
              className="p-2.5 rounded-lg bg-[#0F172A] border border-[#334155] text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title="Selectează toate"
            >
              {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-purple-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Caută produse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-[#0F172A] text-slate-400 border border-[#334155] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className={`glass-card rounded-xl p-4 flex flex-col relative overflow-hidden ${
            selectedProducts.includes(product.id) ? 'ring-2 ring-purple-500/50' : ''
          }`}>
            {/* Selection & Delete */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="p-1.5 rounded-md hover:bg-red-500/20 transition-colors text-slate-600 hover:text-red-400"
                title="Șterge"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSelectProduct(product.id)}
                className="p-1 rounded-md hover:bg-[#334155] transition-colors"
              >
                {selectedProducts.includes(product.id) ? (
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>

            {/* Product Image */}
            <div className="flex items-center gap-3 mb-3 pr-16">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0 border border-[#334155]/50 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-3xl md:text-4xl">{product.image}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={product.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white truncate block hover:text-purple-300 transition-colors group"
                >
                  {product.name}
                  <ExternalLink className="w-3 h-3 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <p className="text-xs text-slate-400 capitalize">{product.category.replace('-', ' ')}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-slate-400">{product.rating}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{product.description}</p>

            {/* Price & Promotion */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-white">{product.price} lei</span>
              {product.originalPrice && (
                <span className="text-sm text-slate-500 line-through">{product.originalPrice} lei</span>
              )}
              {product.promotion && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs rounded font-medium">
                  -{product.promotion.discount}%
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> Stoc: {product.stock}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Vândute: {product.sales}
              </span>
            </div>

            {/* Status & Promo info */}
            <div className="flex items-center justify-between mb-3">
              <StatusBadge status={product.status} />
              {product.promotion && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {product.promotion.endDate}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[#334155]/50">
              <button
                onClick={() => setEditingProduct(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-medium transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editează
              </button>
              {product.promotion ? (
                <button
                  onClick={() => setShowPromoModal(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Prelungește
                </button>
              ) : (
                <button
                  onClick={() => setShowPromoModal(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-medium transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" /> Promoție
                </button>
              )}
              <button
                onClick={() => handleToggleStatus(product.id)}
                className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-400 transition-colors"
                title={product.status === 'activ' ? 'Dezactivează' : 'Activează'}
              >
                {product.status === 'inactiv' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Nu s-au găsit produse</p>
        </div>
      )}

      {/* Modals */}
      {editingProduct && (
        <EditProductModal product={editingProduct} onSave={handleSaveEdit} onClose={() => setEditingProduct(null)} />
      )}
      {showPromoModal && (
        <PromotionModal product={showPromoModal} onSetPromotion={handleSetPromotion} onRemovePromotion={handleRemovePromotion} onClose={() => setShowPromoModal(null)} />
      )}
      {showBulkPromo && (
        <BulkPromotionModal count={selectedProducts.length} onApply={handleBulkPromotion} onClose={() => setShowBulkPromo(false)} />
      )}
      {showAddProduct && (
        <AddProductModal onClose={() => setShowAddProduct(false)} onAdd={(p) => { setProducts(prev => [p, ...prev]); setShowAddProduct(false); }} />
      )}
    </div>
  );
}

function AddProductModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Product) => void }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'cutiute-muzicale' as Product['category'], stock: '', image: '📦'
  });

  const handleSubmit = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      slug: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: form.name || 'Produs Nou',
      description: form.description || 'Descriere produs',
      price: parseFloat(form.price) || 0,
      category: form.category,
      status: 'activ',
      stock: parseInt(form.stock) || 0,
      sales: 0,
      rating: 0,
      image: form.image,
      imageUrl: '',
      url: '',
    };
    onAdd(newProduct);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Adaugă Produs Nou</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#334155] text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Nume produs *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nume produs" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Descriere</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descriere produs" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Preț (lei) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="119" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Stoc</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="10" className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Categorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                <option value="cutiute-muzicale">Cutiuțe Muzicale</option>
                <option value="accesorii">Accesorii</option>
                <option value="servicii">Servicii</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Emoji imagine</label>
              <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-center text-2xl" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Adaugă
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function EditProductModal({ product, onSave, onClose }: {
  product: Product;
  onSave: (product: Product) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...product });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-lg p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Editează Produs</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#334155] text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Nume produs</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Descriere</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Preț (lei)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Stoc</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Categorie</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              <option value="cutiute-muzicale">Cutiuțe Muzicale</option>
              <option value="accesorii">Accesorii</option>
              <option value="servicii">Servicii</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Imagine produs</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl bg-[#0F172A] flex items-center justify-center border border-[#334155] overflow-hidden">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{form.image}</span>
                )}
              </div>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A] border border-[#334155] text-slate-400 text-sm hover:text-white transition-colors">
                <ImageIcon className="w-4 h-4" />
                Schimbă
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Salvează
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function BulkPromotionModal({ count, onApply, onClose }: {
  count: number;
  onApply: (discount: number, endDate: string) => void;
  onClose: () => void;
}) {
  const [discount, setDiscount] = useState(15);
  const [endDate, setEndDate] = useState('2026-07-31');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-md p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Promoție în Masă</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#334155] text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-4">
          <p className="text-sm text-purple-300 text-center"><span className="font-bold">{count} produse</span> selectate</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">Discount (%)</label>
            <input type="range" min="5" max="70" step="5" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value))} className="w-full accent-purple-500" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-500">5%</span>
              <span className="text-sm font-bold text-amber-300">-{discount}%</span>
              <span className="text-xs text-slate-500">70%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Data expirare</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onApply(discount, endDate)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Percent className="w-4 h-4" /> Aplică
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors">Anulează</button>
        </div>
      </div>
    </div>
  );
}

function PromotionModal({ product, onSetPromotion, onRemovePromotion, onClose }: {
  product: Product;
  onSetPromotion: (productId: string, discount: number, endDate: string) => void;
  onRemovePromotion: (productId: string) => void;
  onClose: () => void;
}) {
  const [discount, setDiscount] = useState(product.promotion?.discount || 10);
  const [endDate, setEndDate] = useState(product.promotion?.endDate || '2026-07-31');

  const previewPrice = product.originalPrice
    ? Math.round((product.originalPrice) * (1 - discount / 100) * 100) / 100
    : Math.round(product.price * (1 - discount / 100) * 100) / 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-[#1E293B] rounded-t-2xl md:rounded-2xl border border-[#334155] w-full max-w-md p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{product.promotion ? 'Prelungește Promoție' : 'Setează Promoție'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#334155] text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-[#0F172A]">
          <div className="w-12 h-12 rounded-lg bg-[#1E293B] flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{product.image}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{product.name}</p>
            <p className="text-xs text-slate-400">Preț curent: {product.price} lei</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">Discount (%)</label>
            <input type="range" min="5" max="70" step="5" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value))} className="w-full accent-purple-500" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-500">5%</span>
              <span className="text-sm font-bold text-amber-300">-{discount}%</span>
              <span className="text-xs text-slate-500">70%</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0F172A] text-center">
            <p className="text-xs text-slate-400 mb-1">Preț nou</p>
            <p className="text-2xl font-bold text-emerald-400">{previewPrice} lei</p>
            <p className="text-xs text-slate-500 line-through">{product.originalPrice || product.price} lei</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Data expirare</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={() => onSetPromotion(product.id, discount, endDate)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Percent className="w-4 h-4" /> {product.promotion ? 'Prelungește' : 'Activează'}
          </button>
          {product.promotion && (
            <button onClick={() => onRemovePromotion(product.id)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-medium transition-colors">
              <Trash2 className="w-4 h-4" /> Elimină Promoția
            </button>
          )}
          <button onClick={onClose} className="w-full py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors">Anulează</button>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check, Package, MapPin, Phone, User, Camera, ScanLine } from 'lucide-react';
import { orders } from '@/data/mockData';

export default function QRGenerator() {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [qrContent, setQrContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'easybox' | 'courier'>('easybox');
  const [scanResult, setScanResult] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const generateQRContent = () => {
    if (!selectedOrder) return;
    
    const content = deliveryType === 'easybox'
      ? JSON.stringify({
          type: 'EASYBOX_DELIVERY',
          orderNumber: selectedOrder.orderNumber,
          customer: selectedOrder.customer,
          phone: selectedOrder.phone,
          locker: selectedOrder.address,
          city: selectedOrder.city,
          awb: selectedOrder.awb || 'PENDING',
          timestamp: new Date().toISOString()
        })
      : JSON.stringify({
          type: 'COURIER_DELIVERY',
          orderNumber: selectedOrder.orderNumber,
          customer: selectedOrder.customer,
          phone: selectedOrder.phone,
          address: selectedOrder.address,
          city: selectedOrder.city,
          deliveryMethod: selectedOrder.deliveryMethod,
          awb: selectedOrder.awb || 'PENDING',
          products: selectedOrder.products,
          total: selectedOrder.total,
          timestamp: new Date().toISOString()
        });

    setQrContent(content);
  };

  const handleCopy = () => {
    if (qrContent) {
      navigator.clipboard.writeText(qrContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svg = document.querySelector('#qr-code-svg svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${selectedOrder?.orderNumber || 'code'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleScanFromFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate QR scan result from image
      setScanResult(JSON.stringify({
        type: 'EASYBOX_DELIVERY',
        orderNumber: 'CM-2024-001',
        customer: 'Maria Popescu',
        locker: 'EasyBox Mega Mall',
        city: 'București',
        status: 'Scanat cu succes ✓'
      }, null, 2));
      setShowScanner(true);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Generator QR</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Generează și scanează coduri QR pentru livrări EasyBox sau curier</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* Order Selection */}
          <div className="glass-card rounded-xl p-4 md:p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Selectează Comanda</h3>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.customer} ({order.platform})
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Type */}
          <div className="glass-card rounded-xl p-4 md:p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Tip Livrare</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeliveryType('easybox')}
                className={`p-3 md:p-4 rounded-lg border text-center transition-all ${
                  deliveryType === 'easybox'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                    : 'border-[#334155] text-slate-400 hover:border-[#475569]'
                }`}
              >
                <Package className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5" />
                <p className="text-sm font-medium">EasyBox</p>
                <p className="text-xs mt-0.5 opacity-70">Locker automat</p>
              </button>
              <button
                onClick={() => setDeliveryType('courier')}
                className={`p-3 md:p-4 rounded-lg border text-center transition-all ${
                  deliveryType === 'courier'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                    : 'border-[#334155] text-slate-400 hover:border-[#475569]'
                }`}
              >
                <MapPin className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5" />
                <p className="text-sm font-medium">Curier</p>
                <p className="text-xs mt-0.5 opacity-70">La adresă</p>
              </button>
            </div>
          </div>

          {/* Order Details */}
          {selectedOrder && (
            <div className="glass-card rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Detalii Comandă</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{selectedOrder.customer}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{selectedOrder.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{selectedOrder.address}, {selectedOrder.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{selectedOrder.products}</span>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={generateQRContent}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-500/20"
          >
            Generează Cod QR
          </button>

          {/* Scan QR Section */}
          <div className="glass-card rounded-xl p-4 md:p-5 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Scanează QR</h3>
                <p className="text-xs text-slate-400">Verifică rapid un cod QR EasyBox</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScanFromFile}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-medium transition-colors border border-amber-500/30"
              >
                <Camera className="w-4 h-4" />
                Încarcă imagine QR
              </button>
              <button
                onClick={() => {
                  setScanResult(JSON.stringify({
                    type: 'EASYBOX_DELIVERY',
                    orderNumber: 'CM-2024-005',
                    customer: 'Elena Dumitrescu',
                    locker: 'EasyBox Auchan Titan',
                    city: 'București',
                    status: 'Verificat ✓'
                  }, null, 2));
                  setShowScanner(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded-lg text-xs font-medium transition-colors border border-[#334155]"
              >
                <ScanLine className="w-4 h-4" />
                Demo Scan
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {showScanner && scanResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs font-medium text-emerald-400 mb-1">✓ QR Decodat cu succes:</p>
                <pre className="text-[10px] md:text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">{scanResult}</pre>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="glass-card rounded-xl p-4 md:p-6 flex flex-col items-center justify-center min-h-[350px] md:min-h-[400px]">
          {qrContent ? (
            <div className="text-center space-y-4">
              <div id="qr-code-svg" className="bg-white p-4 md:p-6 rounded-xl inline-block">
                <QRCodeSVG
                  value={qrContent}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div>
                <p className="text-white font-semibold">{selectedOrder?.orderNumber}</p>
                <p className="text-slate-400 text-sm">{selectedOrder?.customer}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {deliveryType === 'easybox' ? '📦 EasyBox' : '🚚 Curier'} • {selectedOrder?.city}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 md:gap-3 justify-center pt-2 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-xs md:text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descarcă
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-xs md:text-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Printează
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-xs md:text-sm transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiat!' : 'Copiază'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 rounded-2xl bg-[#334155]/50 flex items-center justify-center">
                <QRCodeIcon className="w-10 h-10 md:w-12 md:h-12 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">Selectează o comandă și apasă "Generează" pentru a crea codul QR</p>
              <p className="text-xs text-slate-500 mt-2">Folosit frecvent pentru livrări EasyBox 📦</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QRCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  );
}
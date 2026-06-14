import { useState } from 'react';
import {
  Save,
  Bell,
  Globe,
  Truck,
  Building2,
  Instagram,
  Facebook,
  Link2,
  AtSign,
  Share2,
  ExternalLink
} from 'lucide-react';

export default function Settings() {
  const [notifications, setNotifications] = useState({
    newOrder: true,
    orderShipped: true,
    orderDelivered: false,
    returnRequest: true,
    dailyReport: true,
    socialMention: true
  });

  const [platforms, setPlatforms] = useState({
    cutiutaMagica: true,
    emag: true,
    olx: true,
    vinted: true,
    facebook: true,
    instagram: true,
    tiktok: false,
    pinterest: false
  });

  const [defaultCourier, setDefaultCourier] = useState('sameday');
  const [defaultDelivery, setDefaultDelivery] = useState('easybox');

  const [businessInfo, setBusinessInfo] = useState({
    name: 'Cutiuța Magică',
    description: 'Bijuterii handmade și cadouri personalizate din România',
    email: 'contact@cutiutamagica.ro',
    phone: '+40 721 234 567',
    website: 'https://cutiutamagica.ro',
    address: 'Str. Meșteșugarilor 15, București',
    cui: 'RO12345678',
    regCom: 'J40/1234/2020'
  });

  const [socialMedia, setSocialMedia] = useState({
    instagram: 'cutiuta.magica',
    facebook: 'CutiutaMagicaRO',
    tiktok: '@cutiutamagica',
    pinterest: 'cutiutamagica',
    youtube: '',
    twitter: ''
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Setări</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Configurează informațiile afacerii și preferințele</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Save className="w-4 h-4" />
          Salvează Tot
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Business Info */}
        <div className="glass-card rounded-xl p-4 md:p-5 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Informații Afacere</h3>
              <p className="text-xs text-slate-400">Datele afacerii tale care vor fi preluate în panou</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Nume Afacere</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Website</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="url"
                  value={businessInfo.website}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                  className="w-full pl-10 pr-4 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1.5 block">Descriere Afacere</label>
              <textarea
                value={businessInfo.description}
                onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                rows={2}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email Contact</label>
              <input
                type="email"
                value={businessInfo.email}
                onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Telefon</label>
              <input
                type="tel"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Adresă</label>
              <input
                type="text"
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">CUI</label>
                <input
                  type="text"
                  value={businessInfo.cui}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, cui: e.target.value })}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Reg. Com.</label>
                <input
                  type="text"
                  value={businessInfo.regCom}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, regCom: e.target.value })}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Accounts */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Rețele de Socializare</h3>
              <p className="text-xs text-slate-400">Conectează conturile pentru sincronizare</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-400" /> Instagram
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={socialMedia.instagram}
                  onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                  placeholder="username"
                  className="w-full pl-10 pr-10 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {socialMedia.instagram && (
                  <a
                    href={`https://instagram.com/${socialMedia.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-pink-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5 text-blue-400" /> Facebook
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={socialMedia.facebook}
                  onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                  placeholder="pagina sau username"
                  className="w-full pl-10 pr-10 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {socialMedia.facebook && (
                  <a
                    href={`https://facebook.com/${socialMedia.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.1v-3.5a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.7 6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.08a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.01-.51z"/></svg>
                TikTok
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={socialMedia.tiktok}
                  onChange={(e) => setSocialMedia({ ...socialMedia, tiktok: e.target.value })}
                  placeholder="@username"
                  className="w-full pl-10 pr-4 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.01-.94-.01-2.08.24-3.1l1.74-7.38s-.44-.88-.44-2.17c0-2.03 1.18-3.55 2.65-3.55 1.25 0 1.85.94 1.85 2.06 0 1.25-.8 3.13-1.21 4.87-.34 1.45.73 2.63 2.16 2.63 2.6 0 4.34-3.34 4.34-7.29 0-3.01-2.03-5.26-5.72-5.26-4.17 0-6.77 3.11-6.77 6.58 0 1.2.35 2.04.9 2.69.25.3.29.42.2.76l-.3 1.17c-.1.37-.38.5-.7.37-1.95-.8-2.86-2.95-2.86-5.37 0-3.99 3.37-8.78 10.05-8.78 5.37 0 8.9 3.88 8.9 8.05 0 5.52-3.07 9.64-7.6 9.64-1.52 0-2.96-.83-3.45-1.77l-.96 3.8c-.3 1.07-.87 2.13-1.4 2.96A12 12 0 1 0 12 0z"/></svg>
                Pinterest
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={socialMedia.pinterest}
                  onChange={(e) => setSocialMedia({ ...socialMedia, pinterest: e.target.value })}
                  placeholder="username"
                  className="w-full pl-10 pr-4 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                YouTube
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={socialMedia.youtube}
                  onChange={(e) => setSocialMedia({ ...socialMedia, youtube: e.target.value })}
                  placeholder="canal YouTube"
                  className="w-full pl-10 pr-4 bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Platform & Social Sync */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Platforme & Rețele Active</h3>
              <p className="text-xs text-slate-400">Activează sincronizarea cu platformele</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: 'cutiutaMagica', label: 'Cutiuța Magică (Site propriu)', color: '#7C3AED' },
              { key: 'emag', label: 'eMag Marketplace', color: '#F59E0B' },
              { key: 'olx', label: 'OLX', color: '#10B981' },
              { key: 'vinted', label: 'Vinted', color: '#06B6D4' },
              { key: 'facebook', label: 'Facebook / Marketplace', color: '#3B82F6' },
              { key: 'instagram', label: 'Instagram Shop', color: '#E1306C' },
              { key: 'tiktok', label: 'TikTok Shop', color: '#000000' },
              { key: 'pinterest', label: 'Pinterest Shopping', color: '#E60023' }
            ].map((platform) => (
              <div key={platform.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: platform.color }}></div>
                  <span className="text-sm text-slate-200">{platform.label}</span>
                </div>
                <button
                  onClick={() => setPlatforms(prev => ({ ...prev, [platform.key]: !prev[platform.key as keyof typeof prev] }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    platforms[platform.key as keyof typeof platforms] ? 'bg-purple-600' : 'bg-[#334155]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    platforms[platform.key as keyof typeof platforms] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Notificări</h3>
              <p className="text-xs text-slate-400">Configurează alertele și notificările</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: 'newOrder', label: 'Comandă nouă primită' },
              { key: 'orderShipped', label: 'Comandă expediată' },
              { key: 'orderDelivered', label: 'Comandă livrată' },
              { key: 'returnRequest', label: 'Cerere de returnare' },
              { key: 'dailyReport', label: 'Raport zilnic' },
              { key: 'socialMention', label: 'Mențiune pe rețele sociale' }
            ].map((notif) => (
              <div key={notif.key} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-200">{notif.label}</span>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, [notif.key]: !prev[notif.key as keyof typeof prev] }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    notifications[notif.key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-[#334155]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    notifications[notif.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Default Courier */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Preferințe Livrare</h3>
              <p className="text-xs text-slate-400">Setează curierul și metoda implicită</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Curier Implicit</label>
              <select
                value={defaultCourier}
                onChange={(e) => setDefaultCourier(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="sameday">SameDay</option>
                <option value="fancourier">FanCourier</option>
                <option value="cargus">Cargus</option>
                <option value="dpd">DPD</option>
                <option value="gls">GLS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Metodă Livrare Implicită</label>
              <select
                value={defaultDelivery}
                onChange={(e) => setDefaultDelivery(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="easybox">EasyBox / Locker</option>
                <option value="address">La adresă</option>
                <option value="pickup">Ridicare personală</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
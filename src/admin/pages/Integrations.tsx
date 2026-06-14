import { ExternalLink, Truck, Package, Search, Globe, ShoppingBag, MapPin, Share2 } from 'lucide-react';

interface IntegrationItem {
  name: string;
  description: string;
  url: string;
  color: string;
  icon: React.ReactNode;
  category: 'courier' | 'marketplace' | 'social' | 'tools';
}

const integrations: IntegrationItem[] = [
  // Courier Services
  {
    name: 'SameDay Courier',
    description: 'Gestionare livrări, AWB-uri, tracking',
    url: 'https://www.sameday.ro',
    color: '#F59E0B',
    icon: <Truck className="w-6 h-6" />,
    category: 'courier'
  },
  {
    name: 'FanCourier',
    description: 'Expediții, tracking, EasyBox',
    url: 'https://www.fancourier.ro',
    color: '#10B981',
    icon: <Truck className="w-6 h-6" />,
    category: 'courier'
  },
  {
    name: 'Cargus',
    description: 'Livrări naționale și internaționale',
    url: 'https://www.cargus.ro',
    color: '#3B82F6',
    icon: <Truck className="w-6 h-6" />,
    category: 'courier'
  },
  {
    name: 'DPD Romania',
    description: 'Servicii curierat rapid',
    url: 'https://www.dpd.ro',
    color: '#EF4444',
    icon: <Truck className="w-6 h-6" />,
    category: 'courier'
  },
  {
    name: 'GLS Romania',
    description: 'Livrări colete România și Europa',
    url: 'https://gls-group.eu/RO',
    color: '#F97316',
    icon: <Truck className="w-6 h-6" />,
    category: 'courier'
  },
  {
    name: 'Verificare AWB',
    description: 'Tracking rapid pentru orice AWB',
    url: 'https://www.sameday.ro/tracking',
    color: '#8B5CF6',
    icon: <Search className="w-6 h-6" />,
    category: 'courier'
  },
  // Marketplaces
  {
    name: 'eMag Marketplace',
    description: 'Gestionare produse și comenzi eMag',
    url: 'https://marketplace.emag.ro',
    color: '#F59E0B',
    icon: <ShoppingBag className="w-6 h-6" />,
    category: 'marketplace'
  },
  {
    name: 'OLX',
    description: 'Anunțuri și vânzări OLX',
    url: 'https://www.olx.ro',
    color: '#10B981',
    icon: <Globe className="w-6 h-6" />,
    category: 'marketplace'
  },
  {
    name: 'Vinted',
    description: 'Platformă vânzări fashion',
    url: 'https://www.vinted.ro',
    color: '#06B6D4',
    icon: <ShoppingBag className="w-6 h-6" />,
    category: 'marketplace'
  },
  {
    name: 'Facebook Marketplace',
    description: 'Vânzări pe Facebook Marketplace',
    url: 'https://www.facebook.com/marketplace',
    color: '#3B82F6',
    icon: <Globe className="w-6 h-6" />,
    category: 'marketplace'
  },
  // Social Media
  {
    name: 'Instagram',
    description: 'Postări, Stories, Reels, Instagram Shop',
    url: 'https://www.instagram.com',
    color: '#E1306C',
    icon: <Share2 className="w-6 h-6" />,
    category: 'social'
  },
  {
    name: 'Facebook Page',
    description: 'Pagina de business, postări, mesaje',
    url: 'https://business.facebook.com',
    color: '#1877F2',
    icon: <Share2 className="w-6 h-6" />,
    category: 'social'
  },
  {
    name: 'TikTok Business',
    description: 'Conținut video, TikTok Shop',
    url: 'https://www.tiktok.com/business',
    color: '#000000',
    icon: <Share2 className="w-6 h-6" />,
    category: 'social'
  },
  {
    name: 'Pinterest Business',
    description: 'Pinuri, cataloage, Pinterest Shopping',
    url: 'https://business.pinterest.com',
    color: '#E60023',
    icon: <Share2 className="w-6 h-6" />,
    category: 'social'
  },
  {
    name: 'YouTube Studio',
    description: 'Gestionare canal, videoclipuri produs',
    url: 'https://studio.youtube.com',
    color: '#FF0000',
    icon: <Share2 className="w-6 h-6" />,
    category: 'social'
  },
  // Tools
  {
    name: 'EasyBox Lockers',
    description: 'Localizare lockere EasyBox',
    url: 'https://www.sameday.ro/easybox',
    color: '#7C3AED',
    icon: <Package className="w-6 h-6" />,
    category: 'tools'
  },
  {
    name: 'Google Maps',
    description: 'Verificare adrese livrare',
    url: 'https://maps.google.com',
    color: '#10B981',
    icon: <MapPin className="w-6 h-6" />,
    category: 'tools'
  },
  {
    name: 'Canva',
    description: 'Design grafic pentru postări social media',
    url: 'https://www.canva.com',
    color: '#00C4CC',
    icon: <Globe className="w-6 h-6" />,
    category: 'tools'
  }
];

export default function Integrations() {
  const courierIntegrations = integrations.filter(i => i.category === 'courier');
  const marketplaceIntegrations = integrations.filter(i => i.category === 'marketplace');
  const socialIntegrations = integrations.filter(i => i.category === 'social');
  const toolIntegrations = integrations.filter(i => i.category === 'tools');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Integrări & Acces Rapid</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Butoane rapide către curierat, marketplace-uri, rețele sociale și instrumente</p>
      </div>

      {/* Courier Services */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-400" />
          Servicii Curierat
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {courierIntegrations.map((item) => (
            <IntegrationCard key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Marketplaces */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-400" />
          Marketplace-uri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {marketplaceIntegrations.map((item) => (
            <IntegrationCard key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Social Media */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-pink-400" />
          Rețele de Socializare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {socialIntegrations.map((item) => (
            <IntegrationCard key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          Instrumente Utile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {toolIntegrations.map((item) => (
            <IntegrationCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ item }: { item: IntegrationItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4 hover:border-purple-500/50 transition-all group cursor-pointer"
    >
      <div
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ background: `${item.color}20`, color: item.color }}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">{item.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors flex-shrink-0" />
    </a>
  );
}
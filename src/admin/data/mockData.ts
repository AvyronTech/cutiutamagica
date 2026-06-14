export interface Order {
  id: string;
  orderNumber: string;
  platform: 'Cutiuța Magică' | 'eMag' | 'OLX' | 'Vinted' | 'Facebook' | 'Instagram' | 'TikTok';
  customer: string;
  products: string;
  total: number;
  status: 'Nouă' | 'Procesare' | 'Expediată' | 'Livrată' | 'Returnată' | 'Anulată';
  date: string;
  deliveryMethod: 'EasyBox' | 'Curier SameDay' | 'Curier FanCourier' | 'Curier Cargus' | 'Curier DPD' | 'Ridicare personală';
  awb?: string;
  phone: string;
  address: string;
  city: string;
}

export const orders: Order[] = [
  {
    id: '1',
    orderNumber: 'CM-2026-001',
    platform: 'Cutiuța Magică',
    customer: 'Maria Popescu',
    products: 'Stăpânul Inelelor — One Ring x1',
    total: 119,
    status: 'Nouă',
    date: '2026-06-09',
    deliveryMethod: 'EasyBox',
    phone: '0721234567',
    address: 'EasyBox Mega Mall',
    city: 'București'
  },
  {
    id: '2',
    orderNumber: 'CM-2026-002',
    platform: 'Cutiuța Magică',
    customer: 'Ion Vasilescu',
    products: 'Harry Potter — I Solemnly Swear x1, Pernuță auto x1',
    total: 168,
    status: 'Procesare',
    date: '2026-06-08',
    deliveryMethod: 'Curier SameDay',
    awb: 'SD123456789',
    phone: '0732345678',
    address: 'Str. Victoriei 45',
    city: 'Cluj-Napoca'
  },
  {
    id: '3',
    orderNumber: 'EM-8834521',
    platform: 'eMag',
    customer: 'Elena Dumitrescu',
    products: 'Set termos vacuum 500ml + 2 căni x1',
    total: 129,
    status: 'Expediată',
    date: '2026-06-07',
    deliveryMethod: 'Curier FanCourier',
    awb: 'FC987654321',
    phone: '0743456789',
    address: 'Bd. Independenței 12',
    city: 'Iași'
  },
  {
    id: '4',
    orderNumber: 'OLX-99231',
    platform: 'OLX',
    customer: 'Ana Ionescu',
    products: 'Pirații Caraibilor — Furtuna x2',
    total: 238,
    status: 'Livrată',
    date: '2026-06-06',
    deliveryMethod: 'EasyBox',
    awb: 'SD111222333',
    phone: '0754567890',
    address: 'EasyBox Iulius Mall',
    city: 'Timișoara'
  },
  {
    id: '5',
    orderNumber: 'IG-2026-001',
    platform: 'Instagram',
    customer: 'Andrei Marin',
    products: 'Star Wars — Best Dad in the Galaxy x1',
    total: 119,
    status: 'Procesare',
    date: '2026-06-08',
    deliveryMethod: 'Curier Cargus',
    awb: 'CG456789012',
    phone: '0765678901',
    address: 'Str. Mihai Eminescu 78',
    city: 'Brașov'
  },
  {
    id: '6',
    orderNumber: 'TK-2026-001',
    platform: 'TikTok',
    customer: 'Cristina Radu',
    products: 'Zâna Pădurii Fermecate x1, Pisicuța cu Stele x1',
    total: 238,
    status: 'Nouă',
    date: '2026-06-09',
    deliveryMethod: 'Curier DPD',
    phone: '0776789012',
    address: 'Str. Republicii 23',
    city: 'Sibiu'
  },
  {
    id: '7',
    orderNumber: 'FB-12345',
    platform: 'Facebook',
    customer: 'Mihai Stancu',
    products: 'Ceas de buzunar vintage bronz x1',
    total: 59,
    status: 'Expediată',
    date: '2026-06-05',
    deliveryMethod: 'Curier SameDay',
    awb: 'SD444555666',
    phone: '0787890123',
    address: 'Calea Dorobanți 156',
    city: 'București'
  },
  {
    id: '8',
    orderNumber: 'VNT-445521',
    platform: 'Vinted',
    customer: 'Laura Popa',
    products: 'Pieptene barbă „The Men Times" x2',
    total: 78,
    status: 'Returnată',
    date: '2026-06-04',
    deliveryMethod: 'Curier FanCourier',
    awb: 'FC112233445',
    phone: '0798901234',
    address: 'Str. Avram Iancu 34',
    city: 'Oradea'
  },
  {
    id: '9',
    orderNumber: 'CM-2026-003',
    platform: 'Cutiuța Magică',
    customer: 'Diana Moldovan',
    products: 'Harry Potter — I\'m a Keeper x1, Suport telefon x1',
    total: 148,
    status: 'Livrată',
    date: '2026-06-03',
    deliveryMethod: 'EasyBox',
    awb: 'SD777888999',
    phone: '0709012345',
    address: 'EasyBox Vivo Mall',
    city: 'Constanța'
  },
  {
    id: '10',
    orderNumber: 'CM-2026-004',
    platform: 'Cutiuța Magică',
    customer: 'Vlad Gheorghe',
    products: 'Stăpânul Inelelor — One Ring x1, Gravură personalizată x1',
    total: 154,
    status: 'Procesare',
    date: '2026-06-07',
    deliveryMethod: 'Ridicare personală',
    phone: '0710123456',
    address: 'Magazin fizic',
    city: 'București'
  },
  {
    id: '11',
    orderNumber: 'EM-8834600',
    platform: 'eMag',
    customer: 'Alexandru Petre',
    products: 'Set termos vacuum 500ml + 2 căni x2',
    total: 258,
    status: 'Nouă',
    date: '2026-06-09',
    deliveryMethod: 'Curier SameDay',
    phone: '0723456789',
    address: 'Str. Libertății 89',
    city: 'Craiova'
  },
  {
    id: '12',
    orderNumber: 'IG-2026-002',
    platform: 'Instagram',
    customer: 'Andreea Nistor',
    products: 'Pisicuța cu Stele x1',
    total: 119,
    status: 'Expediată',
    date: '2026-06-06',
    deliveryMethod: 'EasyBox',
    awb: 'SD999000111',
    phone: '0734567890',
    address: 'EasyBox Auchan',
    city: 'Pitești'
  }
];

export const platformColors: Record<string, string> = {
  'Cutiuța Magică': '#7C3AED',
  'eMag': '#F59E0B',
  'OLX': '#10B981',
  'Vinted': '#06B6D4',
  'Facebook': '#3B82F6',
  'Instagram': '#E1306C',
  'TikTok': '#69C9D0'
};

export const statusColors: Record<string, string> = {
  'Nouă': '#3B82F6',
  'Procesare': '#F59E0B',
  'Expediată': '#8B5CF6',
  'Livrată': '#10B981',
  'Returnată': '#EF4444',
  'Anulată': '#6B7280'
};

export const monthlyStats = [
  { month: 'Ian', vanzari: 3200, comenzi: 22 },
  { month: 'Feb', vanzari: 4100, comenzi: 29 },
  { month: 'Mar', vanzari: 5800, comenzi: 41 },
  { month: 'Apr', vanzari: 4900, comenzi: 35 },
  { month: 'Mai', vanzari: 6200, comenzi: 44 },
  { month: 'Iun', vanzari: 7100, comenzi: 50 },
  { month: 'Iul', vanzari: 5500, comenzi: 39 },
  { month: 'Aug', vanzari: 4900, comenzi: 35 },
  { month: 'Sep', vanzari: 6400, comenzi: 45 },
  { month: 'Oct', vanzari: 8200, comenzi: 58 },
  { month: 'Nov', vanzari: 10500, comenzi: 74 },
  { month: 'Dec', vanzari: 13200, comenzi: 93 }
];

export const platformStats = [
  { name: 'Cutiuța Magică', value: 38, color: '#7C3AED' },
  { name: 'eMag', value: 22, color: '#F59E0B' },
  { name: 'OLX', value: 12, color: '#10B981' },
  { name: 'Instagram', value: 14, color: '#E1306C' },
  { name: 'TikTok', value: 8, color: '#69C9D0' },
  { name: 'Facebook', value: 6, color: '#3B82F6' }
];

export const deliveryStats = [
  { name: 'EasyBox', value: 45, color: '#7C3AED' },
  { name: 'SameDay', value: 22, color: '#F59E0B' },
  { name: 'FanCourier', value: 18, color: '#10B981' },
  { name: 'Cargus', value: 8, color: '#06B6D4' },
  { name: 'DPD', value: 7, color: '#EF4444' }
];

// Real products from cutiutamagica.eu
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'cutiute-muzicale' | 'accesorii' | 'servicii';
  status: 'activ' | 'inactiv' | 'promovare';
  stock: number;
  sales: number;
  rating: number;
  promotion?: {
    discount: number;
    endDate: string;
  };
  image: string;
  imageUrl: string;
  url: string;
}

export const realProducts: Product[] = [
  {
    id: '1',
    slug: 'lotr-rings',
    name: 'Stăpânul Inelelor — One Ring',
    description: 'Cutiuță muzicală din lemn cu melodia iconică din Lord of the Rings. Mecanism durabil cu manivelă.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 25,
    sales: 89,
    rating: 4.9,
    image: '🎵',
    imageUrl: 'https://cutiutamagica.eu/assets/box-lotr-ring-D0Jp24IL.jpg',
    url: 'https://cutiutamagica.eu/produs/lotr-rings'
  },
  {
    id: '2',
    slug: 'hp-always',
    name: 'Harry Potter — I Solemnly Swear',
    description: 'Cutiuță muzicală Harry Potter din lemn natural. Melodie „Hedwig\'s Theme". Piesă originală.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 30,
    sales: 124,
    rating: 4.9,
    image: '⚡',
    imageUrl: 'https://cutiutamagica.eu/assets/box-hp-always-KnjwSJ4N.jpg',
    url: 'https://cutiutamagica.eu/produs/hp-always'
  },
  {
    id: '3',
    slug: 'hp-keeper',
    name: "Harry Potter — I'm a Keeper",
    description: 'Cutiuță muzicală Harry Potter cu design Quidditch. Melodie clasică, mecanism elvețian.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 18,
    sales: 67,
    rating: 4.8,
    image: '🧹',
    imageUrl: 'https://cutiutamagica.eu/assets/box-hp-keeper-SxpspzXd.jpg',
    url: 'https://cutiutamagica.eu/produs/hp-keeper'
  },
  {
    id: '4',
    slug: 'pirates',
    name: 'Pirații Caraibilor — Furtuna',
    description: 'Cutiuță muzicală Pirates of the Caribbean. Melodia „He\'s a Pirate". Lemn gravat manual.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 22,
    sales: 78,
    rating: 4.8,
    image: '🏴‍☠️',
    imageUrl: 'https://cutiutamagica.eu/assets/box-pirates-DzAGgsjh.jpg',
    url: 'https://cutiutamagica.eu/produs/pirates'
  },
  {
    id: '5',
    slug: 'starwars-dad',
    name: 'Star Wars — Best Dad in the Galaxy',
    description: 'Cutiuță muzicală Star Wars cu tema imperială. Cadou perfect pentru tați. Gravură specială.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 15,
    sales: 45,
    rating: 4.7,
    image: '⭐',
    imageUrl: 'https://cutiutamagica.eu/assets/box-starwars-dad-BYzJEvM6.jpg',
    url: 'https://cutiutamagica.eu/produs/starwars-dad'
  },
  {
    id: '6',
    slug: 'fairy',
    name: 'Zâna Pădurii Fermecate',
    description: 'Cutiuță muzicală delicată cu design de zână. Melodie romantică, ideală cadou pentru ea.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 20,
    sales: 56,
    rating: 4.9,
    image: '🧚',
    imageUrl: 'https://cutiutamagica.eu/assets/box-fairy-BS80gdhT.jpg',
    url: 'https://cutiutamagica.eu/produs/fairy'
  },
  {
    id: '7',
    slug: 'kitten',
    name: 'Pisicuța cu Stele',
    description: 'Cutiuță muzicală cu pisicuță gravată și stele. Design drăguț, melodie liniștitoare.',
    price: 119,
    category: 'cutiute-muzicale',
    status: 'activ',
    stock: 28,
    sales: 92,
    rating: 4.9,
    image: '🐱',
    imageUrl: 'https://cutiutamagica.eu/assets/box-kitten-DkA5uskd.jpg',
    url: 'https://cutiutamagica.eu/produs/kitten'
  },
  {
    id: '8',
    slug: 'pernuta-auto',
    name: 'Pernuță auto pentru gât',
    description: 'Pernuță confortabilă pentru tetieră auto. Material premium, design elegant negru.',
    price: 49,
    category: 'accesorii',
    status: 'activ',
    stock: 40,
    sales: 156,
    rating: 4.6,
    image: '🚗',
    imageUrl: 'https://cutiutamagica.eu/assets/pillow-black-1-BWCi9Fbd.jpg',
    url: 'https://cutiutamagica.eu/produs/pernuta-auto'
  },
  {
    id: '9',
    slug: 'set-termos',
    name: 'Set termos vacuum 500ml + 2 căni',
    description: 'Set termos din oțel inoxidabil cu izolare vacuum. Include 2 căni. Păstrează temperatura 12h.',
    price: 129,
    category: 'accesorii',
    status: 'activ',
    stock: 35,
    sales: 98,
    rating: 4.7,
    image: '☕',
    imageUrl: 'https://cutiutamagica.eu/assets/thermos-1-wU9UdFoC.jpg',
    url: 'https://cutiutamagica.eu/produs/set-termos'
  },
  {
    id: '10',
    slug: 'pieptene-barba',
    name: 'Pieptene barbă „The Men Times"',
    description: 'Pieptene din lemn pentru barbă și mustață. Design vintage, buzunar-friendly.',
    price: 39,
    category: 'accesorii',
    status: 'activ',
    stock: 60,
    sales: 210,
    rating: 4.5,
    image: '🧔',
    imageUrl: 'https://cutiutamagica.eu/assets/comb-1-BYEpXN5A.jpg',
    url: 'https://cutiutamagica.eu/produs/pieptene-barba'
  },
  {
    id: '11',
    slug: 'suport-telefon',
    name: 'Suport telefon pliabil reglabil',
    description: 'Suport universal pentru telefon, pliabil și reglabil. Compatibil cu toate modelele.',
    price: 29,
    category: 'accesorii',
    status: 'activ',
    stock: 75,
    sales: 187,
    rating: 4.4,
    image: '📱',
    imageUrl: 'https://cutiutamagica.eu/assets/phonestand-1-yC2XZCKt.jpg',
    url: 'https://cutiutamagica.eu/produs/suport-telefon'
  },
  {
    id: '12',
    slug: 'ceas-buzunar',
    name: 'Ceas de buzunar vintage bronz',
    description: 'Ceas de buzunar stil vintage cu lanț. Mecanism quartz, carcasă bronz antichizat.',
    price: 59,
    category: 'accesorii',
    status: 'activ',
    stock: 20,
    sales: 73,
    rating: 4.6,
    image: '⏱️',
    imageUrl: 'https://cutiutamagica.eu/assets/pocketwatch-1-ZSR8e0mY.jpg',
    url: 'https://cutiutamagica.eu/produs/ceas-buzunar'
  },
  {
    id: '13',
    slug: 'gravura',
    name: 'Gravură personalizată',
    description: 'Serviciu de gravură laser personalizată pe orice cutiuță muzicală. Text sau design la alegere.',
    price: 35,
    category: 'servicii',
    status: 'activ',
    stock: 999,
    sales: 340,
    rating: 5.0,
    image: '✨',
    imageUrl: '',
    url: 'https://cutiutamagica.eu/produse'
  }
];
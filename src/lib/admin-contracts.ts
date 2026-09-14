export const ADMIN_ORDER_STATUSES = [
  "Nouă",
  "Procesare",
  "Expediată",
  "Livrată",
  "Returnată",
  "Anulată",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export interface AdminOrder {
  id: string;
  orderNumber: string;
  publicToken: string;
  platform: string;
  channelCode: string;
  customer: string;
  products: string;
  total: number;
  currency: string;
  status: AdminOrderStatus;
  paymentStatus: string;
  fulfillmentStatus: string;
  date: string;
  deliveryMethod: string;
  awb?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  county: string;
  version: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: "cutiute-muzicale";
  catalogCategory: string;
  status: "activ" | "inactiv";
  stock: number | null;
  inventoryTracked: boolean;
  sales: number;
  rating: number | null;
  image: string;
  imageUrl: string;
  url: string;
  sku: string;
  mechanismType: string;
  rightsStatus: string;
  missingFieldsCount: number;
  listingCount: number;
  updatedAt: string;
  version: number;
}

export interface AdminChannelMetric {
  id: string;
  code: string;
  name: string;
  type: string;
  connectionMode: string;
  status: string;
  ordersCount: number;
  validOrdersCount: number;
  revenue: number;
  activeListings: number;
  openSyncFailures: number;
  lastOrderAt: string | null;
  lastHealthcheckAt: string | null;
  lastHealthcheckStatus: string | null;
}

export interface AdminDashboardStats {
  ordersTotal: number;
  ordersOpen: number;
  paymentsFailed: number;
  fulfillmentOpen: number;
  revenue30d: number;
  ordersCount30d: number;
  productsTotal: number;
  productsActive: number;
  productsIncomplete: number;
  syncFailuresOpen: number;
  notificationsUnread: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentOrders: AdminOrder[];
  channels: AdminChannelMetric[];
}

export interface AdminNotification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  actionUrl: string | null;
  createdAt: string;
  read: boolean;
}

export interface AdminMonthlyMetric {
  month: string;
  revenue: number;
  orders: number;
  units: number;
  discounts: number;
  refunds: number;
}

export interface AdminProductMetric {
  id: string;
  name: string;
  units: number;
  revenue: number;
  knownCost: number | null;
}

export interface AdminDeliveryMetric {
  name: string;
  orders: number;
}

export interface AdminStatisticsData {
  summary: {
    netRevenue: number;
    paidRevenue: number;
    ordersTotal: number;
    customersUnique: number;
    returnedOrders: number;
    returnRate: number;
    discounts: number;
    refunds: number;
    shippingRevenue: number;
    estimatedCost: number | null;
  };
  monthly: AdminMonthlyMetric[];
  channels: AdminChannelMetric[];
  topProducts: AdminProductMetric[];
  deliveries: AdminDeliveryMetric[];
}

export interface AdminIntegrationAccount {
  id: string;
  channelCode: string;
  provider: string;
  environment: string;
  label: string;
  status: string;
  lastHealthcheckAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface AdminShippingMethod {
  id: string;
  code: string;
  name: string;
  provider: string;
  type: string;
  status: string;
}

export interface AdminIntegrationsData {
  channels: AdminChannelMetric[];
  accounts: AdminIntegrationAccount[];
  shippingMethods: AdminShippingMethod[];
}

export interface AdminSettingsData {
  business: {
    name: string;
    description: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    taxId: string;
    registrationNumber: string;
  };
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
    pinterest: string;
    youtube: string;
  };
  notifications: {
    newOrder: boolean;
    paymentFailed: boolean;
    orderShipped: boolean;
    orderDelivered: boolean;
    returnRequest: boolean;
    integrationFailure: boolean;
    dailyReport: boolean;
  };
  fulfillment: {
    defaultShippingMethod: string;
    defaultDeliveryType: string;
  };
  updatedAt: string | null;
}

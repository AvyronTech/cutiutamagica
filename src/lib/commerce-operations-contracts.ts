import { z } from "zod";

export const PAYMENT_METHODS = ["cash_on_delivery", "card", "bank_transfer"] as const;
export const SHIPPING_OPTIONS = ["home_delivery", "easybox", "manual_confirmation"] as const;

export const returnRequestInputSchema = z.object({
  website: z.string().max(0).optional().default(""),
  orderNumber: z.string().trim().min(5).max(80),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z
    .union([z.literal(""), z.string().trim().min(8).max(30)])
    .optional()
    .default(""),
  requestType: z.enum(["withdrawal", "nonconformity", "damaged", "wrong_item", "other"]),
  preferredResolution: z.enum(["refund", "replacement", "repair", "price_reduction"]),
  reason: z.string().trim().min(3).max(240),
  details: z.string().trim().max(2_000).optional().default(""),
  itemIds: z.array(z.string().trim().min(1).max(128)).max(40).optional().default([]),
  policyAccepted: z.literal(true),
});

export type ReturnRequestInput = z.infer<typeof returnRequestInputSchema>;

export interface ReturnRequestPublicResult {
  returnNumber: string;
  publicToken: string;
  status: string;
  eligibilityStatus: string;
  message: string;
}

export interface CommercePublicConfig {
  seller: {
    legalName: string;
    taxId: string;
    vatStatus: string;
    countryCode: string;
    profileComplete: boolean;
  };
  currencies: { active: string[]; planned: string[] };
  payments: {
    card: { enabled: boolean; provider: "stripe" };
    cashOnDelivery: { enabled: boolean; reviewMayApply: boolean };
    bankTransfer: { enabled: boolean };
  };
  shipping: {
    liveQuotesEnabled: boolean;
    easyboxEnabled: boolean;
    standardPrice: number | null;
    lockerPrice: number | null;
    freeOver: number | null;
    defaultWeightG: number;
    defaultLengthCm: number;
    defaultWidthCm: number;
    defaultHeightCm: number;
    allowedCountries: string[];
    internationalReady: boolean;
    currency: string;
    requiresConfirmation: boolean;
  };
  policies: {
    checkoutConsentVersion: string;
    checkoutConsentText: string;
    returnsVersion: string;
    warrantyVersion: string;
    withdrawalDays: number;
    legalGuaranteeMonths: number;
  };
}

export interface AdminCommerceOperations {
  legalEntity: {
    legalName: string;
    taxId: string;
    vatStatus: string;
    registrationNumber: string | null;
    registeredAddress: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    bankName: string | null;
    ibanMasked: string | null;
    status: string;
  };
  invoiceSeries: Array<{
    id: string;
    code: string;
    prefix: string;
    nextNumber: number;
    documentType: string;
    status: string;
  }>;
  providers: Array<{
    id: string;
    provider: string;
    capability: string;
    environment: string;
    status: string;
    secretConfigured: boolean;
    lastHealthcheckAt: string | null;
    lastError: string | null;
  }>;
  financialAccounts: Array<{
    id: string;
    provider: string;
    accountType: string;
    label: string;
    currency: string;
    maskedIdentifier: string | null;
    status: string;
    secretConfigured: boolean;
    lastSyncedAt: string | null;
  }>;
  trafficReadiness: {
    googleAnalyticsReady: boolean;
    gscReady: boolean;
    socialReady: boolean;
    lastSyncAt: string | null;
  };
  pendingInvoiceOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    currency: string;
    placedAt: string;
  }>;
  invoices: Array<{
    id: string;
    orderNumber: string | null;
    invoiceNumber: string | null;
    status: string;
    total: number;
    currency: string;
    provider: string | null;
    issuedAt: string | null;
    documentId: string | null;
  }>;
  returnRequests: Array<{
    id: string;
    returnNumber: string;
    orderNumber: string;
    customerName: string;
    requestType: string;
    status: string;
    eligibilityStatus: string;
    submittedAt: string;
  }>;
  shippingPolicy: {
    standardPriceBani: number | null;
    lockerPriceBani: number | null;
    freeOverBani: number | null;
    defaultWeightG: number;
    defaultLengthCm: number;
    defaultWidthCm: number;
    defaultHeightCm: number;
    allowedCountries: string[];
    internationalReady: boolean;
    easyboxEnabled: boolean;
    useLiveQuotes: boolean;
    validationStatus: string;
  };
}

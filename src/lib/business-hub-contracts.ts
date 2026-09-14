export type BusinessArea =
  | "inventory"
  | "billing"
  | "shipping"
  | "platforms"
  | "posts"
  | "customers"
  | "notifications"
  | "newsletter"
  | "ai";

export interface BusinessAreaMetric {
  label: string;
  value: number;
  unit?: string;
  attention?: boolean;
}

export interface BusinessSystemStatus {
  id: string;
  area: BusinessArea;
  provider: string;
  label: string;
  status: string;
  detail: string;
}

export interface BusinessHubData {
  metrics: Record<BusinessArea, BusinessAreaMetric[]>;
  systems: BusinessSystemStatus[];
  generatedAt: string;
}

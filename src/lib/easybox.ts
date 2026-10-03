export interface EasyboxLocker {
  id: number;
  name: string;
  address: string;
  city: string;
  county: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  supportsCashOnDelivery: boolean | null;
}

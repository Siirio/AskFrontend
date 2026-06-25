export type RequestStatus = "draft" | "dispatching" | "waiting" | "answered";

export type CustomerRequest = {
  id: string;
  query: string;
  scope: "product" | "service";
  city: string;
  status: RequestStatus;
  matchedSuppliers: number;
};

export type SupplierReply = {
  id: string;
  supplierName: string;
  statusLabel: string;
  priceLabel?: string;
  branch: string;
  comment: string;
  updatedAt: string;
  contact: "call" | "chat";
};

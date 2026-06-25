export type SupplierTask = {
  id: string;
  query: string;
  customerArea: string;
  category: string;
  ageMinutes: number;
  ageLabel: string;
  confidenceLabel: string;
  status: "new" | "needs_reply" | "answered";
};

export type ServiceOffering = {
  id: string;
  title: string;
  branch: string;
  duration: string;
  priceLabel: string;
  availabilityMode: "manual_confirmation" | "schedule_backed";
};

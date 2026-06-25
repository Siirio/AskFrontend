export type ResultKind = "product" | "service" | "business";
export type Confidence = "high" | "medium" | "low";

export type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  supplierName: string;
  branch: string;
  category: string;
  priceLabel?: string;
  confidence: Confidence;
  sourceLabel: string;
  note: string;
  actions: Array<"call" | "map" | "chat" | "request">;
};

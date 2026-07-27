export type BusinessScope = "ITEM" | "SERVICE" | "BOTH";

export type WeeklyOpeningIntervalDto = {
  dayOfWeek: string;
  opensAt: string;
  closesAt: string;
};

export type SpecialOpeningIntervalDto = {
  date: string;
  closed?: boolean;
  opensAt?: string;
  closesAt?: string;
};

export type BranchOpeningSummaryDto = {
  state: "OPEN" | "CLOSED" | "UNKNOWN";
  timeZoneId?: string;
  evaluatedAt: string;
  nextOpensAt?: string;
  nextClosesAt?: string;
};

export type BranchDto = {
  id: string;
  businessId: string;
  cityId: string;
  cityName: string;
  name: string;
  address: string;
  addressDetails: string;
  latitude: number;
  longitude: number;
  timeZoneId?: string;
  weeklyHours?: WeeklyOpeningIntervalDto[];
  specialHours?: SpecialOpeningIntervalDto[];
  openingSummary?: BranchOpeningSummaryDto;
  pickupAvailable?: boolean;
};

export type BusinessDto = {
  id: string;
  name: string;
  onlineOnly?: boolean;
  businessScope?: BusinessScope;
};

export type CreateBranchData = {
  name: string;
  address?: string;
  addressDetails?: string;
  cityId?: string;
  latitude: number;
  longitude: number;
  timeZoneId?: string;
  weeklyHours?: WeeklyOpeningIntervalDto[];
  specialHours?: SpecialOpeningIntervalDto[];
  pickupAvailable?: boolean;
};

export type UpdateBranchData = {
  name?: string;
  address?: string;
  addressDetails?: string;
  cityId?: string;
  latitude?: number;
  longitude?: number;
  timeZoneId?: string;
  weeklyHours?: WeeklyOpeningIntervalDto[];
  specialHours?: SpecialOpeningIntervalDto[];
  pickupAvailable?: boolean;
};

export type MetalType = 'gold' | 'silver' | 'platinum';

export type PurityType =
  | 'K24'
  | 'K18'
  | 'K14'
  | 'SV1000'
  | 'SV925'
  | 'SV950'
  | 'Pt1000'
  | 'Pt950'
  | 'Pt900'
  | 'custom';

export type MetalItem = {
  id: string;
  name: string;
  metalType: MetalType;
  purityType: PurityType;
  purity: number;
  weightGram: number;
  purchasePrice: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
};

export type MetalPrices = {
  gold: number;
  silver: number;
  platinum: number;
  updatedAt: string;
};

export type PortfolioHistoryEntry = {
  id: string;
  recordedAt: string;
  goldValue: number;
  silverValue: number;
  platinumValue: number;
  totalValue: number;
  totalPurchasePrice: number;
  totalProfitLoss: number;
};

export const initialMetalPrices: MetalPrices = {
  gold: 22000,
  silver: 300,
  platinum: 7000,
  updatedAt: '',
};

export const initialPortfolioHistory: PortfolioHistoryEntry[] = [];

export function calculatePureWeight(weightGram: number, purity: number): number {
  return weightGram * purity;
}

export function calculateEstimatedValue(weightGram: number, purity: number, buyPricePerGram: number): number {
  return weightGram * purity * buyPricePerGram;
}

export function calculateProfitLoss(estimatedValue: number, purchasePrice: number): number {
  return estimatedValue - purchasePrice;
}

export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

export const priceService = {
  async getPrices(): Promise<MetalPrices> {
    return initialMetalPrices;
  },
};

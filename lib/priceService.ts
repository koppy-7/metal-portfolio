import { MetalPrices } from '@/lib/metal';

const TROY_OUNCE_TO_GRAM = 31.1035;

type GoldApiResponse = {
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  name: string;
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable?: string;
};

async function fetchGoldApi(symbol: 'XAU' | 'XAG' | 'XPT') {
  const res = await fetch(`https://api.gold-api.com/price/${symbol}/JPY`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${symbol}: ${res.status}`);
  }

  const data = (await res.json()) as GoldApiResponse;
  if (data.currency !== 'JPY' || typeof data.price !== 'number') {
    throw new Error(`Invalid response for ${symbol}`);
  }

  return {
    pricePerGram: Math.round(data.price / TROY_OUNCE_TO_GRAM),
    updatedAt: data.updatedAt,
  };
}

export async function fetchMetalPricesFromGoldApi(): Promise<MetalPrices & { source: 'gold-api' }> {
  const [gold, silver, platinum] = await Promise.all([
    fetchGoldApi('XAU'),
    fetchGoldApi('XAG'),
    fetchGoldApi('XPT'),
  ]);

  return {
    gold: gold.pricePerGram,
    silver: silver.pricePerGram,
    platinum: platinum.pricePerGram,
    updatedAt: new Date().toISOString(),
    source: 'gold-api',
  };
}

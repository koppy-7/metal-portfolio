import { fetchMetalPricesFromGoldApi } from '@/lib/priceService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prices = await fetchMetalPricesFromGoldApi();
    return Response.json(prices);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch metal prices' }, { status: 500 });
  }
}

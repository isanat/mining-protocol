import { NextResponse } from "next/server";
import { getUSDTBRLPrice, getCachedPriceInfo } from "@/lib/usdt-price";

/**
 * GET /api/exchange-rate
 * Returns the current USDT/BRL exchange rate
 * Used by frontend for real-time currency conversion display
 */
export async function GET() {
  try {
    const rate = await getUSDTBRLPrice();
    const cacheInfo = getCachedPriceInfo();

    return NextResponse.json({
      success: true,
      rate,
      pair: "USDT/BRL",
      timestamp: new Date().toISOString(),
      cacheAge: cacheInfo?.age || 0,
      source: "CoinGecko",
      // Conversion helpers
      convert: {
        usdtToBrl: (usdt: number) => Number((usdt * rate).toFixed(2)),
        brlToUsdt: (brl: number) => Number((brl / rate).toFixed(6)),
      },
    });
  } catch (error) {
    console.error("Exchange rate API error:", error);
    
    // Return fallback rate
    return NextResponse.json({
      success: false,
      rate: 5.23, // Fallback rate
      pair: "USDT/BRL",
      timestamp: new Date().toISOString(),
      error: "Using fallback rate",
      convert: {
        usdtToBrl: (usdt: number) => Number((usdt * 5.23).toFixed(2)),
        brlToUsdt: (brl: number) => Number((brl / 5.23).toFixed(6)),
      },
    });
  }
}

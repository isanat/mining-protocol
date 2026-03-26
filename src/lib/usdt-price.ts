/**
 * USDT Price Service
 * 
 * This service handles USDT/BRL conversion using CoinGecko API.
 * All balances in the system are stored in USDT as the primary currency.
 * 
 * Cache duration: 60 seconds (CoinGecko free tier: 10-30 calls/minute)
 */

// Cache for USDT/BRL price
let cachedPrice: {
  price: number;
  timestamp: number;
} | null = null;

// Cache duration in milliseconds (60 seconds)
const CACHE_DURATION = 60 * 1000;

// Fallback price if API fails (approximate USDT/BRL rate)
const FALLBACK_PRICE = 5.23;

/**
 * Get current USDT/BRL price from CoinGecko API
 * Uses caching to avoid rate limiting
 */
export async function getUSDTBRLPrice(): Promise<number> {
  // Check cache first
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.price;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=brl',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('CoinGecko API failed, using cached or fallback price');
      return cachedPrice?.price || FALLBACK_PRICE;
    }

    const data = await response.json();
    const price = data?.tether?.brl;

    if (typeof price !== 'number' || price <= 0) {
      console.warn('Invalid price from CoinGecko, using fallback');
      return cachedPrice?.price || FALLBACK_PRICE;
    }

    // Update cache
    cachedPrice = {
      price,
      timestamp: Date.now(),
    };

    return price;
  } catch (error) {
    console.error('Error fetching USDT/BRL price:', error);
    return cachedPrice?.price || FALLBACK_PRICE;
  }
}

/**
 * Convert BRL amount to USDT
 * @param brlAmount Amount in Brazilian Reais
 * @returns Equivalent amount in USDT (up to 6 decimal places)
 */
export async function convertBRLtoUSDT(brlAmount: number): Promise<number> {
  if (brlAmount <= 0) return 0;
  
  const price = await getUSDTBRLPrice();
  const usdtAmount = brlAmount / price;
  
  // Round to 6 decimal places (USDT precision)
  return Math.round(usdtAmount * 1_000_000) / 1_000_000;
}

/**
 * Convert USDT amount to BRL
 * @param usdtAmount Amount in USDT
 * @returns Equivalent amount in Brazilian Reais
 */
export async function convertUSDTtoBRL(usdtAmount: number): Promise<number> {
  if (usdtAmount <= 0) return 0;
  
  const price = await getUSDTBRLPrice();
  const brlAmount = usdtAmount * price;
  
  // Round to 2 decimal places (BRL precision)
  return Math.round(brlAmount * 100) / 100;
}

/**
 * Get both prices at once (for display purposes)
 * @param usdtAmount Amount in USDT
 * @returns Object with USDT amount and BRL equivalent
 */
export async function getUSDTWithBRL(usdtAmount: number): Promise<{
  usdt: number;
  brl: number;
  rate: number;
}> {
  const rate = await getUSDTBRLPrice();
  const brl = await convertUSDTtoBRL(usdtAmount);
  
  return {
    usdt: usdtAmount,
    brl,
    rate,
  };
}

/**
 * Get BRL amount with USDT equivalent (for PIX deposits)
 * @param brlAmount Amount in BRL
 * @returns Object with BRL amount and USDT equivalent
 */
export async function getBRLWithUSDT(brlAmount: number): Promise<{
  brl: number;
  usdt: number;
  rate: number;
}> {
  const rate = await getUSDTBRLPrice();
  const usdt = await convertBRLtoUSDT(brlAmount);
  
  return {
    brl: brlAmount,
    usdt,
    rate,
  };
}

/**
 * Format USDT amount for display
 * @param amount Amount in USDT
 * @returns Formatted string (e.g., "$ 1,234.56 USDT")
 */
export function formatUSDT(amount: number): string {
  return `$ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })} USDT`;
}

/**
 * Format BRL amount for display
 * @param amount Amount in BRL
 * @returns Formatted string (e.g., "R$ 1.234,56")
 */
export function formatBRL(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Format USDT with BRL equivalent for display
 * @param usdtAmount Amount in USDT
 * @param brlEquivalent BRL equivalent
 * @returns Formatted string (e.g., "$ 100.00 USDT (≈ R$ 523,00)")
 */
export function formatUSDTWithBRL(usdtAmount: number, brlEquivalent: number): string {
  return `${formatUSDT(usdtAmount)} (≈ ${formatBRL(brlEquivalent)})`;
}

/**
 * Clear the price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  cachedPrice = null;
}

/**
 * Get cached price info (useful for debugging)
 */
export function getCachedPriceInfo(): { price: number; age: number } | null {
  if (!cachedPrice) return null;
  
  return {
    price: cachedPrice.price,
    age: Date.now() - cachedPrice.timestamp,
  };
}

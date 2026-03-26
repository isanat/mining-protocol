import { useState, useEffect, useCallback, useRef } from "react";

// Types
export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  priceBrl: number;
  priceUsd: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number;
  athChange: number;
  atl: number;
  atlChange: number;
  sparkline: number[];
  image: string;
  lastUpdated: string;
}

export interface NetworkStats {
  difficulty: number;
  hashrate: string;
  hashrateEH: number;
  blockHeight: number;
  avgBlockTime: number;
  totalTransactions: number;
  mempoolSize: number;
  networkFees: {
    fastest: number;
    halfHour: number;
    hour: number;
    economy: number;
  };
  blockchainSize: number;
  nodes: number;
  nextDifficulty: {
    estimate: number;
    change: number;
    date: string;
  };
}

export interface MiningMetrics {
  blockReward: number;
  dailyBtcMined: number;
  networkSecurity: {
    securityBudget: number;
    percentSupply: number;
  };
  revenueEstimates: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  avgMinerRevenue: {
    daily: number;
  };
}

export interface FearGreedData {
  value: number;
  classification: string;
  interpretation: string;
  trend: "up" | "down" | "neutral";
}

export interface GlobalStats {
  totalMarketCap: {
    usd: number;
    brl: number;
    change24h: number;
  };
  totalVolume: {
    usd: number;
    brl: number;
  };
  btcDominance: number;
  ethDominance: number;
  altcoinDominance: number;
  activeCryptos: number;
  totalMarkets: number;
}

// USDT/BRL conversion rate state
let usdtBrlRate = 5.23; // Default fallback
let usdtBrlRateTimestamp = 0;

// Fetch USDT/BRL rate from CoinGecko
export async function fetchUSDTBRLRate(): Promise<number> {
  // Cache for 60 seconds
  if (Date.now() - usdtBrlRateTimestamp < 60000) {
    return usdtBrlRate;
  }
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=brl',
      { next: { revalidate: 60 } }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.tether?.brl) {
        usdtBrlRate = data.tether.brl;
        usdtBrlRateTimestamp = Date.now();
      }
    }
  } catch (error) {
    console.warn('Failed to fetch USDT/BRL rate, using cached value');
  }
  
  return usdtBrlRate;
}

// Convert USDT to BRL
export function convertUsdtToBrl(usdtAmount: number, rate?: number): number {
  const currentRate = rate || usdtBrlRate;
  return usdtAmount * currentRate;
}

// Convert BRL to USDT
export function convertBrlToUsdt(brlAmount: number, rate?: number): number {
  const currentRate = rate || usdtBrlRate;
  return brlAmount / currentRate;
}

// Format USDT amount with BRL equivalent
export function formatUsdtWithBrl(usdtAmount: number, rate?: number): string {
  const brlEquivalent = convertUsdtToBrl(usdtAmount, rate);
  return `$${usdtAmount.toFixed(2)} USDT (≈ R$ ${brlEquivalent.toFixed(2)})`;
}

// Hook for USDT/BRL rate
export function useUSDTBRLRate() {
  const [rate, setRate] = useState(usdtBrlRate);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchRate = useCallback(async () => {
    const newRate = await fetchUSDTBRLRate();
    setRate(newRate);
    setLoading(false);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  return {
    rate,
    loading,
    lastUpdate,
    convertUsdtToBrl: (usdt: number) => convertUsdtToBrl(usdt, rate),
    convertBrlToUsdt: (brl: number) => convertBrlToUsdt(brl, rate),
    formatUsdtWithBrl: (usdt: number) => formatUsdtWithBrl(usdt, rate),
    refetch: fetchRate,
  };
}

// Hook for crypto prices
export function useCryptoPrices() {
  const [data, setData] = useState<{
    coins: CryptoPrice[];
    exchangeRate: { brlToUsd: number; usdToBrl: number };
    marketOverview: { btcDominance: string; totalMarketCapBrl: number };
    loading: boolean;
    error: string | null;
    lastUpdate: Date | null;
  }>({
    coins: [],
    exchangeRate: { brlToUsd: 5.5, usdToBrl: 0.1818 },
    marketOverview: { btcDominance: "52.5", totalMarketCapBrl: 0 },
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/prices");
      const json = await res.json();
      
      if (mountedRef.current) {
        setData({
          coins: json.coins || [],
          exchangeRate: json.exchangeRate || { brlToUsd: 5.5, usdToBrl: 0.1818 },
          marketOverview: json.marketOverview || { btcDominance: "52.5", totalMarketCapBrl: 0 },
          loading: false,
          error: json.success ? null : "Using fallback data",
          lastUpdate: new Date(),
        });
      }
    } catch {
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch prices",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    fetchData();  
    
    // Set up interval for refreshing
    const interval = setInterval(fetchData, 120000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}

// Hook for network stats
export function useNetworkStats() {
  const [data, setData] = useState<{
    network: NetworkStats | null;
    mining: MiningMetrics | null;
    loading: boolean;
    error: string | null;
    lastUpdate: Date | null;
  }>({
    network: null,
    mining: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/network");
      const json = await res.json();
      
      if (mountedRef.current) {
        setData({
          network: json.network || null,
          mining: json.mining || null,
          loading: false,
          error: json.success ? null : "Using fallback data",
          lastUpdate: new Date(),
        });
      }
    } catch {
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch network stats",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
     
    fetchData();
    const interval = setInterval(fetchData, 300000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}

// Hook for Fear & Greed Index
export function useFearGreed() {
  const [data, setData] = useState<{
    current: FearGreedData | null;
    historical: { date: string; value: number; classification: string }[];
    averages: { weekly: string; monthly: string };
    breakdown: { extremeFear: number; fear: number; neutral: number; greed: number; extremeGreed: number };
    loading: boolean;
    error: string | null;
    lastUpdate: Date | null;
  }>({
    current: null,
    historical: [],
    averages: { weekly: "50", monthly: "50" },
    breakdown: { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 },
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/fear-greed");
      const json = await res.json();
      
      if (mountedRef.current) {
        setData({
          current: json.current || null,
          historical: json.historical || [],
          averages: json.averages || { weekly: "50", monthly: "50" },
          breakdown: json.breakdown || { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 },
          loading: false,
          error: json.success ? null : "Using fallback data",
          lastUpdate: new Date(),
        });
      }
    } catch {
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch Fear & Greed",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
     
    fetchData();
    const interval = setInterval(fetchData, 3600000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}

// Hook for global stats
export function useGlobalStats() {
  const [data, setData] = useState<{
    global: GlobalStats | null;
    trending: unknown[];
    topGainers: unknown[];
    topLosers: unknown[];
    marketSentiment: unknown;
    loading: boolean;
    error: string | null;
    lastUpdate: Date | null;
  }>({
    global: null,
    trending: [],
    topGainers: [],
    topLosers: [],
    marketSentiment: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/stats");
      const json = await res.json();
      
      if (mountedRef.current) {
        setData({
          global: json.global || null,
          trending: json.trending || [],
          topGainers: json.topGainers || [],
          topLosers: json.topLosers || [],
          marketSentiment: json.marketSentiment || null,
          loading: false,
          error: json.success ? null : "Using fallback data",
          lastUpdate: new Date(),
        });
      }
    } catch {
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch global stats",
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
     
    fetchData();
    const interval = setInterval(fetchData, 120000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}

// Helper to get BTC price
export function useBtcPrice() {
  const { coins, exchangeRate, loading } = useCryptoPrices();
  const btc = coins.find(c => c.id === "bitcoin");
  
  return {
    priceBrl: btc?.priceBrl || 580000,
    priceUsd: btc?.priceUsd || 105000,
    change24h: btc?.change24h || 0,
    exchangeRate: exchangeRate.brlToUsd,
    loading,
  };
}

// Helper to format large numbers
export function formatNumber(num: number, currency: "brl" | "usd" | "usdt" = "usdt"): string {
  if (currency === "usdt") {
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B USDT`;
    }
    if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M USDT`;
    }
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  }
  
  if (num >= 1e12) {
    return currency === "brl" 
      ? `R$ ${(num / 1e12).toFixed(2)}T`
      : `$${(num / 1e12).toFixed(2)}T`;
  }
  if (num >= 1e9) {
    return currency === "brl" 
      ? `R$ ${(num / 1e9).toFixed(2)}B`
      : `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return currency === "brl" 
      ? `R$ ${(num / 1e6).toFixed(2)}M`
      : `$${(num / 1e6).toFixed(2)}M`;
  }
  return currency === "brl" 
    ? `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

// Helper for percentage
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

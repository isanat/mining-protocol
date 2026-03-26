import { useState, useEffect, useCallback, useRef } from "react";

export interface MinerProfitability {
  coin: string;
  dailyRevenue: number;
  dailyCost: number;
  dailyProfit: number;
  monthlyProfit: number;
  roi: number;
  efficiency: number;
}

export interface MiningProfitabilityData {
  success: boolean;
  timestamp: string;
  electricityCost: number;
  prices: {
    btc: number;
    btcBrl: number;
  };
  miners: Record<string, MinerProfitability>;
  recommendations: {
    mostProfitable: string;
    bestEfficiency: string;
  };
  fallback?: boolean;
}

export function useMiningProfitability() {
  const [data, setData] = useState<MiningProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/mining-profitability");
      const json = await res.json();
      
      if (mountedRef.current) {
        setData(json);
        setError(json.success ? null : "Using fallback data");
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError("Failed to fetch mining profitability");
        setLoading(false);
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

  return { data, loading, error, refetch: fetchData };
}

// Helper to get profitability for a specific miner model
export function getMinerProfitability(
  data: MiningProfitabilityData | null,
  minerName: string
): MinerProfitability | null {
  if (!data?.miners) return null;
  
  // Try exact match first
  if (data.miners[minerName]) {
    return data.miners[minerName];
  }
  
  // Try partial match
  const keys = Object.keys(data.miners);
  const match = keys.find(key => 
    minerName.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(minerName.toLowerCase())
  );
  
  return match ? data.miners[match] : null;
}

// Helper to convert USD to BRL
export function usdToBrl(usd: number, rate: number = 5.5): number {
  return usd * rate;
}

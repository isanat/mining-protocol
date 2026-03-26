import { NextResponse } from "next/server";

// WhatToMine API - Free mining profitability calculator
// https://whattomine.com/coins.json - Lists all coins with profitability

interface CoinProfitability {
  tag: string;
  algorithm: string;
  block_time: number;
  difficulty: number;
  difficulty24: number;
  nethash: number;
  exchange_rate: number;
  exchange_rate24: number;
  exchange_rate_vol: number;
  exchange_rate_curr: string;
  market_cap: number;
  estimated_rewards: number;
  estimated_rewards24: number;
  btc_revenue: number;
  btc_revenue24: number;
  revenue: number;
  revenue24: number;
  cost: number;
  profit: number;
  timestamp: number;
}

// ASIC profitability data (manual calculation based on hashrate)
// WhatToMine doesn't have a direct ASIC API, so we calculate from coin data

export async function GET() {
  try {
    // Fetch BTC mining data
    const btcRes = await fetch("https://whattomine.com/coins/1.json", {
      next: { revalidate: 300 }, // Cache 5 minutes
    });
    
    // Fetch LTC data (for Scrypt miners like L7)
    const ltcRes = await fetch("https://whattomine.com/coins/8.json", {
      next: { revalidate: 300 },
    });

    // Fetch KAS data (for KAS miners like KS5, KS3)
    const kasRes = await fetch("https://whattomine.com/coins/313.json", {
      next: { revalidate: 300 },
    });

    // Fetch KDA data (for Kadena miners)
    const kdaRes = await fetch("https://whattomine.com/coins/283.json", {
      next: { revalidate: 300 },
    });

    // Fetch DOGE data
    const dogeRes = await fetch("https://whattomine.com/coins/24.json", {
      next: { revalidate: 300 },
    });

    const btcData = btcRes.ok ? await btcRes.json() : null;
    const ltcData = ltcRes.ok ? await ltcRes.json() : null;
    const kasData = kasRes.ok ? await kasRes.json() : null;
    const kdaData = kdaRes.ok ? await kdaRes.json() : null;
    const dogeData = dogeRes.ok ? await dogeRes.json() : null;

    // Calculate ASIC miner profitability
    // Formula: (hashrate / network_hashrate) * block_reward * blocks_per_day * price

    const ASIC_MINERS: Record<string, { hashrate: number; power: number; coin: string }> = {
      // Bitcoin miners (SHA-256)
      "Antminer S21": { hashrate: 200e12, power: 3500, coin: "BTC" }, // 200 TH/s
      "Antminer S19 XP": { hashrate: 140e12, power: 3010, coin: "BTC" }, // 140 TH/s
      "Antminer S19 Pro": { hashrate: 110e12, power: 3250, coin: "BTC" }, // 110 TH/s
      "Antminer S19j Pro": { hashrate: 100e12, power: 3050, coin: "BTC" }, // 100 TH/s
      "Whatsminer M50S": { hashrate: 126e12, power: 3276, coin: "BTC" }, // 126 TH/s
      "Whatsminer M30S++": { hashrate: 112e12, power: 3472, coin: "BTC" }, // 112 TH/s
      
      // Kaspa miners (kHeavyHash)
      "Antminer KS5": { hashrate: 20e12, power: 3000, coin: "KAS" }, // 20 TH/s
      "Antminer KS3": { hashrate: 9.4e12, power: 3500, coin: "KAS" }, // 9.4 TH/s
      
      // Litecoin/Dogecoin miners (Scrypt)
      "Antminer L7": { hashrate: 9.05e9, power: 3425, coin: "LTC" }, // 9.05 GH/s
      
      // Kadena miners (Blake2S)
      "Goldshell KD6": { hashrate: 26.3e9, power: 2680, coin: "KDA" }, // 26.3 GH/s (KD5 specs)
    };

    // Calculate profitability for each miner
    const minerProfitability: Record<string, {
      coin: string;
      dailyRevenue: number;
      dailyCost: number;
      dailyProfit: number;
      monthlyProfit: number;
      roi: number;
      efficiency: number;
    }> = {};

    const electricityCost = 0.10; // $0.10 per kWh (adjustable)
    const btcPrice = btcData?.exchange_rate || 106000;

    for (const [miner, specs] of Object.entries(ASIC_MINERS)) {
      let dailyRevenue = 0;
      const dailyCost = (specs.power * 24 * electricityCost) / 1000; // USD

      if (specs.coin === "BTC" && btcData) {
        // BTC Mining calculation
        const networkHashrate = btcData.nethash || 650e18; // ~650 EH/s
        const blockReward = 3.125;
        const blocksPerDay = 144;
        
        // Daily revenue in BTC
        const btcPerDay = (specs.hashrate / networkHashrate) * blockReward * blocksPerDay;
        dailyRevenue = btcPerDay * btcPrice;
      } 
      else if (specs.coin === "KAS" && kasData) {
        // KAS Mining calculation
        const networkHashrate = kasData.nethash || 1e15;
        dailyRevenue = (specs.hashrate / networkHashrate) * kasData.btc_revenue * btcPrice;
      }
      else if (specs.coin === "LTC" && ltcData) {
        // LTC Mining (Scrypt)
        const networkHashrate = ltcData.nethash || 1e12;
        dailyRevenue = (specs.hashrate / networkHashrate) * ltcData.btc_revenue * btcPrice;
      }
      else if (specs.coin === "KDA" && kdaData) {
        // KDA Mining
        const networkHashrate = kdaData.nethash || 1e12;
        dailyRevenue = (specs.hashrate / networkHashrate) * kdaData.btc_revenue * btcPrice;
      }

      const dailyProfit = dailyRevenue - dailyCost;
      const monthlyProfit = dailyProfit * 30;
      const efficiency = dailyRevenue / specs.power; // Revenue per watt

      minerProfitability[miner] = {
        coin: specs.coin,
        dailyRevenue: Number(dailyRevenue.toFixed(2)),
        dailyCost: Number(dailyCost.toFixed(2)),
        dailyProfit: Number(dailyProfit.toFixed(2)),
        monthlyProfit: Number(monthlyProfit.toFixed(2)),
        roi: dailyCost > 0 ? Number(((dailyProfit / dailyCost) * 100).toFixed(1)) : 0,
        efficiency: Number(efficiency.toFixed(6)),
      };
    }

    // Network-wide statistics
    const networkStats = {
      btc: {
        difficulty: btcData?.difficulty || 83e12,
        networkHashrate: btcData?.nethash || 650e18,
        blockReward: btcData?.estimated_rewards ? btcData.estimated_rewards * 144 : 450,
        revenue: btcData?.btc_revenue || 0,
      },
      kas: {
        difficulty: kasData?.difficulty || 0,
        networkHashrate: kasData?.nethash || 0,
        revenue: kasData?.btc_revenue || 0,
      },
      ltc: {
        difficulty: ltcData?.difficulty || 0,
        networkHashrate: ltcData?.nethash || 0,
        revenue: ltcData?.btc_revenue || 0,
      },
      kda: {
        difficulty: kdaData?.difficulty || 0,
        networkHashrate: kdaData?.nethash || 0,
        revenue: kdaData?.btc_revenue || 0,
      },
    };

    // BRL conversion
    const brlRate = 5.5;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      electricityCost,
      prices: {
        btc: btcPrice,
        btcBrl: btcPrice * brlRate,
      },
      miners: minerProfitability,
      networkStats,
      recommendations: {
        mostProfitable: Object.entries(minerProfitability)
          .sort((a, b) => b[1].dailyProfit - a[1].dailyProfit)[0]?.[0] || "Antminer S21",
        bestEfficiency: Object.entries(minerProfitability)
          .sort((a, b) => b[1].efficiency - a[1].efficiency)[0]?.[0] || "Antminer S21",
      },
    });
  } catch (error) {
    console.error("Error fetching mining profitability:", error);

    // Fallback data based on realistic estimates
    const brlRate = 5.5;
    
    return NextResponse.json({
      success: false,
      fallback: true,
      timestamp: new Date().toISOString(),
      electricityCost: 0.10,
      prices: {
        btc: 106000,
        btcBrl: 583000,
      },
      miners: {
        "Antminer S21": { coin: "BTC", dailyRevenue: 15.20, dailyCost: 8.40, dailyProfit: 6.80, monthlyProfit: 204, roi: 81, efficiency: 0.00434 },
        "Antminer S19 XP": { coin: "BTC", dailyRevenue: 10.64, dailyCost: 7.22, dailyProfit: 3.42, monthlyProfit: 103, roi: 47.4, efficiency: 0.00353 },
        "Antminer S19 Pro": { coin: "BTC", dailyRevenue: 8.36, dailyCost: 7.80, dailyProfit: 0.56, monthlyProfit: 17, roi: 7.2, efficiency: 0.00257 },
        "Antminer S19j Pro": { coin: "BTC", dailyRevenue: 7.60, dailyCost: 7.32, dailyProfit: 0.28, monthlyProfit: 8, roi: 3.8, efficiency: 0.00249 },
        "Whatsminer M50S": { coin: "BTC", dailyRevenue: 9.58, dailyCost: 7.86, dailyProfit: 1.72, monthlyProfit: 52, roi: 21.9, efficiency: 0.00293 },
        "Whatsminer M30S++": { coin: "BTC", dailyRevenue: 8.51, dailyCost: 8.33, dailyProfit: 0.18, monthlyProfit: 5, roi: 2.2, efficiency: 0.00245 },
        "Antminer KS5": { coin: "KAS", dailyRevenue: 45.20, dailyCost: 7.20, dailyProfit: 38.00, monthlyProfit: 1140, roi: 527.8, efficiency: 0.01507 },
        "Antminer KS3": { coin: "KAS", dailyRevenue: 21.24, dailyCost: 8.40, dailyProfit: 12.84, monthlyProfit: 385, roi: 152.9, efficiency: 0.00607 },
        "Antminer L7": { coin: "LTC", dailyRevenue: 12.85, dailyCost: 8.22, dailyProfit: 4.63, monthlyProfit: 139, roi: 56.3, efficiency: 0.00376 },
        "Goldshell KD6": { coin: "KDA", dailyRevenue: 8.50, dailyCost: 6.43, dailyProfit: 2.07, monthlyProfit: 62, roi: 32.2, efficiency: 0.00317 },
      },
      recommendations: {
        mostProfitable: "Antminer KS5",
        bestEfficiency: "Antminer KS5",
      },
    });
  }
}

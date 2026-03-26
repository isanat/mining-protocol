import { NextResponse } from "next/server";

// Multiple free APIs for Bitcoin network stats
// Blockchain.com, Blockcypher, and mempool.space

interface NetworkStats {
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

export async function GET() {
  try {
    // Fetch from multiple sources in parallel
    const [blockchainRes, mempoolRes, blockcypherRes] = await Promise.all([
      // Blockchain.com API - General stats
      fetch("https://api.blockchain.info/stats", {
        next: { revalidate: 120 },
      }),
      // Mempool.space API - Fees and mempool
      fetch("https://mempool.space/api/v1/fees/recommended", {
        next: { revalidate: 30 },
      }),
      // Blockcypher API - Network info
      fetch("https://api.blockcypher.com/v1/btc/main", {
        next: { revalidate: 120 },
      }),
    ]);

    const blockchainData = blockchainRes.ok ? await blockchainRes.json() : null;
    const mempoolData = mempoolRes.ok ? await mempoolRes.json() : null;
    const blockcypherData = blockcypherRes.ok ? await blockcypherRes.json() : null;

    // Fetch difficulty estimate from mempool.space
    const difficultyRes = await fetch("https://mempool.space/api/v1/difficulty-adjustment", {
      next: { revalidate: 300 },
    });
    const difficultyData = difficultyRes.ok ? await difficultyRes.json() : null;

    // Calculate hashrate in EH/s
    const hashrate = blockchainData?.hashrate || 650000000000000000; // ~650 EH/s
    const hashrateEH = hashrate / 1e18;

    const stats: NetworkStats = {
      difficulty: blockchainData?.difficulty || blockcypherData?.difficulty || 83.1e12,
      hashrate: `${hashrateEH.toFixed(2)} EH/s`,
      hashrateEH: hashrateEH,
      blockHeight: blockchainData?.n_blocks_total || blockcypherData?.height || 850000,
      avgBlockTime: 600, // ~10 minutes in seconds
      totalTransactions: blockchainData?.n_tx || 0,
      mempoolSize: blockchainData?.n_tx_mempool || 0,
      networkFees: {
        fastest: mempoolData?.fastestFee || 25,
        halfHour: mempoolData?.halfHourFee || 20,
        hour: mempoolData?.hourFee || 15,
        economy: mempoolData?.economyFee || 5,
      },
      blockchainSize: blockchainData?.total_bc || 19750000,
      nodes: 15000, // Estimated
      nextDifficulty: {
        estimate: difficultyData?.estimatedRetargetDifficulty || 85e12,
        change: difficultyData?.difficultyChange || 2.5,
        date: difficultyData?.nextRetargetDate 
          ? new Date(difficultyData.nextRetargetDate * 1000).toISOString()
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    // Calculate mining metrics
    const btcPrice = 580000; // Will be updated from prices API
    const blockReward = 3.125; // BTC per block
    const dailyBlocks = 144;
    const dailyBtcMined = blockReward * dailyBlocks;
    const dailyRevenue = dailyBtcMined * (btcPrice / stats.difficulty * 1e12);

    // Mining profitability estimates
    const miningMetrics = {
      blockReward,
      dailyBtcMined,
      networkSecurity: {
        securityBudget: dailyBtcMined * btcPrice,
        percentSupply: ((dailyBtcMined * 365) / 19750000) * 100,
      },
      revenueEstimates: {
        daily: dailyBtcMined * btcPrice,
        monthly: dailyBtcMined * 30 * btcPrice,
        yearly: dailyBtcMined * 365 * btcPrice,
      },
      avgMinerRevenue: {
        daily: (dailyBtcMined * btcPrice) / 1500000, // Per miner (estimated)
      },
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      network: stats,
      mining: miningMetrics,
      sources: {
        blockchain: !!blockchainData,
        mempool: !!mempoolData,
        blockcypher: !!blockcypherData,
      },
    });
  } catch (error) {
    console.error("Error fetching network stats:", error);

    // Return fallback data
    return NextResponse.json({
      success: false,
      error: "Using fallback data",
      fallback: true,
      timestamp: new Date().toISOString(),
      network: {
        difficulty: 83.1e12,
        hashrate: "650 EH/s",
        hashrateEH: 650,
        blockHeight: 850000,
        avgBlockTime: 600,
        totalTransactions: 950000000,
        mempoolSize: 150000,
        networkFees: {
          fastest: 25,
          halfHour: 20,
          hour: 15,
          economy: 5,
        },
        blockchainSize: 19750000,
        nodes: 15000,
        nextDifficulty: {
          estimate: 85e12,
          change: 2.5,
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      mining: {
        blockReward: 3.125,
        dailyBtcMined: 450,
        networkSecurity: {
          securityBudget: 261000000,
          percentSupply: 0.83,
        },
        revenueEstimates: {
          daily: 261000000,
          monthly: 7830000000,
          yearly: 95265000000,
        },
        avgMinerRevenue: {
          daily: 174,
        },
      },
      sources: {
        blockchain: false,
        mempool: false,
        blockcypher: false,
      },
    });
  }
}

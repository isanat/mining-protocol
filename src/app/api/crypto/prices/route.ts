import { NextResponse } from "next/server";

// CoinGecko API - Free, no API key required
// Rate limit: 10-30 calls/minute

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  atl_change_percentage: number;
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
  image?: {
    small: string;
    large: string;
  };
}

export async function GET() {
  try {
    // Fetch prices in BRL and USD for multiple coins
    const coins = [
      "bitcoin",
      "ethereum",
      "litecoin",
      "dogecoin",
      "kaspa",
      "kadena",
      "monero"
    ];

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=${coins.join(",")}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d,30d`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CryptoPrice[] = await response.json();

    // Also fetch USD prices
    const usdResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coins.join(",")}&order=market_cap_desc`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    const usdData: CryptoPrice[] = await usdResponse.json();

    // Combine BRL and USD data
    const combinedData = data.map((coin, index) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      priceBrl: coin.current_price,
      priceUsd: usdData[index]?.current_price || 0,
      change24h: coin.price_change_percentage_24h || 0,
      change7d: coin.price_change_percentage_7d || 0,
      change30d: (coin as any).price_change_percentage_30d || 0,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      volume24h: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      ath: coin.ath,
      athChange: coin.ath_change_percentage,
      atl: coin.atl,
      atlChange: coin.atl_change_percentage,
      sparkline: coin.sparkline_in_7d?.price || [],
      image: coin.image?.small || "",
      lastUpdated: coin.last_updated,
    }));

    // Calculate BTC dominance and market totals
    const btc = data.find((c) => c.id === "bitcoin");
    const totalMarketCap = data.reduce((sum, c) => sum + c.market_cap, 0);
    const btcDominance = btc ? (btc.market_cap / totalMarketCap) * 100 : 0;

    // BRL to USD exchange rate
    const brlToUsd = btc && usdData.find((c) => c.id === "bitcoin")
      ? btc.current_price / (usdData.find((c) => c.id === "bitcoin")?.current_price || 1)
      : 5.5;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      exchangeRate: {
        brlToUsd: brlToUsd,
        usdToBrl: 1 / brlToUsd,
      },
      marketOverview: {
        btcDominance: btcDominance.toFixed(2),
        totalMarketCapBrl: totalMarketCap,
      },
      coins: combinedData,
    });
  } catch (error) {
    console.error("Error fetching crypto prices:", error);

    // Return fallback data
    return NextResponse.json({
      success: false,
      error: "Unable to fetch live prices",
      fallback: true,
      timestamp: new Date().toISOString(),
      exchangeRate: {
        brlToUsd: 5.5,
        usdToBrl: 0.1818,
      },
      marketOverview: {
        btcDominance: "52.5",
        totalMarketCapBrl: 8500000000000,
      },
      coins: [
        {
          id: "bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          priceBrl: 584250,
          priceUsd: 106200,
          change24h: 2.5,
          change7d: 5.2,
          change30d: 12.8,
          marketCap: 2100000000000,
          marketCapRank: 1,
          volume24h: 85000000000,
          high24h: 590000,
          low24h: 575000,
          circulatingSupply: 19750000,
          totalSupply: 21000000,
          maxSupply: 21000000,
          ath: 735000,
          athChange: -20.5,
          atl: 150,
          atlChange: 388000,
          sparkline: [],
          image: "",
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          priceBrl: 22500,
          priceUsd: 4100,
          change24h: 1.8,
          change7d: 3.5,
          change30d: 8.2,
          marketCap: 490000000000,
          marketCapRank: 2,
          volume24h: 15000000000,
          high24h: 23000,
          low24h: 21800,
          circulatingSupply: 120000000,
          totalSupply: null,
          maxSupply: null,
          ath: 28500,
          athChange: -21,
          atl: 2.5,
          atlChange: 900000,
          sparkline: [],
          image: "",
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "litecoin",
          symbol: "LTC",
          name: "Litecoin",
          priceBrl: 520,
          priceUsd: 95,
          change24h: 1.2,
          change7d: 2.8,
          change30d: 5.5,
          marketCap: 38000000000,
          marketCapRank: 15,
          volume24h: 1200000000,
          high24h: 540,
          low24h: 505,
          circulatingSupply: 74000000,
          totalSupply: 84000000,
          maxSupply: 84000000,
          ath: 1950,
          athChange: -73,
          atl: 1.5,
          atlChange: 34500,
          sparkline: [],
          image: "",
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "kaspa",
          symbol: "KAS",
          name: "Kaspa",
          priceBrl: 0.75,
          priceUsd: 0.136,
          change24h: -2.5,
          change7d: 8.2,
          change30d: 25.5,
          marketCap: 18000000000,
          marketCapRank: 25,
          volume24h: 45000000,
          high24h: 0.82,
          low24h: 0.71,
          circulatingSupply: 24000000000,
          totalSupply: 28700000000,
          maxSupply: 28700000000,
          ath: 1.05,
          athChange: -28,
          atl: 0.001,
          atlChange: 75000,
          sparkline: [],
          image: "",
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "kadena",
          symbol: "KDA",
          name: "Kadena",
          priceBrl: 4.20,
          priceUsd: 0.76,
          change24h: 3.2,
          change7d: -1.5,
          change30d: 12.8,
          marketCap: 900000000,
          marketCapRank: 150,
          volume24h: 2500000,
          high24h: 4.50,
          low24h: 4.00,
          circulatingSupply: 210000000,
          totalSupply: 1000000000,
          maxSupply: 1000000000,
          ath: 145,
          athChange: -97,
          atl: 0.50,
          atlChange: 740,
          sparkline: [],
          image: "",
          lastUpdated: new Date().toISOString(),
        },
      ],
    });
  }
}

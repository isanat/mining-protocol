import { NextResponse } from "next/server";

// Combined crypto statistics from multiple free APIs

export async function GET() {
  try {
    // Fetch global market data from CoinGecko
    const globalRes = await fetch("https://api.coingecko.com/api/v3/global", {
      next: { revalidate: 120 },
    });

    const globalData = globalRes.ok ? await globalRes.json() : null;

    // Fetch trending coins
    const trendingRes = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      next: { revalidate: 1800 },
    });

    const trendingData = trendingRes.ok ? await trendingRes.json() : null;

    // Fetch top gainers and losers
    const gainersRes = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1&price_change_percentage=24h",
      { next: { revalidate: 120 } }
    );

    const gainersData = gainersRes.ok ? await gainersRes.json() : [];

    const losersRes = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_asc&per_page=10&page=1&price_change_percentage=24h",
      { next: { revalidate: 120 } }
    );

    const losersData = losersRes.ok ? await losersRes.json() : [];

    // Process global data
    const global = globalData?.data || {
      total_market_cap: { usd: 2500000000000 },
      total_volume: { usd: 85000000000 },
      market_cap_percentage: { btc: 52.5, eth: 17.5 },
      market_cap_change_percentage_24h_usd: 2.5,
      active_cryptocurrencies: 12000,
      markets: 800,
    };

    // Format trending coins
    const trending = trendingData?.coins?.slice(0, 5).map((item: any) => ({
      id: item.item.id,
      name: item.item.name,
      symbol: item.item.symbol,
      marketCapRank: item.item.market_cap_rank,
      priceBtc: item.item.price_btc,
    })) || [];

    // Format gainers
    const topGainers = gainersData.slice(0, 5).map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      change24h: coin.price_change_percentage_24h?.toFixed(2) || 0,
      price: coin.current_price,
      image: coin.image,
    }));

    // Format losers
    const topLosers = losersData.slice(0, 5).map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      change24h: coin.price_change_percentage_24h?.toFixed(2) || 0,
      price: coin.current_price,
      image: coin.image,
    }));

    // Calculate BRL values
    const brlRate = 5.5; // Will be updated from prices API

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      global: {
        totalMarketCap: {
          usd: global.total_market_cap?.usd || 2500000000000,
          brl: (global.total_market_cap?.usd || 2500000000000) * brlRate,
          change24h: global.market_cap_change_percentage_24h_usd || 0,
        },
        totalVolume: {
          usd: global.total_volume?.usd || 85000000000,
          brl: (global.total_volume?.usd || 85000000000) * brlRate,
        },
        btcDominance: global.market_cap_percentage?.btc || 52.5,
        ethDominance: global.market_cap_percentage?.eth || 17.5,
        altcoinDominance: 100 - (global.market_cap_percentage?.btc || 52.5) - (global.market_cap_percentage?.eth || 17.5),
        activeCryptos: global.active_cryptocurrencies || 12000,
        totalMarkets: global.markets || 800,
        updatedAt: global.updated_at || Date.now(),
      },
      trending,
      topGainers,
      topLosers,
      marketSentiment: {
        volatilityIndex: "Médio",
        riskLevel: "Moderado",
        recommendation: global.market_cap_change_percentage_24h_usd > 2 
          ? "Mercado em alta - Momento favorável" 
          : global.market_cap_change_percentage_24h_usd < -2 
          ? "Mercado em queda - Cautela recomendada"
          : "Mercado estável - Aguardar definição",
      },
    });
  } catch (error) {
    console.error("Error fetching crypto stats:", error);

    return NextResponse.json({
      success: false,
      error: "Using fallback data",
      fallback: true,
      timestamp: new Date().toISOString(),
      global: {
        totalMarketCap: {
          usd: 2500000000000,
          brl: 13750000000000,
          change24h: 2.5,
        },
        totalVolume: {
          usd: 85000000000,
          brl: 467500000000,
        },
        btcDominance: 52.5,
        ethDominance: 17.5,
        altcoinDominance: 30,
        activeCryptos: 12000,
        totalMarkets: 800,
        updatedAt: Date.now(),
      },
      trending: [
        { id: "bitcoin", name: "Bitcoin", symbol: "BTC", marketCapRank: 1, priceBtc: 1 },
        { id: "ethereum", name: "Ethereum", symbol: "ETH", marketCapRank: 2, priceBtc: 0.05 },
      ],
      topGainers: [
        { id: "pepe", name: "Pepe", symbol: "PEPE", change24h: 25.5, price: 0.00001 },
      ],
      topLosers: [
        { id: "example", name: "Example", symbol: "EX", change24h: -15.2, price: 0.5 },
      ],
      marketSentiment: {
        volatilityIndex: "Médio",
        riskLevel: "Moderado",
        recommendation: "Mercado estável",
      },
    });
  }
}

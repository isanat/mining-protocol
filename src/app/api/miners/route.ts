import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// Fallback miners data when database is not available
// All prices in USDT (primary currency)
const FALLBACK_MINERS = [
  {
    id: "miner_1",
    name: "Antminer S21",
    model: "S21-200T",
    hashRate: 200,
    powerConsumption: 3500,
    coin: "BTC",
    pool: "Foundry USA",
    status: "online",
    dailyRevenue: 16.35, // USDT per day
    pricePerDay: 8.61, // USDT per day
    efficiency: 57.14,
    description: "Mais eficiente minerador Bitcoin SHA-256 - 200 TH/s",
  },
  {
    id: "miner_2",
    name: "Antminer S19 XP",
    model: "S19-XP-141T",
    hashRate: 141,
    powerConsumption: 3010,
    coin: "BTC",
    pool: "Antpool",
    status: "online",
    dailyRevenue: 11.51, // USDT per day
    pricePerDay: 6.12, // USDT per day
    efficiency: 46.85,
    description: "Alta eficiência - 141 TH/s, ideal para BTC",
  },
  {
    id: "miner_3",
    name: "Antminer S19 Pro",
    model: "S19-PRO-110T",
    hashRate: 110,
    powerConsumption: 3250,
    coin: "BTC",
    pool: "F2Pool",
    status: "online",
    dailyRevenue: 8.99, // USDT per day
    pricePerDay: 4.78, // USDT per day
    efficiency: 33.85,
    description: "Confiável e estável - 110 TH/s",
  },
  {
    id: "miner_4",
    name: "Antminer S19j Pro",
    model: "S19J-PRO-100T",
    hashRate: 100,
    powerConsumption: 3050,
    coin: "BTC",
    pool: "Binance Pool",
    status: "online",
    dailyRevenue: 8.17, // USDT per day
    pricePerDay: 4.21, // USDT per day
    efficiency: 32.79,
    description: "Excelente custo-benefício - 100 TH/s",
  },
  {
    id: "miner_5",
    name: "Antminer KS5",
    model: "KS5-20T",
    hashRate: 20000,
    powerConsumption: 3000,
    coin: "KAS",
    pool: "Kaspa Pool",
    status: "online",
    dailyRevenue: 47.80, // USDT per day
    pricePerDay: 22.94, // USDT per day
    efficiency: 83.33,
    description: "Minerador Kaspa mais rentável - 20 TH/s kHeavyHash",
  },
  {
    id: "miner_6",
    name: "Antminer KS3",
    model: "KS3-9.4T",
    hashRate: 9400,
    powerConsumption: 3500,
    coin: "KAS",
    pool: "Kaspa Pool",
    status: "online",
    dailyRevenue: 22.56, // USDT per day
    pricePerDay: 12.43, // USDT per day
    efficiency: 33.71,
    description: "Minerador Kaspa - 9.4 TH/s kHeavyHash",
  },
  {
    id: "miner_7",
    name: "Antminer L7",
    model: "L7-9.05G",
    hashRate: 9050,
    powerConsumption: 3425,
    coin: "LTC",
    pool: "LitecoinPool",
    status: "online",
    dailyRevenue: 13.77, // USDT per day
    pricePerDay: 7.27, // USDT per day
    efficiency: 21.02,
    description: "Minerador Litecoin/Dogecoin Scrypt - 9.05 GH/s",
  },
  {
    id: "miner_8",
    name: "Whatsminer M50S",
    model: "M50S-126T",
    hashRate: 126,
    powerConsumption: 3276,
    coin: "BTC",
    pool: "Foundry USA",
    status: "online",
    dailyRevenue: 10.29, // USDT per day
    pricePerDay: 5.35, // USDT per day
    efficiency: 38.46,
    description: "MicroBT Whatsminer - 126 TH/s",
  },
  {
    id: "miner_9",
    name: "Whatsminer M30S++",
    model: "M30S-112T",
    hashRate: 112,
    powerConsumption: 3472,
    coin: "BTC",
    pool: "Antpool",
    status: "online",
    dailyRevenue: 9.14, // USDT per day
    pricePerDay: 4.78, // USDT per day
    efficiency: 32.26,
    description: "MicroBT Whatsminer - 112 TH/s",
  },
  {
    id: "miner_10",
    name: "Goldshell KD6",
    model: "KD6-26.3G",
    hashRate: 26300,
    powerConsumption: 2680,
    coin: "KDA",
    pool: "Kadena Pool",
    status: "online",
    dailyRevenue: 9.18, // USDT per day
    pricePerDay: 4.97, // USDT per day
    efficiency: 17.91,
    description: "Minerador Kadena Blake2S - 26.3 GH/s",
  },
];

// Check if database is available
async function isDatabaseAvailable() {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Add BRL equivalent to miners
async function addBrlEquivalent(miners: typeof FALLBACK_MINERS) {
  const usdtRate = await getUSDTBRLPrice();
  
  return miners.map(miner => ({
    ...miner,
    dailyRevenueBrl: miner.dailyRevenue * usdtRate,
    pricePerDayBrl: miner.pricePerDay * usdtRate,
    usdtRate,
  }));
}

// Get all miners
export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    const dbAvailable = await isDatabaseAvailable();
    
    let miners;
    let source;
    
    if (dbAvailable) {
      const dbMiners = await db.miner.findMany({
        orderBy: {
          hashRate: "desc",
        },
      });
      
      if (dbMiners.length > 0) {
        miners = dbMiners;
        source = "database";
      } else {
        miners = FALLBACK_MINERS;
        source = "fallback";
      }
    } else {
      // Return fallback data
      console.log("Database not available, using fallback data");
      miners = FALLBACK_MINERS;
      source = "fallback";
    }
    
    // Add BRL equivalents to all miners
    const minersWithBrl = await addBrlEquivalent(miners);
    
    return NextResponse.json({ 
      miners: minersWithBrl,
      source,
      timestamp: new Date().toISOString(),
      note: source === "fallback" ? "Dados locais - conecte ao banco para dados em tempo real" : undefined,
    });
  } catch (error) {
    console.error("Get miners error:", error);
    
    // Return fallback data on any error
    const minersWithBrl = await addBrlEquivalent(FALLBACK_MINERS);
    
    return NextResponse.json({ 
      miners: minersWithBrl,
      source: "fallback",
      timestamp: new Date().toISOString(),
      note: "Usando dados de fallback devido a erro",
    });
  }
}

// Create new miner (admin only)
export async function POST(request: NextRequest) {
  try {
    const dbAvailable = await isDatabaseAvailable();
    
    if (!dbAvailable) {
      return NextResponse.json(
        { error: "Banco de dados não disponível", fallback: true },
        { status: 503 }
      );
    }

    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      model,
      hashRate,
      powerConsumption,
      coin,
      pool,
      dailyRevenue, // USDT
      pricePerDay, // USDT
      efficiency,
      description,
    } = body;

    if (!name || !model || !hashRate || !powerConsumption || !coin || !pool) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    const miner = await db.miner.create({
      data: {
        name,
        model,
        hashRate,
        powerConsumption,
        coin,
        pool,
        dailyRevenue: dailyRevenue || 0, // USDT
        pricePerDay: pricePerDay || 0, // USDT
        efficiency: efficiency || 0,
        description: description || null,
        status: "online",
      },
    });

    // Add BRL equivalent
    const usdtRate = await getUSDTBRLPrice();
    const minerWithBrl = {
      ...miner,
      dailyRevenueBrl: miner.dailyRevenue * usdtRate,
      pricePerDayBrl: miner.pricePerDay * usdtRate,
      usdtRate,
    };

    return NextResponse.json({ success: true, miner: minerWithBrl });
  } catch (error) {
    console.error("Create miner error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Update miner status (admin only)
export async function PUT(request: NextRequest) {
  try {
    const dbAvailable = await isDatabaseAvailable();
    
    if (!dbAvailable) {
      return NextResponse.json(
        { error: "Banco de dados não disponível", fallback: true },
        { status: 503 }
      );
    }

    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, dailyRevenue, pricePerDay } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da mineradora é obrigatório" },
        { status: 400 }
      );
    }

    const miner = await db.miner.update({
      where: { id },
      data: {
        status: status || undefined,
        dailyRevenue: dailyRevenue || undefined, // USDT
        pricePerDay: pricePerDay || undefined, // USDT
      },
    });

    // Add BRL equivalent
    const usdtRate = await getUSDTBRLPrice();
    const minerWithBrl = {
      ...miner,
      dailyRevenueBrl: miner.dailyRevenue * usdtRate,
      pricePerDayBrl: miner.pricePerDay * usdtRate,
      usdtRate,
    };

    return NextResponse.json({ success: true, miner: minerWithBrl });
  } catch (error) {
    console.error("Update miner error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

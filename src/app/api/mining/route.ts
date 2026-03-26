import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// Get mining stats
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Get user's active rentals
    const activeRentals = await db.miningRental.findMany({
      where: {
        userId,
        status: "active",
      },
      include: {
        miner: true,
      },
    });

    // Calculate total hashrate
    const totalHashrate = activeRentals.reduce((sum, rental) => {
      return sum + (rental.miner?.hashRate || 0);
    }, 0);

    // Get mining history for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const miningHistory = await db.miningHistory.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get current USDT rate
    const usdtRate = await getUSDTBRLPrice();

    // Calculate stats (all in USDT)
    const totalMined7dUsdt = miningHistory.reduce((sum, h) => sum + h.usdtValue, 0);
    const totalMined7dBrl = await convertUSDTtoBRL(totalMined7dUsdt);
    const avgHashrate = totalHashrate;
    const btcMined7d = miningHistory.reduce((sum, h) => sum + h.btcMined, 0);

    // Add BRL equivalents to mining history
    const miningHistoryWithBrl = miningHistory.map(h => ({
      ...h,
      brlValue: h.brlValue || (h.usdtValue * usdtRate),
    }));

    // Pool stats (simulated) - prices in USDT
    const poolStats = {
      hashrate: "12.5 EH/s",
      miners: 1247,
      blocks24h: 34,
      lastBlock: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      btcPriceUsdt: 105000, // USDT
      difficulty: 83.1,
    };

    return NextResponse.json({
      stats: {
        totalHashrate: avgHashrate,
        totalMined7dUsdt,
        totalMined7dBrl,
        btcMined7d,
        activeRentals: activeRentals.length,
      },
      poolStats,
      usdtRate,
      miningHistory: miningHistoryWithBrl.slice(0, 7),
    });
  } catch (error) {
    console.error("Get mining stats error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Simulate mining profit distribution (cron job would call this)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    // Simple API key check (in production, use proper authentication)
    if (apiKey !== process.env.MINING_API_KEY) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Get current USDT rate
    const usdtRate = await getUSDTBRLPrice();

    // Get all active rentals
    const activeRentals = await db.miningRental.findMany({
      where: {
        status: "active",
      },
      include: {
        miner: true,
        user: true,
      },
    });

    const results: {
      rentalId: string;
      userId: string;
      revenueUsdt: number;
      revenueBrl: number;
      btcMined: number;
    }[] = [];

    for (const rental of activeRentals) {
      // Check if rental has expired
      if (new Date() > new Date(rental.endDate)) {
        await db.miningRental.update({
          where: { id: rental.id },
          data: { status: "completed" },
        });
        continue;
      }

      // Simulate daily mining (all in USDT)
      const baseRevenueUsdt = rental.dailyReturn;
      const variance = baseRevenueUsdt * 0.1; // 10% variance
      const dailyRevenueUsdt = baseRevenueUsdt + (Math.random() - 0.5) * variance;
      const dailyRevenueBrl = dailyRevenueUsdt * usdtRate;

      // BTC calculation (simplified)
      const btcPriceUsdt = 105000; // Would fetch real price
      const btcMined = dailyRevenueUsdt / btcPriceUsdt;

      // Create mining history entry
      const history = await db.miningHistory.create({
        data: {
          userId: rental.userId,
          rentalId: rental.id,
          minerId: rental.minerId,
          date: new Date(),
          hashRate: rental.miner?.hashRate || 0,
          btcMined,
          usdtValue: dailyRevenueUsdt, // Primary: USDT
          brlValue: dailyRevenueBrl, // For reference
          pool: rental.miner?.pool || "Unknown",
          sharesValid: Math.floor(Math.random() * 1000) + 500,
          sharesInvalid: Math.floor(Math.random() * 10),
        },
      });

      // Update user balance in USDT
      await db.user.update({
        where: { id: rental.userId },
        data: {
          balance: {
            increment: dailyRevenueUsdt, // USDT
          },
          totalMined: {
            increment: dailyRevenueUsdt, // USDT
          },
        },
      });

      // Create transaction
      await db.transaction.create({
        data: {
          userId: rental.userId,
          type: "mining_profit",
          amount: dailyRevenueUsdt, // USDT
          brlAmount: dailyRevenueBrl,
          usdtRate,
          status: "completed",
          description: `Lucro de mineração - ${rental.miner?.name}`,
          referenceId: rental.id,
        },
      });

      results.push({
        rentalId: rental.id,
        userId: rental.userId,
        revenueUsdt: dailyRevenueUsdt,
        revenueBrl: dailyRevenueBrl,
        btcMined,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      usdtRate,
      results,
    });
  } catch (error) {
    console.error("Mining distribution error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// Get user rentals
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const rentals = await db.miningRental.findMany({
      where: { userId },
      include: {
        miner: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add BRL equivalents to rentals
    const usdtRate = await getUSDTBRLPrice();
    const rentalsWithBrl = rentals.map(rental => ({
      ...rental,
      amountBrl: rental.amount * usdtRate,
      dailyReturnBrl: rental.dailyReturn * usdtRate,
      totalReturnBrl: rental.totalReturn * usdtRate,
      brlEquivalent: rental.brlEquivalent || rental.amount * usdtRate,
      usdtRate,
    }));

    return NextResponse.json({ rentals: rentalsWithBrl, usdtRate });
  } catch (error) {
    console.error("Get rentals error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Create new rental
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { minerId, days } = body;

    if (!minerId || !days || days <= 0) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Get miner
    const miner = await db.miner.findUnique({
      where: { id: minerId },
    });

    if (!miner) {
      return NextResponse.json(
        { error: "Mineradora não encontrada" },
        { status: 404 }
      );
    }

    if (miner.status !== "online") {
      return NextResponse.json(
        { error: "Esta mineradora está indisponível no momento" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Calculate costs in USDT (primary)
    const totalCostUsdt = miner.pricePerDay * days;
    const dailyReturnUsdt = miner.dailyRevenue * 0.7; // 70% for user
    const totalReturnUsdt = dailyReturnUsdt * days;

    // Get BRL equivalent at time of purchase
    const usdtRate = await getUSDTBRLPrice();
    const brlEquivalent = await convertUSDTtoBRL(totalCostUsdt);

    // Check balance (USDT)
    if (user.balance < totalCostUsdt) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Necessário: $${totalCostUsdt.toFixed(2)} USDT (≈ R$ ${brlEquivalent.toFixed(2)}), Disponível: $${user.balance.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Create rental
    const rental = await db.miningRental.create({
      data: {
        userId,
        minerId,
        startDate: new Date(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        amount: totalCostUsdt, // USDT
        brlEquivalent, // BRL at time of purchase
        hashShare: 100,
        status: "active",
        dailyReturn: dailyReturnUsdt, // USDT
        totalReturn: totalReturnUsdt, // USDT
      },
    });

    // Deduct from user balance (USDT)
    await db.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: totalCostUsdt,
        },
        totalInvested: {
          increment: totalCostUsdt,
        },
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId,
        type: "rental_payment",
        amount: totalCostUsdt, // USDT
        brlAmount: brlEquivalent,
        usdtRate,
        status: "completed",
        description: `Aluguel ${miner.name} - ${days} dias`,
        referenceId: rental.id,
      },
    });

    return NextResponse.json({
      success: true,
      rental: {
        ...rental,
        dailyReturnBrl: dailyReturnUsdt * usdtRate,
        totalReturnBrl: totalReturnUsdt * usdtRate,
      },
      usdtRate,
      message: `Mineradora alugada com sucesso! Retorno estimado: $${totalReturnUsdt.toFixed(2)} USDT (≈ R$ ${(totalReturnUsdt * usdtRate).toFixed(2)})`,
    });
  } catch (error) {
    console.error("Create rental error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

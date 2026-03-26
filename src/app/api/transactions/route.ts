import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: { userId: string; type?: string } = { userId };

    if (type) {
      where.type = type;
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await db.transaction.count({ where });

    // Get current USDT rate and add BRL equivalents
    const usdtRate = await getUSDTBRLPrice();
    const transactionsWithBrl = transactions.map(tx => {
      // Use stored brlAmount if available (for PIX), otherwise calculate
      const brlAmount = tx.brlAmount || (tx.amount * usdtRate);
      
      return {
        ...tx,
        brlAmount,
        usdtRate: tx.usdtRate || usdtRate,
      };
    });

    return NextResponse.json({
      transactions: transactionsWithBrl,
      usdtRate,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

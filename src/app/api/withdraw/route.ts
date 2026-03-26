import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { convertUSDTtoBRL, getUSDTBRLPrice } from "@/lib/usdt-price";

// Minimum withdrawal amounts
const MIN_WITHDRAWALS = {
  pixUsdt: 10, // Minimum USDT for PIX withdrawal
  usdt: 10, // Minimum USDT for crypto withdrawal
};

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
    const { amount, method, destination } = body;

    // All amounts are in USDT
    const usdtAmount = parseFloat(amount);

    if (!usdtAmount || usdtAmount <= 0) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }

    if (!method || !["pix", "usdt_trc20", "usdt_polygon"].includes(method)) {
      return NextResponse.json(
        { error: "Método de saque inválido" },
        { status: 400 }
      );
    }

    if (!destination) {
      return NextResponse.json(
        { error: "Destino do saque é obrigatório" },
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

    // Check balance (all in USDT)
    if (usdtAmount > user.balance) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Saldo disponível: $${user.balance.toFixed(2)} USDT` },
        { status: 400 }
      );
    }

    // Validate minimum amounts
    if (method === "pix" && usdtAmount < MIN_WITHDRAWALS.pixUsdt) {
      return NextResponse.json(
        { error: `Saque mínimo via PIX: $${MIN_WITHDRAWALS.pixUsdt} USDT` },
        { status: 400 }
      );
    }

    if ((method === "usdt_trc20" || method === "usdt_polygon") && usdtAmount < MIN_WITHDRAWALS.usdt) {
      return NextResponse.json(
        { error: `Saque mínimo via USDT: $${MIN_WITHDRAWALS.usdt}` },
        { status: 400 }
      );
    }

    // Get current USDT/BRL rate
    const usdtRate = await getUSDTBRLPrice();
    let brlAmount: number | null = null;

    // For PIX, calculate BRL equivalent
    if (method === "pix") {
      brlAmount = await convertUSDTtoBRL(usdtAmount);
    }

    // Create investment record for withdrawal
    const investment = await db.investment.create({
      data: {
        userId,
        amount: usdtAmount, // Primary: USDT
        brlAmount: brlAmount,
        usdtRate: usdtRate,
        type: "withdrawal",
        method,
        status: "pending",
        description: `Saque via ${method === "pix" ? "PIX" : `USDT (${method === "usdt_trc20" ? "TRC20" : "Polygon"})`}`,
      },
    });

    // Deduct from user balance (USDT)
    await db.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: usdtAmount,
        },
      },
    });

    // Create transaction record
    await db.transaction.create({
      data: {
        userId,
        type: "withdrawal",
        amount: usdtAmount, // Primary: USDT
        brlAmount: brlAmount,
        usdtRate: usdtRate,
        status: "pending",
        description: `Saque via ${method === "pix" ? "PIX" : `USDT (${method === "usdt_trc20" ? "TRC20" : "Polygon"})`} - Processando`,
        referenceId: investment.id,
      },
    });

    // Return response with conversion info
    const response: Record<string, unknown> = {
      success: true,
      investment: {
        id: investment.id,
        usdtAmount,
        brlAmount,
        usdtRate,
        method,
        status: "pending",
      },
      message: "Solicitação de saque registrada. Processamento em até 24 horas.",
    };

    if (method === "pix") {
      response.conversion = {
        usdtAmount,
        brlAmount,
        rate: usdtRate,
        message: `$${usdtAmount.toFixed(2)} USDT será enviado como R$ ${brlAmount?.toFixed(2)} via PIX`,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Withdraw error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

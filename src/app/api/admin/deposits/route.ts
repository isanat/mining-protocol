import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// Get all deposits (with filters)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || userRole !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build filter
    const where: Record<string, unknown> = { type: "deposit" };
    if (status && status !== "all") {
      where.status = status;
    }
    if (method && method !== "all") {
      where.method = method;
    }

    // Get deposits with user info
    const deposits = await db.investment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await db.investment.count({ where });

    // Get current USDT rate
    const usdtRate = await getUSDTBRLPrice();

    // Add BRL equivalents to deposits
    const depositsWithBrl = deposits.map(deposit => ({
      ...deposit,
      amountBrl: deposit.brlAmount || (deposit.amount * (deposit.usdtRate || usdtRate)),
      currentRate: usdtRate,
    }));

    // Get stats
    const stats = {
      pending: await db.investment.count({ where: { type: "deposit", status: "pending" } }),
      confirmed: await db.investment.count({ where: { type: "deposit", status: "confirmed" } }),
      cancelled: await db.investment.count({ where: { type: "deposit", status: "cancelled" } }),
      totalAmount: await db.investment.aggregate({
        where: { type: "deposit", status: "confirmed" },
        _sum: { amount: true },
      }),
    };

    return NextResponse.json({
      deposits: depositsWithBrl,
      usdtRate,
      total,
      stats: {
        ...stats,
        totalAmountUsdt: stats.totalAmount._sum.amount || 0,
        totalAmountBrl: await convertUSDTtoBRL(stats.totalAmount._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error("Get deposits error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Approve or reject deposit
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || userRole !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { depositId, action, adminNotes } = body;

    if (!depositId || !action) {
      return NextResponse.json(
        { error: "ID do depósito e ação são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida" },
        { status: 400 }
      );
    }

    const deposit = await db.investment.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json(
        { error: "Depósito não encontrado" },
        { status: 404 }
      );
    }

    if (deposit.status !== "pending") {
      return NextResponse.json(
        { error: "Este depósito já foi processado" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "confirmed" : "cancelled";
    const usdtRate = await getUSDTBRLPrice();

    // Update investment status
    await db.investment.update({
      where: { id: depositId },
      data: {
        status: newStatus,
        adminNotes,
        processedBy: userId,
        processedAt: new Date(),
        usdtRate: deposit.usdtRate || usdtRate,
      },
    });

    // If approved, update user balance in USDT
    if (action === "approve") {
      await db.user.update({
        where: { id: deposit.userId },
        data: {
          balance: {
            increment: deposit.amount, // USDT
          },
          // Mark as having invested
          hasInvested: true,
          // Unlock affiliate link if first investment
          linkUnlocked: true,
        },
      });

      // Update transaction status
      await db.transaction.updateMany({
        where: { referenceId: depositId },
        data: {
          status: "completed",
          description: `Depósito via ${deposit.method.toUpperCase()}${deposit.network ? ` (${deposit.network})` : ""} - Confirmado`,
        },
      });
    } else {
      // Update transaction status for rejection
      await db.transaction.updateMany({
        where: { referenceId: depositId },
        data: {
          status: "failed",
          description: `Depósito via ${deposit.method.toUpperCase()} - Rejeitado`,
        },
      });
    }

    // Create admin log
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: action === "approve" ? "approve" : "reject",
        entity: "deposit",
        entityId: depositId,
        oldValue: JSON.stringify({ status: "pending" }),
        newValue: JSON.stringify({ status: newStatus, adminNotes }),
        description: `Depósito de ${deposit.user.name} (${deposit.user.email}) ${action === "approve" ? "aprovado" : "rejeitado"} - $${deposit.amount.toFixed(2)} USDT`,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === "approve" 
        ? `Depósito aprovado! $${deposit.amount.toFixed(2)} USDT creditado.` 
        : "Depósito rejeitado",
      deposit: {
        ...deposit,
        amountBrl: deposit.brlAmount || (deposit.amount * usdtRate),
      },
    });
  } catch (error) {
    console.error("Process deposit error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Verify transaction hash on blockchain (basic validation)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || userRole !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { depositId } = body;

    if (!depositId) {
      return NextResponse.json(
        { error: "ID do depósito é obrigatório" },
        { status: 400 }
      );
    }

    const deposit = await db.investment.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      return NextResponse.json(
        { error: "Depósito não encontrado" },
        { status: 404 }
      );
    }

    if (!deposit.txHash) {
      return NextResponse.json(
        { error: "Este depósito não possui hash de transação" },
        { status: 400 }
      );
    }

    // Generate blockchain explorer URLs
    let explorerUrl = "";
    if (deposit.network === "TRC20") {
      explorerUrl = `https://tronscan.org/#/transaction/${deposit.txHash}`;
    } else if (deposit.network === "Polygon") {
      explorerUrl = `https://polygonscan.com/tx/${deposit.txHash}`;
    }

    const usdtRate = await getUSDTBRLPrice();

    // In production, you would:
    // 1. Call the blockchain API to verify the transaction
    // 2. Check if the transaction exists
    // 3. Verify the amount matches
    // 4. Verify the destination address matches

    // For now, return the explorer URL for manual verification
    return NextResponse.json({
      success: true,
      txHash: deposit.txHash,
      network: deposit.network,
      explorerUrl,
      usdtAmount: deposit.amount,
      brlAmount: deposit.brlAmount || (deposit.amount * usdtRate),
      usdtRate: deposit.usdtRate || usdtRate,
      message: "Verifique a transação no explorador de blocos",
    });
  } catch (error) {
    console.error("Verify deposit error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

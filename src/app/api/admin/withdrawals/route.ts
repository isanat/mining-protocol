import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// GET - Listar saques pendentes
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status !== "all") {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      db.affiliateWithdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              pixKey: true,
              walletAddress: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      db.affiliateWithdrawal.count({ where })
    ]);

    // Get current USDT rate
    const usdtRate = await getUSDTBRLPrice();

    // Add BRL equivalents to withdrawals
    const withdrawalsWithBrl = withdrawals.map(w => ({
      ...w,
      amountBrl: w.brlAmount || (w.amount * (w.usdtRate || usdtRate)),
      netAmountBrl: w.netAmount * (w.usdtRate || usdtRate),
      currentRate: usdtRate,
    }));

    // Calcular totais por status (USDT)
    const totals = await db.affiliateWithdrawal.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true
    });

    return NextResponse.json({
      success: true,
      withdrawals: withdrawalsWithBrl,
      usdtRate,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      totals
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Aprovar ou rejeitar saque
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { id: userId }
    });

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawalId, action, adminNotes, txHash } = body;

    if (!withdrawalId || !action || !["approve", "reject", "process"].includes(action)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const withdrawal = await db.affiliateWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true }
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Saque não encontrado" }, { status: 404 });
    }

    if (withdrawal.status !== "pending" && action !== "reject") {
      return NextResponse.json({ error: "Este saque já foi processado" }, { status: 400 });
    }

    const usdtRate = await getUSDTBRLPrice();

    let newStatus: string;
    let updateData: Record<string, unknown> = {
      processedBy: userId,
      processedAt: new Date(),
      adminNotes,
      usdtRate: withdrawal.usdtRate || usdtRate,
    };

    switch (action) {
      case "approve":
        newStatus = "approved";
        updateData.status = newStatus;
        break;
      case "reject":
        newStatus = "rejected";
        updateData.status = newStatus;
        // Devolver saldo ao usuário (USDT)
        await db.user.update({
          where: { id: withdrawal.userId },
          data: {
            affiliateBalance: {
              increment: withdrawal.amount // USDT
            }
          }
        });
        break;
      case "process":
        newStatus = "completed";
        updateData.status = newStatus;
        // txHash será usado para referência futura
        break;
    }

    const updatedWithdrawal = await db.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: updateData
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: action === "approve" ? "approve" : action === "reject" ? "reject" : "process",
        entity: "withdrawal",
        entityId: withdrawalId,
        oldValue: JSON.stringify(withdrawal),
        newValue: JSON.stringify(updatedWithdrawal),
        description: `Saque ${action === "approve" ? "aprovado" : action === "reject" ? "rejeitado" : "processado"}: $${withdrawal.amount.toFixed(2)} USDT para ${withdrawal.user.email}`
      }
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        ...updatedWithdrawal,
        amountBrl: withdrawal.brlAmount || (withdrawal.amount * usdtRate),
      },
      message: `Saque ${action === "approve" ? "aprovado" : action === "reject" ? "rejeitado" : "processado"} com sucesso`
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Marcar como processado (pós-pagamento)
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { id: userId }
    });

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawalId, txHash, adminNotes } = body;

    const withdrawal = await db.affiliateWithdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Saque não encontrado" }, { status: 404 });
    }

    if (withdrawal.status !== "approved") {
      return NextResponse.json({ error: "Saque precisa estar aprovado primeiro" }, { status: 400 });
    }

    const usdtRate = await getUSDTBRLPrice();

    const updatedWithdrawal = await db.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "completed",
        processedBy: userId,
        processedAt: new Date(),
        adminNotes
      }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "complete",
        entity: "withdrawal",
        entityId: withdrawalId,
        description: `Saque completado: $${withdrawal.amount.toFixed(2)} USDT`
      }
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        ...updatedWithdrawal,
        amountBrl: withdrawal.brlAmount || (withdrawal.amount * usdtRate),
      }
    });
  } catch (error) {
    console.error("Error completing withdrawal:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

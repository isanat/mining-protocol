import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST - Solicitar saque de comissões
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method, pixKey, walletAddress } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    if (!method || !["pix", "usdt_trc20", "usdt_erc20"].includes(method)) {
      return NextResponse.json({ error: "Método de saque inválido" }, { status: 400 });
    }

    if (method === "pix" && !pixKey) {
      return NextResponse.json({ error: "Chave PIX é obrigatória" }, { status: 400 });
    }

    if ((method === "usdt_trc20" || method === "usdt_erc20") && !walletAddress) {
      return NextResponse.json({ error: "Endereço da carteira é obrigatório" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Buscar configurações
    const withdrawalFeeConfig = await db.systemConfig.findUnique({
      where: { key: "affiliate_withdrawal_fee" }
    });
    const minWithdrawalConfig = await db.systemConfig.findUnique({
      where: { key: "affiliate_min_withdrawal" }
    });

    const withdrawalFee = withdrawalFeeConfig ? parseFloat(withdrawalFeeConfig.value) : 5; // 5% padrão
    const minWithdrawal = minWithdrawalConfig ? parseFloat(minWithdrawalConfig.value) : 50; // R$ 50 mínimo

    // Verificar valor mínimo
    if (amount < minWithdrawal) {
      return NextResponse.json({ 
        error: `Valor mínimo para saque é R$ ${minWithdrawal.toFixed(2)}` 
      }, { status: 400 });
    }

    // Verificar saldo
    if (user.affiliateBalance < amount) {
      return NextResponse.json({ 
        error: "Saldo insuficiente",
        available: user.affiliateBalance 
      }, { status: 400 });
    }

    // Calcular taxa e valor líquido
    const fee = (amount * withdrawalFee) / 100;
    const netAmount = amount - fee;

    // Criar solicitação de saque
    const withdrawal = await db.affiliateWithdrawal.create({
      data: {
        userId,
        amount,
        fee,
        netAmount,
        method,
        address: walletAddress || null,
        pixKey: pixKey || null,
        status: "pending"
      }
    });

    // Debitar do saldo de afiliado
    await db.user.update({
      where: { id: userId },
      data: {
        affiliateBalance: {
          decrement: amount
        }
      }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "create",
        entity: "affiliate_withdrawal",
        entityId: withdrawal.id,
        newValue: JSON.stringify(withdrawal),
        description: `Solicitação de saque de comissão: R$ ${amount.toFixed(2)}`
      }
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount,
        fee,
        netAmount,
        method,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      },
      message: "Solicitação de saque criada com sucesso!"
    });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// GET - Listar saques do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const withdrawals = await db.affiliateWithdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

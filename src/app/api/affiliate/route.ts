import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// GET - Buscar informações de afiliado do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        affiliateBalance: true,
        totalAffiliateEarnings: true,
        linkUnlocked: true,
        hasInvested: true,
        referredBy: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Buscar configurações de níveis
    const levels = await db.affiliateLevel.findMany({
      where: { isActive: true },
      orderBy: { level: "asc" }
    });

    // Buscar indicações diretas (nível 1)
    const directReferrals = await db.user.findMany({
      where: { referredBy: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        hasInvested: true,
        totalInvested: true,
      },
      orderBy: { createdAt: "desc" }
    });

    // Buscar comissões
    const commissions = await db.affiliateCommission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Calcular estatísticas por nível
    const statsByLevel = await db.affiliateCommission.groupBy({
      by: ["level"],
      where: { userId, status: "paid" },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // Contar total de indicações em todos os níveis
    const totalReferralsByLevel: Record<number, number> = {};
    
    // Função recursiva para contar indicações por nível
    const countReferralsByLevel = async (parentId: string, level: number, counts: Record<number, number>): Promise<void> => {
      if (level > 5) return;
      
      const refs = await db.user.findMany({
        where: { referredBy: parentId },
        select: { id: true }
      });
      
      counts[level] = (counts[level] || 0) + refs.length;
      
      for (const ref of refs) {
        await countReferralsByLevel(ref.id, level + 1, counts);
      }
    };
    
    await countReferralsByLevel(userId, 1, totalReferralsByLevel);

    // Buscar saques
    const withdrawals = await db.affiliateWithdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Buscar configurações de taxa de saque
    const withdrawalFeeConfig = await db.systemConfig.findUnique({
      where: { key: "affiliate_withdrawal_fee" }
    });
    const minWithdrawalConfig = await db.systemConfig.findUnique({
      where: { key: "affiliate_min_withdrawal" }
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        affiliateLink: user.affiliateCode 
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://mining-protocol.com"}/register?ref=${user.affiliateCode}`
          : null,
      },
      levels,
      directReferrals,
      commissions,
      statsByLevel,
      totalReferralsByLevel,
      withdrawals,
      config: {
        withdrawalFee: withdrawalFeeConfig ? parseFloat(withdrawalFeeConfig.value) : 5, // 5% padrão
        minWithdrawal: minWithdrawalConfig ? parseFloat(minWithdrawalConfig.value) : 50, // R$ 50 mínimo
      }
    });
  } catch (error) {
    console.error("Error fetching affiliate data:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Gerar código de afiliado (somente após primeiro investimento)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Verificar se já tem código
    if (user.affiliateCode) {
      return NextResponse.json({ 
        success: true, 
        code: user.affiliateCode,
        link: `${process.env.NEXT_PUBLIC_APP_URL || "https://mining-protocol.com"}/register?ref=${user.affiliateCode}`
      });
    }

    // Verificar se já fez primeiro investimento
    if (!user.hasInvested) {
      return NextResponse.json({ 
        error: "Você precisa fazer seu primeiro investimento para desbloquear o link de afiliado",
        needsInvestment: true 
      }, { status: 400 });
    }

    // Gerar código único
    let code = nanoid(8).toUpperCase();
    let exists = true;
    
    while (exists) {
      const existing = await db.user.findUnique({
        where: { affiliateCode: code }
      });
      if (!existing) {
        exists = false;
      } else {
        code = nanoid(8).toUpperCase();
      }
    }

    // Atualizar usuário
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        affiliateCode: code,
        linkUnlocked: true
      }
    });

    return NextResponse.json({
      success: true,
      code,
      link: `${process.env.NEXT_PUBLIC_APP_URL || "https://mining-protocol.com"}/register?ref=${code}`
    });
  } catch (error) {
    console.error("Error generating affiliate code:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

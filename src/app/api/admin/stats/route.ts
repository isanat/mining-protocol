import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// GET - Estatísticas gerais do sistema (tudo em USDT)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se é admin
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Get current USDT/BRL rate
    const usdtRate = await getUSDTBRLPrice();

    // Total de usuários
    const totalUsers = await db.user.count();
    
    // Usuários ativos (que investiram)
    const activeUsers = await db.user.count({
      where: { hasInvested: true }
    });

    // Total investido em USDT
    const totalInvestedResult = await db.user.aggregate({
      _sum: { totalInvested: true }
    });
    const totalInvestedUsdt = totalInvestedResult._sum.totalInvested || 0;
    const totalInvestedBrl = await convertUSDTtoBRL(totalInvestedUsdt);

    // Total em saldo de usuários (USDT)
    const totalBalanceResult = await db.user.aggregate({
      _sum: { balance: true }
    });
    const totalBalanceUsdt = totalBalanceResult._sum.balance || 0;
    const totalBalanceBrl = await convertUSDTtoBRL(totalBalanceUsdt);

    // Total de afiliados ativos
    const totalAffiliates = await db.user.count({
      where: { affiliateCode: { not: null } }
    });

    // Total de comissões pagas (USDT)
    const totalCommissionsResult = await db.affiliateCommission.aggregate({
      where: { status: "paid" },
      _sum: { commissionAmount: true }
    });
    const totalCommissionsPaidUsdt = totalCommissionsResult._sum.commissionAmount || 0;
    const totalCommissionsPaidBrl = await convertUSDTtoBRL(totalCommissionsPaidUsdt);

    // Total de comissões pendentes (USDT)
    const totalCommissionsPendingResult = await db.affiliateCommission.aggregate({
      where: { status: "pending" },
      _sum: { commissionAmount: true }
    });
    const totalCommissionsPendingUsdt = totalCommissionsPendingResult._sum.commissionAmount || 0;
    const totalCommissionsPendingBrl = await convertUSDTtoBRL(totalCommissionsPendingUsdt);

    // Saldo total de afiliados (USDT)
    const totalAffiliateBalanceResult = await db.user.aggregate({
      _sum: { affiliateBalance: true }
    });
    const totalAffiliateBalanceUsdt = totalAffiliateBalanceResult._sum.affiliateBalance || 0;
    const totalAffiliateBalanceBrl = await convertUSDTtoBRL(totalAffiliateBalanceUsdt);

    // Saques pendentes
    const pendingWithdrawals = await db.affiliateWithdrawal.count({
      where: { status: "pending" }
    });

    // Valor de saques pendentes (USDT)
    const pendingWithdrawalsAmountResult = await db.affiliateWithdrawal.aggregate({
      where: { status: "pending" },
      _sum: { amount: true }
    });
    const pendingWithdrawalsAmountUsdt = pendingWithdrawalsAmountResult._sum.amount || 0;
    const pendingWithdrawalsAmountBrl = await convertUSDTtoBRL(pendingWithdrawalsAmountUsdt);

    // Total de mineradoras
    const totalMiners = await db.miner.count();
    const onlineMiners = await db.miner.count({
      where: { status: "online" }
    });

    // Aluguéis ativos
    const activeRentals = await db.miningRental.count({
      where: { status: "active" }
    });

    // Usuários novos hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await db.user.count({
      where: { createdAt: { gte: today } }
    });

    // Investimentos hoje (USDT)
    const investmentsToday = await db.investment.aggregate({
      where: { 
        createdAt: { gte: today },
        status: "confirmed"
      },
      _sum: { amount: true }
    });
    const investedTodayUsdt = investmentsToday._sum.amount || 0;
    const investedTodayBrl = await convertUSDTtoBRL(investedTodayUsdt);

    // Depósitos pendentes
    const pendingDeposits = await db.investment.count({
      where: { status: "pending", type: "deposit" }
    });

    return NextResponse.json({
      success: true,
      usdtRate,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          withAffiliateLink: totalAffiliates
        },
        financial: {
          // All amounts in USDT (primary)
          totalInvestedUsdt,
          totalInvestedBrl,
          totalBalanceUsdt,
          totalBalanceBrl,
          totalCommissionsPaidUsdt,
          totalCommissionsPaidBrl,
          totalCommissionsPendingUsdt,
          totalCommissionsPendingBrl,
          totalAffiliateBalanceUsdt,
          totalAffiliateBalanceBrl
        },
        withdrawals: {
          pending: pendingWithdrawals,
          pendingAmountUsdt: pendingWithdrawalsAmountUsdt,
          pendingAmountBrl: pendingWithdrawalsAmountBrl
        },
        mining: {
          totalMiners,
          onlineMiners,
          activeRentals
        },
        deposits: {
          pending: pendingDeposits,
          investedTodayUsdt,
          investedTodayBrl
        }
      }
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

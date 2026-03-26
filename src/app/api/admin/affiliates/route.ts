import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Listar afiliados e sua árvore
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Buscar usuários com código de afiliado
    const where: any = {
      affiliateCode: { not: null }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { affiliateCode: { contains: search, mode: "insensitive" } }
      ];
    }

    const [affiliates, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          affiliateCode: true,
          affiliateBalance: true,
          totalAffiliateEarnings: true,
          hasInvested: true,
          linkUnlocked: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      db.user.count({ where })
    ]);

    // Para cada afiliado, buscar estatísticas
    const affiliatesWithStats = await Promise.all(
      affiliates.map(async (affiliate) => {
        // Contar indicações por nível
        const countReferrals = async (parentId: string, level: number): Promise<number> => {
          if (level > 5) return 0;
          
          const refs = await db.user.findMany({
            where: { referredBy: parentId },
            select: { id: true }
          });
          
          let count = refs.length;
          for (const ref of refs) {
            count += await countReferrals(ref.id, level + 1);
          }
          return count;
        };

        // Contar indicações diretas (nível 1)
        const directReferrals = await db.user.count({
          where: { referredBy: affiliate.id }
        });

        // Total de indicações em todos os níveis
        const totalReferrals = await countReferrals(affiliate.id, 1);

        // Comissões totais
        const commissions = await db.affiliateCommission.aggregate({
          where: { userId: affiliate.id },
          _sum: { commissionAmount: true }
        });

        // Comissões pagas
        const paidCommissions = await db.affiliateCommission.aggregate({
          where: { userId: affiliate.id, status: "paid" },
          _sum: { commissionAmount: true }
        });

        // Saques
        const withdrawals = await db.affiliateWithdrawal.aggregate({
          where: { userId: affiliate.id, status: "completed" },
          _sum: { amount: true }
        });

        return {
          ...affiliate,
          stats: {
            directReferrals,
            totalReferrals,
            totalCommissions: commissions._sum.commissionAmount || 0,
            paidCommissions: paidCommissions._sum.commissionAmount || 0,
            totalWithdrawals: withdrawals._sum.amount || 0
          }
        };
      })
    );

    // Buscar configurações de níveis
    const levels = await db.affiliateLevel.findMany({
      where: { isActive: true },
      orderBy: { level: "asc" }
    });

    // Totais gerais
    const totals = await db.user.aggregate({
      where: { affiliateCode: { not: null } },
      _sum: {
        affiliateBalance: true,
        totalAffiliateEarnings: true
      }
    });

    return NextResponse.json({
      success: true,
      affiliates: affiliatesWithStats,
      levels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      totals
    });
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

import { db } from "@/lib/db";

// Configuração padrão de níveis de afiliado
const DEFAULT_LEVELS = [
  { level: 1, percentage: 10 },
  { level: 2, percentage: 5 },
  { level: 3, percentage: 3 },
  { level: 4, percentage: 2 },
  { level: 5, percentage: 1 }
];

interface ProcessCommissionParams {
  userId: string;           // Usuário que recebeu o rendimento
  rentalId: string;         // ID do aluguel
  miningHistoryId: string;  // ID do histórico de mineração
  earningsAmount: number;   // Valor do rendimento em BRL
}

/**
 * Processa comissões de afiliado em cascata (5 níveis)
 * Chamado quando um usuário recebe rendimento de mineração
 */
export async function processAffiliateCommissions({
  userId,
  rentalId,
  miningHistoryId,
  earningsAmount
}: ProcessCommissionParams): Promise<void> {
  try {
    // Buscar usuário que recebeu o rendimento
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referredBy: true, referralLevel: true }
    });

    if (!user || !user.referredBy) {
      // Usuário não tem indicador, não há comissões a processar
      return;
    }

    // Buscar configurações de níveis do banco
    let levels = await db.affiliateLevel.findMany({
      where: { isActive: true },
      orderBy: { level: "asc" }
    });

    // Se não houver configurações, usar padrão
    if (levels.length === 0) {
      levels = DEFAULT_LEVELS.map((l, i) => ({
        id: `default_${i}`,
        level: l.level,
        percentage: l.percentage,
        description: `Nível ${l.level}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    // Processar comissões em cascata (subir a árvore de indicações)
    let currentUserId: string | null = user.referredBy;
    let currentLevel = 1;

    while (currentUserId && currentLevel <= 5) {
      // Buscar o upline (quem indicou)
      const upline = await db.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, referredBy: true, hasInvested: true, affiliateCode: true }
      });

      if (!upline) break;

      // Verificar se o upline tem link desbloqueado (fez primeiro investimento)
      if (upline.hasInvested && upline.affiliateCode) {
        // Encontrar configuração do nível atual
        const levelConfig = levels.find(l => l.level === currentLevel);
        const percentage = levelConfig?.percentage || DEFAULT_LEVELS[currentLevel - 1]?.percentage || 0;

        if (percentage > 0) {
          const commissionAmount = (earningsAmount * percentage) / 100;

          // Criar comissão
          await db.affiliateCommission.create({
            data: {
              userId: upline.id,
              fromUserId: userId,
              level: currentLevel,
              rentalId,
              miningHistoryId,
              baseAmount: earningsAmount,
              percentage,
              commissionAmount,
              status: "paid" // Creditado automaticamente
            }
          });

          // Creditar no saldo de afiliado do upline
          await db.user.update({
            where: { id: upline.id },
            data: {
              affiliateBalance: { increment: commissionAmount },
              totalAffiliateEarnings: { increment: commissionAmount }
            }
          });
        }
      }

      // Subir para o próximo nível
      currentUserId = upline.referredBy;
      currentLevel++;
    }
  } catch (error) {
    console.error("Error processing affiliate commissions:", error);
    // Não propagar erro para não afetar o fluxo principal
  }
}

/**
 * Registra usuário com código de indicação
 */
export async function registerWithReferral(
  userId: string,
  referralCode: string
): Promise<boolean> {
  try {
    // Buscar quem indicou pelo código
    const referrer = await db.user.findFirst({
      where: { affiliateCode: referralCode }
    });

    if (!referrer) {
      return false;
    }

    // Calcular nível do novo usuário
    // Se o indicador é nível 1, o indicado é nível 2, etc.
    const referrerLevel = await getUserLevel(referrer.id);
    const newUserLevel = referrerLevel + 1;

    // Atualizar usuário com indicador
    await db.user.update({
      where: { id: userId },
      data: {
        referredBy: referrer.id,
        referralLevel: Math.min(newUserLevel, 6) // Máximo nível 6 (para além do 5º nível não ganha)
      }
    });

    return true;
  } catch (error) {
    console.error("Error registering with referral:", error);
    return false;
  }
}

/**
 * Calcula o nível de um usuário na hierarquia
 */
async function getUserLevel(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referredBy: true }
  });

  if (!user || !user.referredBy) {
    return 0; // Nível 0 = topo da hierarquia
  }

  const uplineLevel = await getUserLevel(user.referredBy);
  return uplineLevel + 1;
}

/**
 * Verifica e desbloqueia link de afiliado após primeiro investimento
 */
export async function unlockAffiliateLink(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    // Verificar se já desbloqueou
    if (user.linkUnlocked) return;

    // Verificar se já investiu
    const hasInvested = user.hasInvested || user.totalInvested > 0;

    if (hasInvested) {
      // Gerar código de afiliado se não tiver
      if (!user.affiliateCode) {
        const { nanoid } = await import("nanoid");
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

        await db.user.update({
          where: { id: userId },
          data: {
            affiliateCode: code,
            linkUnlocked: true,
            hasInvested: true
          }
        });
      } else {
        await db.user.update({
          where: { id: userId },
          data: { linkUnlocked: true, hasInvested: true }
        });
      }
    }
  } catch (error) {
    console.error("Error unlocking affiliate link:", error);
  }
}

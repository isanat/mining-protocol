import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Buscar todas as configurações
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

    // Buscar configurações do sistema
    const configs = await db.systemConfig.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }]
    });

    // Buscar níveis de afiliado
    const affiliateLevels = await db.affiliateLevel.findMany({
      orderBy: { level: "asc" }
    });

    // Configurações padrão se não existirem
    const defaultConfigs = {
      // Taxas
      affiliate_withdrawal_fee: "5", // 5%
      affiliate_min_withdrawal: "50", // R$ 50
      
      // Comissões por nível (serão migradas para AffiliateLevel)
      affiliate_level_1_percent: "10", // 10%
      affiliate_level_2_percent: "5",  // 5%
      affiliate_level_3_percent: "3",  // 3%
      affiliate_level_4_percent: "2",  // 2%
      affiliate_level_5_percent: "1",  // 1%
      
      // Mineradoras
      miner_profit_share: "70", // 70% para o usuário
      
      // Depósitos
      min_deposit: "100", // R$ 100
      
      // Saques
      withdrawal_fee_percent: "2", // 2%
      min_withdrawal: "50", // R$ 50
      withdrawal_processing_time: "24", // horas
      
      // Sistema
      maintenance_mode: "false",
      allow_registration: "true",
    };

    // Agrupar configurações por categoria
    const configByCategory: Record<string, Record<string, string>> = {};
    
    for (const config of configs) {
      if (!configByCategory[config.category]) {
        configByCategory[config.category] = {};
      }
      configByCategory[config.category][config.key] = config.value;
    }

    return NextResponse.json({
      success: true,
      configs: configByCategory,
      allConfigs: configs,
      affiliateLevels,
      defaults: defaultConfigs
    });
  } catch (error) {
    console.error("Error fetching configs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Atualizar configurações
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { configs, affiliateLevels } = body;

    // Atualizar configurações
    if (configs && Array.isArray(configs)) {
      for (const config of configs) {
        await db.systemConfig.upsert({
          where: { key: config.key },
          update: {
            value: config.value,
            type: config.type || "string",
            description: config.description,
            category: config.category || "general",
            isActive: config.isActive ?? true
          },
          create: {
            key: config.key,
            value: config.value,
            type: config.type || "string",
            description: config.description,
            category: config.category || "general",
            isActive: config.isActive ?? true
          }
        });
      }
    }

    // Atualizar níveis de afiliado
    if (affiliateLevels && Array.isArray(affiliateLevels)) {
      for (const level of affiliateLevels) {
        await db.affiliateLevel.upsert({
          where: { level: level.level },
          update: {
            percentage: level.percentage,
            description: level.description,
            isActive: level.isActive ?? true
          },
          create: {
            level: level.level,
            percentage: level.percentage,
            description: level.description,
            isActive: level.isActive ?? true
          }
        });
      }
    }

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "update",
        entity: "config",
        description: "Configurações do sistema atualizadas",
        newValue: JSON.stringify({ configs, affiliateLevels })
      }
    });

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso"
    });
  } catch (error) {
    console.error("Error updating configs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Inicializar configurações padrão
export async function PUT(request: NextRequest) {
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

    // Criar níveis de afiliado padrão
    const defaultLevels = [
      { level: 1, percentage: 10, description: "Indicação direta" },
      { level: 2, percentage: 5, description: "Indicação de 2º nível" },
      { level: 3, percentage: 3, description: "Indicação de 3º nível" },
      { level: 4, percentage: 2, description: "Indicação de 4º nível" },
      { level: 5, percentage: 1, description: "Indicação de 5º nível" }
    ];

    for (const level of defaultLevels) {
      await db.affiliateLevel.upsert({
        where: { level: level.level },
        update: level,
        create: level
      });
    }

    // Criar configurações padrão
    const defaultConfigs = [
      { key: "affiliate_withdrawal_fee", value: "5", type: "number", description: "Taxa de saque de comissões (%)", category: "affiliate" },
      { key: "affiliate_min_withdrawal", value: "50", type: "number", description: "Valor mínimo para saque de comissões (R$)", category: "affiliate" },
      { key: "miner_profit_share", value: "70", type: "number", description: "% do lucro da mineradora para o usuário", category: "mining" },
      { key: "min_deposit", value: "100", type: "number", description: "Valor mínimo de depósito (R$)", category: "deposit" },
      { key: "withdrawal_fee_percent", value: "2", type: "number", description: "Taxa de saque (%)", category: "withdrawal" },
      { key: "min_withdrawal", value: "50", type: "number", description: "Valor mínimo de saque (R$)", category: "withdrawal" },
      { key: "maintenance_mode", value: "false", type: "boolean", description: "Modo de manutenção", category: "system" },
      { key: "allow_registration", value: "true", type: "boolean", description: "Permitir novos registros", category: "system" },
    ];

    for (const config of defaultConfigs) {
      await db.systemConfig.upsert({
        where: { key: config.key },
        update: { ...config, isActive: true },
        create: { ...config, isActive: true }
      });
    }

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "create",
        entity: "config",
        description: "Configurações padrão inicializadas"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Configurações padrão inicializadas"
    });
  } catch (error) {
    console.error("Error initializing configs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

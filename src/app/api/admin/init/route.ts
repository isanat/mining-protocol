import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper to safely execute db operations
async function safeDbOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("DB operation failed:", error);
    return fallback;
  }
}

// GET - Check system status and setup
export async function GET() {
  try {
    // Try to count users - if this fails, database might not be set up
    const userCount = await safeDbOperation(() => db.user.count(), 0);
    const adminCount = await safeDbOperation(() => db.user.count({ where: { role: "admin" } }), 0);
    const minerCount = await safeDbOperation(() => db.miner.count(), 0);
    const configCount = await safeDbOperation(() => db.systemConfig.count(), 0);
    const levelCount = await safeDbOperation(() => db.affiliateLevel.count(), 0);
    const depositCount = await safeDbOperation(() => db.investment.count({ where: { type: "deposit" } }), 0);

    const isConfigured = adminCount > 0 && minerCount > 0 && configCount > 0 && levelCount > 0;

    return NextResponse.json({
      success: true,
      database: "connected",
      stats: {
        users: userCount,
        admins: adminCount,
        miners: minerCount,
        configs: configCount,
        affiliateLevels: levelCount,
        deposits: depositCount,
      },
      isConfigured,
      needsSetup: !isConfigured,
      adminCredentials: !isConfigured ? {
        email: "admin@miningprotocol.com",
        password: "admin123",
        note: "Call POST /api/admin/init to create admin and seed database"
      } : null
    });
  } catch (error) {
    console.error("Error checking setup:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Database connection failed",
      needsSetup: true
    }, { status: 500 });
  }
}

// POST - Initialize the system (create admin, seed data)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { force } = body;
    
    console.log("🚀 Starting system initialization...");

    // Check if already configured
    const adminCount = await db.user.count({ where: { role: "admin" } });
    if (adminCount > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: "System already configured",
        adminCount
      });
    }

    // 1. Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12);
    const admin = await db.user.upsert({
      where: { email: "admin@miningprotocol.com" },
      update: { password: adminPassword, role: "admin" },
      create: {
        email: "admin@miningprotocol.com",
        name: "Administrador",
        password: adminPassword,
        role: "admin",
        balance: 0,
        totalMined: 0,
        totalInvested: 0,
        affiliateCode: "ADMIN001",
        hasInvested: true,
        linkUnlocked: true,
      },
    });
    console.log("✅ Admin created:", admin.email);

    // 2. Create affiliate levels
    const levels = [
      { level: 1, percentage: 10, description: "Indicação direta" },
      { level: 2, percentage: 5, description: "Segundo nível" },
      { level: 3, percentage: 3, description: "Terceiro nível" },
      { level: 4, percentage: 2, description: "Quarto nível" },
      { level: 5, percentage: 1, description: "Quinto nível" },
    ];

    for (const level of levels) {
      await db.affiliateLevel.upsert({
        where: { level: level.level },
        update: level,
        create: level,
      });
    }
    console.log("✅ Affiliate levels created");

    // 3. Create system configs
    const configs = [
      { key: "maintenance_mode", value: "false", type: "boolean", category: "general", description: "Modo de manutenção" },
      { key: "allow_registration", value: "true", type: "boolean", category: "general", description: "Permitir novos registros" },
      { key: "min_deposit", value: "20", type: "number", category: "general", description: "Depósito mínimo em USDT" },
      { key: "min_withdrawal", value: "50", type: "number", category: "withdrawal", description: "Saque mínimo em USDT" },
      { key: "withdrawal_fee_percent", value: "2", type: "number", category: "withdrawal", description: "Taxa de saque (%)" },
      { key: "withdrawal_processing_time", value: "24", type: "number", category: "withdrawal", description: "Tempo de processamento (horas)" },
      { key: "affiliate_withdrawal_fee", value: "5", type: "number", category: "affiliate", description: "Taxa de saque de comissões (%)" },
      { key: "affiliate_min_withdrawal", value: "50", type: "number", category: "affiliate", description: "Saque mínimo de comissões (USDT)" },
      { key: "miner_profit_share", value: "70", type: "number", category: "mining", description: "Share do usuário (%)" },
    ];

    for (const config of configs) {
      await db.systemConfig.upsert({
        where: { key: config.key },
        update: config,
        create: config,
      });
    }
    console.log("✅ System configs created");

    // 4. Create miners
    const miners = [
      {
        name: "Antminer S19 Pro",
        model: "S19 Pro",
        hashRate: 110,
        powerConsumption: 3250,
        coin: "BTC",
        pool: "Binance Pool",
        dailyRevenue: 15.50,
        pricePerDay: 12.00,
        efficiency: 29.5,
        status: "online",
        description: "Mineradora ASIC de última geração para Bitcoin",
      },
      {
        name: "Whatsminer M30S++",
        model: "M30S++",
        hashRate: 112,
        powerConsumption: 3472,
        coin: "BTC",
        pool: "Binance Pool",
        dailyRevenue: 16.00,
        pricePerDay: 13.00,
        efficiency: 31.0,
        status: "online",
        description: "Alta eficiência energética para mineração de Bitcoin",
      },
      {
        name: "Antminer KS3",
        model: "KS3",
        hashRate: 9.4,
        powerConsumption: 3500,
        coin: "KAS",
        pool: "Kaspa Pool",
        dailyRevenue: 18.00,
        pricePerDay: 15.00,
        efficiency: 372.3,
        status: "online",
        description: "Mineradora especializada em Kaspa",
      },
      {
        name: "L7 Antminer",
        model: "L7",
        hashRate: 9.5,
        powerConsumption: 3425,
        coin: "LTC",
        pool: "Litecoin Pool",
        dailyRevenue: 14.00,
        pricePerDay: 11.00,
        efficiency: 360.5,
        status: "online",
        description: "Mineradora para Litecoin e Dogecoin",
      },
    ];

    for (const miner of miners) {
      await db.miner.upsert({
        where: { name: miner.name },
        update: miner,
        create: miner,
      });
    }
    console.log("✅ Miners created");

    return NextResponse.json({
      success: true,
      message: "System initialized successfully!",
      admin: {
        email: "admin@miningprotocol.com",
        password: "admin123"
      },
      stats: {
        adminCreated: true,
        affiliateLevels: levels.length,
        configs: configs.length,
        miners: miners.length
      }
    });
  } catch (error) {
    console.error("Error initializing system:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

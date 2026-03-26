import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // Criar níveis de afiliado
  console.log("📋 Criando níveis de afiliado...");
  const affiliateLevels = [
    { level: 1, percentage: 10, description: "Indicação direta - Nível 1" },
    { level: 2, percentage: 5, description: "Indicação de 2º nível" },
    { level: 3, percentage: 3, description: "Indicação de 3º nível" },
    { level: 4, percentage: 2, description: "Indicação de 4º nível" },
    { level: 5, percentage: 1, description: "Indicação de 5º nível" },
  ];

  for (const level of affiliateLevels) {
    await prisma.affiliateLevel.upsert({
      where: { level: level.level },
      update: level,
      create: level,
    });
  }
  console.log("✅ Níveis de afiliado criados\n");

  // Criar configurações do sistema
  console.log("⚙️ Criando configurações do sistema...");
  const systemConfigs = [
    // Afiliados
    { key: "affiliate_withdrawal_fee", value: "5", type: "number", description: "Taxa de saque de comissões de afiliado (%)", category: "affiliate" },
    { key: "affiliate_min_withdrawal", value: "50", type: "number", description: "Valor mínimo para saque de comissões (R$)", category: "affiliate" },
    { key: "affiliate_link_requires_investment", value: "true", type: "boolean", description: "Link de afiliado requer primeiro investimento", category: "affiliate" },
    
    // Depósitos
    { key: "min_deposit", value: "100", type: "number", description: "Valor mínimo de depósito (R$)", category: "deposit" },
    { key: "deposit_fee_percent", value: "0", type: "number", description: "Taxa de depósito (%)", category: "deposit" },
    
    // Saques
    { key: "withdrawal_fee_percent", value: "2", type: "number", description: "Taxa de saque (%)", category: "withdrawal" },
    { key: "min_withdrawal", value: "50", type: "number", description: "Valor mínimo de saque (R$)", category: "withdrawal" },
    { key: "withdrawal_processing_time", value: "24", type: "number", description: "Tempo de processamento de saque (horas)", category: "withdrawal" },
    
    // Mineradoras
    { key: "miner_profit_share", value: "70", type: "number", description: "% do lucro da mineradora para o usuário", category: "mining" },
    { key: "miner_lock_period_days", value: "7", type: "number", description: "Período mínimo de aluguel (dias)", category: "mining" },
    
    // Sistema
    { key: "maintenance_mode", value: "false", type: "boolean", description: "Modo de manutenção", category: "system" },
    { key: "allow_registration", value: "true", type: "boolean", description: "Permitir novos registros", category: "system" },
    { key: "platform_name", value: "Mining Protocol", type: "string", description: "Nome da plataforma", category: "system" },
    { key: "support_email", value: "suporte@miningprotocol.com", type: "string", description: "Email de suporte", category: "system" },
    { key: "pix_key", value: "mining@protocol.com", type: "string", description: "Chave PIX para depósitos", category: "payment" },
    { key: "usdt_address_trc20", value: "TRX123456789abcdefghijklmnopqrstuv", type: "string", description: "Endereço USDT TRC20", category: "payment" },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { ...config, isActive: true },
      create: { ...config, isActive: true },
    });
  }
  console.log("✅ Configurações do sistema criadas\n");

  // Criar usuário admin
  console.log("👤 Criando usuário admin...");
  const adminPassword = await hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@miningprotocol.com" },
    update: {
      password: adminPassword,
      role: "admin",
      hasInvested: true,
      linkUnlocked: true,
    },
    create: {
      name: "Administrador",
      email: "admin@miningprotocol.com",
      password: adminPassword,
      role: "admin",
      balance: 0,
      totalInvested: 0,
      totalMined: 0,
      hasInvested: true,
      linkUnlocked: true,
      pixKey: "admin@miningprotocol.com",
    },
  });
  
  // Gerar código de afiliado para admin
  const adminAffiliateCode = "ADMIN001";
  await prisma.user.update({
    where: { id: admin.id },
    data: { affiliateCode: adminAffiliateCode },
  });
  
  console.log("✅ Usuário admin criado:");
  console.log(`   Email: admin@miningprotocol.com`);
  console.log(`   Senha: admin123`);
  console.log(`   Código Afiliado: ${adminAffiliateCode}\n`);

  // Criar mineradoras
  console.log("⛏️ Criando mineradoras...");
  const miners = [
    {
      name: "Antminer S21",
      model: "S21-200T",
      hashRate: 200,
      powerConsumption: 3500,
      coin: "BTC",
      pool: "Foundry USA",
      dailyRevenue: 85.50,
      pricePerDay: 45.00,
      efficiency: 57.14,
      description: "Nova geração, máxima eficiência - 200 TH/s",
      status: "online",
    },
    {
      name: "Antminer S19 XP",
      model: "S19-XP-141T",
      hashRate: 141,
      powerConsumption: 3010,
      coin: "BTC",
      pool: "Antpool",
      dailyRevenue: 60.20,
      pricePerDay: 32.00,
      efficiency: 46.85,
      description: "Mais eficiente da linha S19, ideal para mineração profissional",
      status: "online",
    },
    {
      name: "Antminer S19 Pro",
      model: "S19-PRO-110T",
      hashRate: 110,
      powerConsumption: 3250,
      coin: "BTC",
      pool: "F2Pool",
      dailyRevenue: 47.00,
      pricePerDay: 25.00,
      efficiency: 33.85,
      description: "Confiável e estável - 110 TH/s",
      status: "online",
    },
    {
      name: "Antminer S19j Pro",
      model: "S19J-PRO-100T",
      hashRate: 100,
      powerConsumption: 3050,
      coin: "BTC",
      pool: "Binance Pool",
      dailyRevenue: 42.70,
      pricePerDay: 22.00,
      efficiency: 32.79,
      description: "Excelente custo-benefício - 100 TH/s",
      status: "online",
    },
    {
      name: "Antminer KS5",
      model: "KS5-20T",
      hashRate: 20000,
      powerConsumption: 3000,
      coin: "KAS",
      pool: "Kaspa Pool",
      dailyRevenue: 250.00,
      pricePerDay: 120.00,
      efficiency: 83.33,
      description: "Minerador Kaspa mais rentável - 20 TH/s kHeavyHash",
      status: "online",
    },
    {
      name: "Antminer KS3",
      model: "KS3-9.4T",
      hashRate: 9400,
      powerConsumption: 3500,
      coin: "KAS",
      pool: "Kaspa Pool",
      dailyRevenue: 118.00,
      pricePerDay: 65.00,
      efficiency: 33.71,
      description: "Minerador Kaspa - 9.4 TH/s kHeavyHash",
      status: "online",
    },
    {
      name: "Antminer L7",
      model: "L7-9.05G",
      hashRate: 9050,
      powerConsumption: 3425,
      coin: "LTC",
      pool: "LitecoinPool",
      dailyRevenue: 72.00,
      pricePerDay: 38.00,
      efficiency: 21.02,
      description: "Minerador Litecoin/Dogecoin Scrypt - 9.05 GH/s",
      status: "online",
    },
    {
      name: "Whatsminer M50S",
      model: "M50S-126T",
      hashRate: 126,
      powerConsumption: 3276,
      coin: "BTC",
      pool: "Foundry USA",
      dailyRevenue: 53.80,
      pricePerDay: 28.00,
      efficiency: 38.46,
      description: "MicroBT Whatsminer - 126 TH/s",
      status: "online",
    },
    {
      name: "Whatsminer M30S++",
      model: "M30S-112T",
      hashRate: 112,
      powerConsumption: 3472,
      coin: "BTC",
      pool: "Antpool",
      dailyRevenue: 47.80,
      pricePerDay: 25.00,
      efficiency: 32.26,
      description: "MicroBT Whatsminer - 112 TH/s",
      status: "maintenance",
    },
    {
      name: "Goldshell KD6",
      model: "KD6-26.3G",
      hashRate: 26300,
      powerConsumption: 2680,
      coin: "KDA",
      pool: "Kadena Pool",
      dailyRevenue: 48.00,
      pricePerDay: 26.00,
      efficiency: 17.91,
      description: "Minerador Kadena Blake2S - 26.3 GH/s",
      status: "online",
    },
  ];

  for (const miner of miners) {
    await prisma.miner.upsert({
      where: { name: miner.name },
      update: miner,
      create: miner,
    });
  }
  console.log(`✅ ${miners.length} mineradoras criadas\n`);

  console.log("🎉 Seed concluído com sucesso!");
  console.log("\n📌 Resumo:");
  console.log("   - 5 níveis de afiliado");
  console.log("   - 17 configurações do sistema");
  console.log("   - 1 usuário admin");
  console.log("   - 10 mineradoras");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

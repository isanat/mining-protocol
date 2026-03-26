import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Create miners
  const miners = [
    {
      name: "Antminer S19 XP",
      model: "S19 XP",
      hashRate: 140,
      powerConsumption: 3010,
      coin: "BTC",
      pool: "Binance Pool",
      status: "online",
      dailyRevenue: 85.50,
      pricePerDay: 45.00,
      efficiency: 21.5,
      description: "Mais eficiente da linha S19, ideal para mineração profissional",
    },
    {
      name: "Antminer S19 Pro",
      model: "S19 Pro",
      hashRate: 110,
      powerConsumption: 3250,
      coin: "BTC",
      pool: "Antpool",
      status: "online",
      dailyRevenue: 67.20,
      pricePerDay: 35.00,
      efficiency: 29.5,
      description: "Alta performance e estabilidade comprovada",
    },
    {
      name: "Whatsminer M50S",
      model: "M50S",
      hashRate: 126,
      powerConsumption: 3276,
      coin: "BTC",
      pool: "Braiins Pool",
      status: "online",
      dailyRevenue: 77.00,
      pricePerDay: 40.00,
      efficiency: 26.0,
      description: "Excelente eficiência energética",
    },
    {
      name: "Antminer S19j Pro",
      model: "S19j Pro",
      hashRate: 100,
      powerConsumption: 3050,
      coin: "BTC",
      pool: "Foundry USA",
      status: "online",
      dailyRevenue: 61.00,
      pricePerDay: 32.00,
      efficiency: 30.5,
      description: "Custo-benefício ideal para entrada",
    },
    {
      name: "KASPA KS3",
      model: "KS3",
      hashRate: 9.4,
      powerConsumption: 3500,
      coin: "KAS",
      pool: "Poolin",
      status: "online",
      dailyRevenue: 120.00,
      pricePerDay: 60.00,
      efficiency: 372.3,
      description: "Alta rentabilidade em KASPA",
    },
    {
      name: "Antminer L7",
      model: "L7",
      hashRate: 9.05,
      powerConsumption: 3425,
      coin: "LTC",
      pool: "Litecoinpool",
      status: "online",
      dailyRevenue: 45.00,
      pricePerDay: 25.00,
      efficiency: 378.5,
      description: "Mineração de Litecoin e Dogecoin",
    },
    {
      name: "Goldshell KD6",
      model: "KD6",
      hashRate: 26.3,
      powerConsumption: 2660,
      coin: "KDA",
      pool: "Kadena Pool",
      status: "online",
      dailyRevenue: 55.00,
      pricePerDay: 28.00,
      efficiency: 101.1,
      description: "Especializada em Kadena",
    },
    {
      name: "Antminer KS5",
      model: "KS5",
      hashRate: 20,
      powerConsumption: 3000,
      coin: "KAS",
      pool: "Poolin",
      status: "online",
      dailyRevenue: 180.00,
      pricePerDay: 90.00,
      efficiency: 150.0,
      description: "Top de linha para KASPA",
    },
    {
      name: "Whatsminer M30S++",
      model: "M30S++",
      hashRate: 112,
      powerConsumption: 3472,
      coin: "BTC",
      pool: "Antpool",
      status: "maintenance",
      dailyRevenue: 68.00,
      pricePerDay: 35.00,
      efficiency: 31.0,
      description: "Geração anterior, ainda muito eficiente",
    },
    {
      name: "Antminer S21",
      model: "S21",
      hashRate: 200,
      powerConsumption: 3500,
      coin: "BTC",
      pool: "Binance Pool",
      status: "online",
      dailyRevenue: 122.00,
      pricePerDay: 65.00,
      efficiency: 17.5,
      description: "Nova geração, máxima eficiência",
    },
  ];

  for (const miner of miners) {
    await db.miner.upsert({
      where: { name: miner.name },
      update: miner,
      create: miner,
    });
    console.log(`Created/Updated miner: ${miner.name}`);
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await db.user.upsert({
    where: { email: "admin@miningprotocol.com" },
    update: {},
    create: {
      email: "admin@miningprotocol.com",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      balance: 0,
      totalMined: 0,
      totalInvested: 0,
    },
  });
  console.log("Created admin user: admin@miningprotocol.com");

  // Create pool status
  await db.poolStatus.upsert({
    where: { name: "Binance Pool" },
    update: {
      hashrate: 12.5,
      miners: 1247,
      blocks24h: 34,
      lastBlock: new Date(),
      btcPrice: 584250,
      difficulty: 83.1,
    },
    create: {
      name: "Binance Pool",
      hashrate: 12.5,
      miners: 1247,
      blocks24h: 34,
      lastBlock: new Date(),
      btcPrice: 584250,
      difficulty: 83.1,
    },
  });
  console.log("Created pool status");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

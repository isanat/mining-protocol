import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@miningprotocol.com' },
    update: {},
    create: {
      email: 'admin@miningprotocol.com',
      name: 'Administrador',
      password: adminPassword,
      role: 'admin',
      balance: 0,
      totalMined: 0,
      totalInvested: 0,
      affiliateCode: 'ADMIN001',
      hasInvested: true,
      linkUnlocked: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);

  // Criar níveis de afiliado padrão
  const levels = [
    { level: 1, percentage: 10, description: 'Indicação direta' },
    { level: 2, percentage: 5, description: 'Segundo nível' },
    { level: 3, percentage: 3, description: 'Terceiro nível' },
    { level: 4, percentage: 2, description: 'Quarto nível' },
    { level: 5, percentage: 1, description: 'Quinto nível' },
  ];

  for (const level of levels) {
    await prisma.affiliateLevel.upsert({
      where: { level: level.level },
      update: level,
      create: level,
    });
  }

  console.log('✅ Níveis de afiliado criados');

  // Criar configurações padrão do sistema
  const configs = [
    { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'general', description: 'Modo de manutenção' },
    { key: 'allow_registration', value: 'true', type: 'boolean', category: 'general', description: 'Permitir novos registros' },
    { key: 'min_deposit', value: '20', type: 'number', category: 'general', description: 'Depósito mínimo em USDT' },
    { key: 'min_withdrawal', value: '50', type: 'number', category: 'withdrawal', description: 'Saque mínimo em USDT' },
    { key: 'withdrawal_fee_percent', value: '2', type: 'number', category: 'withdrawal', description: 'Taxa de saque (%)' },
    { key: 'withdrawal_processing_time', value: '24', type: 'number', category: 'withdrawal', description: 'Tempo de processamento (horas)' },
    { key: 'affiliate_withdrawal_fee', value: '5', type: 'number', category: 'affiliate', description: 'Taxa de saque de comissões (%)' },
    { key: 'affiliate_min_withdrawal', value: '50', type: 'number', category: 'affiliate', description: 'Saque mínimo de comissões (USDT)' },
    { key: 'miner_profit_share', value: '70', type: 'number', category: 'mining', description: 'Share do usuário (%)' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    });
  }

  console.log('✅ Configurações do sistema criadas');

  // Criar mineradoras de exemplo
  const miners = [
    {
      name: 'Antminer S19 Pro',
      model: 'S19 Pro',
      hashRate: 110,
      powerConsumption: 3250,
      coin: 'BTC',
      pool: 'Binance Pool',
      dailyRevenue: 15.50,
      pricePerDay: 12.00,
      efficiency: 29.5,
      status: 'online',
      description: 'Mineradora ASIC de última geração para Bitcoin',
    },
    {
      name: 'Whatsminer M30S++',
      model: 'M30S++',
      hashRate: 112,
      powerConsumption: 3472,
      coin: 'BTC',
      pool: 'Binance Pool',
      dailyRevenue: 16.00,
      pricePerDay: 13.00,
      efficiency: 31.0,
      status: 'online',
      description: 'Alta eficiência energética para mineração de Bitcoin',
    },
    {
      name: 'Antminer KS3',
      model: 'KS3',
      hashRate: 9.4,
      powerConsumption: 3500,
      coin: 'KAS',
      pool: 'Kaspa Pool',
      dailyRevenue: 18.00,
      pricePerDay: 15.00,
      efficiency: 372.3,
      status: 'online',
      description: 'Mineradora especializada em Kaspa',
    },
    {
      name: 'L7 Antminer',
      model: 'L7',
      hashRate: 9.5,
      powerConsumption: 3425,
      coin: 'LTC',
      pool: 'Litecoin Pool',
      dailyRevenue: 14.00,
      pricePerDay: 11.00,
      efficiency: 360.5,
      status: 'online',
      description: 'Mineradora para Litecoin e Dogecoin',
    },
  ];

  for (const miner of miners) {
    await prisma.miner.upsert({
      where: { name: miner.name },
      update: miner,
      create: miner,
    });
  }

  console.log('✅ Mineradoras criadas');

  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📧 Credenciais do admin:');
  console.log('   Email: admin@miningprotocol.com');
  console.log('   Senha: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

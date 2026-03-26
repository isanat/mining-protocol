# Mining Protocol

Plataforma profissional de aluguel de hashpower para mineração de criptomoedas, com interface estilo DeFi.

## 🚀 Funcionalidades

- **Dashboard Profissional** - Métricas em tempo real, gráficos interativos
- **10 Mineradoras Reais** - Antminer S19 XP, S21, Whatsminer M50S, KASPA KS3, etc.
- **Sistema de Aluguel** - Alugue hashrate por 7, 14, 30, 60 ou 90 dias
- **Pagamentos PIX/USDT** - Depósito e saque via PIX ou USDT (TRC20/ERC20)
- **Autenticação Segura** - Senhas criptografadas com bcrypt
- **Histórico Completo** - Transações e histórico de mineração

## 🛠️ Tecnologias

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **UI**: shadcn/ui, Radix UI, Framer Motion, Recharts
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco de Dados**: PostgreSQL (Vercel Postgres)
- **Deploy**: Vercel

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/isanat/mining-protocol.git
cd mining-protocol

# Instale as dependências
npm install

# Configure o banco de dados
npx prisma generate
npx prisma db push

# Execute o seed
npm run db:seed

# Inicie o servidor
npm run dev
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://..."
MINING_API_KEY="sua-chave-secreta"
```

## 📊 Mineradoras Disponíveis

| Modelo | Hashrate | Moeda | Pool |
|--------|----------|-------|------|
| Antminer S19 XP | 140 TH/s | BTC | Binance Pool |
| Antminer S21 | 200 TH/s | BTC | Binance Pool |
| Antminer S19 Pro | 110 TH/s | BTC | Antpool |
| Whatsminer M50S | 126 TH/s | BTC | Braiins Pool |
| KASPA KS5 | 20 TH/s | KAS | Poolin |
| KASPA KS3 | 9.4 TH/s | KAS | Poolin |
| Antminer L7 | 9.05 GH/s | LTC | Litecoinpool |
| Goldshell KD6 | 26.3 TH/s | KDA | Kadena Pool |

## 🌐 Deploy

Este projeto está configurado para deploy automático no Vercel:

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. O deploy acontece automaticamente a cada push

## 📝 Licença

MIT License

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTransaction, getExplorerUrl } from "@/lib/blockchain-verify";
import { convertBRLtoUSDT, getUSDTBRLPrice } from "@/lib/usdt-price";

// Wallet addresses for USDT deposits
const WALLET_ADDRESSES = {
  TRC20: process.env.TRON_WALLET_ADDRESS || "TRX123456789abcdefghijklmnopqrstuv",
  Polygon: process.env.POLYGON_WALLET_ADDRESS || "0x123456789abcdefABCDEF123456789abcdefABCD",
};

// Validate transaction hash format
function validateTxHash(txHash: string, network: string): { valid: boolean; error?: string } {
  if (!txHash || typeof txHash !== "string") {
    return { valid: false, error: "Hash da transação é obrigatório" };
  }

  // Remove any whitespace
  txHash = txHash.trim();

  if (network === "TRC20") {
    // TRC20 transactions are 64 characters hex (without 0x prefix usually)
    // Can also start with 0x for some explorers
    const trc20Pattern = /^(0x)?[a-fA-F0-9]{64}$/;
    if (!trc20Pattern.test(txHash)) {
      return { 
        valid: false, 
        error: "Hash TRC20 inválido. Deve conter 64 caracteres hexadecimais" 
      };
    }
  } else if (network === "Polygon") {
    // Polygon/Ethereum transactions start with 0x and are 66 characters total
    const polygonPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!polygonPattern.test(txHash)) {
      return { 
        valid: false, 
        error: "Hash Polygon inválido. Deve começar com 0x e conter 64 caracteres hexadecimais" 
      };
    }
  } else {
    return { valid: false, error: "Rede não suportada" };
  }

  return { valid: true };
}

// Minimum deposit amounts
const MIN_DEPOSITS = {
  pixBrl: 20, // BRL minimum for PIX
  usdt: 20, // USDT minimum
};

// Credit user balance and create transaction (USDT primary)
async function creditUserBalance(
  userId: string,
  usdtAmount: number,
  brlAmount: number | null,
  usdtRate: number,
  investmentId: string,
  method: string,
  network: string | null
) {
  // Update user balance in USDT
  await db.user.update({
    where: { id: userId },
    data: {
      balance: { increment: usdtAmount },
      totalInvested: { increment: usdtAmount },
      hasInvested: true,
      linkUnlocked: true,
    },
  });

  // Create transaction record
  await db.transaction.create({
    data: {
      userId,
      type: "deposit",
      amount: usdtAmount, // Primary: USDT
      brlAmount: brlAmount,
      usdtRate: usdtRate,
      status: "completed",
      description: `Depósito ${method === "pix" ? "PIX" : `USDT (${network})`} - Confirmado automaticamente`,
      referenceId: investmentId,
    },
  });

  // Update investment status
  await db.investment.update({
    where: { id: investmentId },
    data: {
      status: "confirmed",
      processedAt: new Date(),
      description: `Depósito via ${method === "pix" ? "PIX" : `USDT (${network})`} - Confirmado automaticamente`,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, method, network, usdtAmount, txHash, brlAmount } = body;

    // Get current USDT/BRL rate
    const usdtRate = await getUSDTBRLPrice();

    // ===== PIX DEPOSIT =====
    if (method === "pix") {
      // Validate BRL amount
      const pixBrlAmount = brlAmount || amount;
      if (!pixBrlAmount || pixBrlAmount < MIN_DEPOSITS.pixBrl) {
        return NextResponse.json(
          { error: `Depósito mínimo via PIX: R$ ${MIN_DEPOSITS.pixBrl}` },
          { status: 400 }
        );
      }

      // Convert BRL to USDT
      const convertedUsdtAmount = await convertBRLtoUSDT(pixBrlAmount);

      // Create investment record (pending - admin will approve after PIX confirmation)
      const investment = await db.investment.create({
        data: {
          userId,
          amount: convertedUsdtAmount, // Primary: USDT
          brlAmount: pixBrlAmount, // Original BRL amount
          usdtRate: usdtRate,
          type: "deposit",
          method: "pix",
          status: "pending",
          description: `Depósito via PIX - Aguardando confirmação (R$ ${pixBrlAmount.toFixed(2)} → $${convertedUsdtAmount.toFixed(2)} USDT)`,
        },
      });

      // Create transaction record
      await db.transaction.create({
        data: {
          userId,
          type: "deposit",
          amount: convertedUsdtAmount,
          brlAmount: pixBrlAmount,
          usdtRate: usdtRate,
          status: "pending",
          description: `Depósito via PIX - Aguardando confirmação`,
          referenceId: investment.id,
        },
      });

      return NextResponse.json({
        success: true,
        investment: {
          id: investment.id,
          usdtAmount: convertedUsdtAmount,
          brlAmount: pixBrlAmount,
          usdtRate: usdtRate,
          status: "pending",
        },
        depositInfo: {
          pixKey: "mining@protocol.com",
          pixType: "email",
          qrCode: "00020126580014BR.GOV.BCB.PIX0136mining@protocol.com520400005303986540" + pixBrlAmount.toFixed(2) + "5802BR5925MINING PROTOCOL LTDA6009SAO PAULO62070503***6304",
          investmentId: investment.id,
        },
        message: `Depósito de R$ ${pixBrlAmount.toFixed(2)} será creditado como $${convertedUsdtAmount.toFixed(2)} USDT após confirmação.`,
      });
    }

    // ===== USDT DEPOSIT =====
    if (method === "usdt_trc20" || method === "usdt_polygon") {
      const validatedNetwork = method === "usdt_trc20" ? "TRC20" : "Polygon";

      // Validate USDT amount
      const depositUsdtAmount = usdtAmount || amount;
      if (!depositUsdtAmount || depositUsdtAmount < MIN_DEPOSITS.usdt) {
        return NextResponse.json(
          { error: `Depósito mínimo via USDT: $${MIN_DEPOSITS.usdt}` },
          { status: 400 }
        );
      }

      // If txHash provided, validate and verify on blockchain
      if (txHash) {
        const validation = validateTxHash(txHash, validatedNetwork);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        // Check if txHash is already used
        const existingDeposit = await db.investment.findFirst({
          where: { txHash: txHash.trim() },
        });

        if (existingDeposit) {
          return NextResponse.json(
            { error: "Este hash de transação já foi utilizado" },
            { status: 400 }
          );
        }

        // Create investment record first (pending status)
        const investment = await db.investment.create({
          data: {
            userId,
            amount: depositUsdtAmount, // Primary: USDT
            brlAmount: null, // Will be calculated on display
            usdtRate: usdtRate,
            type: "deposit",
            method,
            network: validatedNetwork,
            status: "pending_verification",
            txHash: txHash.trim(),
            description: `Depósito via USDT (${validatedNetwork}) - Verificando blockchain`,
          },
        });

        // Verify transaction on blockchain
        const walletAddress = WALLET_ADDRESSES[validatedNetwork as keyof typeof WALLET_ADDRESSES];
        const verificationResult = await verifyTransaction(
          txHash.trim(),
          depositUsdtAmount,
          validatedNetwork as "TRC20" | "Polygon",
          walletAddress
        );

        if (verificationResult.valid && !verificationResult.needsMoreConfirmations) {
          // Auto-approve: Transaction is verified
          await creditUserBalance(
            userId,
            depositUsdtAmount,
            null,
            usdtRate,
            investment.id,
            method,
            validatedNetwork
          );

          return NextResponse.json({
            success: true,
            autoApproved: true,
            verified: true,
            investment: {
              id: investment.id,
              status: "confirmed",
              usdtAmount: depositUsdtAmount,
              network: validatedNetwork,
            },
            verification: {
              valid: true,
              amount: verificationResult.amount,
              confirmations: verificationResult.confirmations,
            },
            message: `Depósito confirmado! $${depositUsdtAmount.toFixed(2)} USDT creditado.`,
            explorerUrl: getExplorerUrl(txHash.trim(), validatedNetwork as "TRC20" | "Polygon"),
            usdtRate,
          });
        } else if (verificationResult.valid && verificationResult.needsMoreConfirmations) {
          // Transaction found but needs more confirmations
          return NextResponse.json({
            success: true,
            autoApproved: false,
            verified: true,
            pendingConfirmations: true,
            investment: {
              id: investment.id,
              status: "pending_verification",
              usdtAmount: depositUsdtAmount,
              network: validatedNetwork,
            },
            verification: {
              valid: true,
              confirmations: verificationResult.confirmations,
              needed: validatedNetwork === "TRC20" ? 19 : 3,
            },
            message: verificationResult.error || "Aguardando confirmações na blockchain...",
            explorerUrl: getExplorerUrl(txHash.trim(), validatedNetwork as "TRC20" | "Polygon"),
            usdtRate,
          });
        } else {
          // Verification failed
          await db.investment.update({
            where: { id: investment.id },
            data: {
              status: "pending_verification",
              description: `Depósito via USDT (${validatedNetwork}) - Verificação pendente: ${verificationResult.error}`,
            },
          });

          return NextResponse.json({
            success: true,
            autoApproved: false,
            verified: false,
            investment: {
              id: investment.id,
              status: "pending_verification",
              usdtAmount: depositUsdtAmount,
              network: validatedNetwork,
            },
            verification: {
              valid: false,
              error: verificationResult.error,
            },
            message: verificationResult.error || "Transação não pode ser verificada. Será verificado novamente automaticamente.",
            explorerUrl: getExplorerUrl(txHash.trim(), validatedNetwork as "TRC20" | "Polygon"),
            usdtRate,
          }, { status: 202 });
        }
      }

      // USDT deposit without txHash - show wallet address
      const investment = await db.investment.create({
        data: {
          userId,
          amount: depositUsdtAmount,
          usdtRate: usdtRate,
          type: "deposit",
          method,
          network: validatedNetwork,
          status: "pending",
          description: `Depósito via USDT (${validatedNetwork}) - Aguardando transação`,
        },
      });

      return NextResponse.json({
        success: true,
        investment: {
          id: investment.id,
          usdtAmount: depositUsdtAmount,
          status: "pending",
        },
        depositInfo: {
          walletAddress: WALLET_ADDRESSES[validatedNetwork as keyof typeof WALLET_ADDRESSES],
          network: validatedNetwork,
          minConfirmations: validatedNetwork === "TRC20" ? 19 : 3,
          investmentId: investment.id,
        },
        usdtRate,
      });
    }

    return NextResponse.json(
      { error: "Método de depósito inválido" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Submit transaction hash for USDT deposit
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { investmentId, txHash } = body;

    if (!investmentId) {
      return NextResponse.json(
        { error: "ID do investimento é obrigatório" },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: "Hash da transação é obrigatório" },
        { status: 400 }
      );
    }

    const investment = await db.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (investment.userId !== userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 403 }
      );
    }

    if (investment.status !== "pending") {
      return NextResponse.json(
        { error: "Este depósito já foi processado" },
        { status: 400 }
      );
    }

    // Determine network from method
    const network = investment.method === "usdt_trc20" ? "TRC20" : 
                   investment.method === "usdt_polygon" ? "Polygon" : null;

    if (!network) {
      return NextResponse.json(
        { error: "Método de depósito não suporta hash de transação" },
        { status: 400 }
      );
    }

    // Validate txHash format
    const validation = validateTxHash(txHash, network);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if txHash is already used
    const existingDeposit = await db.investment.findFirst({
      where: { 
        txHash: txHash.trim(),
        NOT: { id: investmentId }
      },
    });

    if (existingDeposit) {
      return NextResponse.json(
        { error: "Este hash de transação já foi utilizado" },
        { status: 400 }
      );
    }

    // Get current rate
    const usdtRate = await getUSDTBRLPrice();

    // Update investment with txHash and verify on blockchain
    await db.investment.update({
      where: { id: investmentId },
      data: {
        txHash: txHash.trim(),
        network,
        usdtRate,
        status: "pending_verification",
        description: `Depósito via USDT (${network}) - Verificando blockchain`,
      },
    });

    // Verify transaction on blockchain
    const walletAddress = WALLET_ADDRESSES[network as keyof typeof WALLET_ADDRESSES];
    const verificationResult = await verifyTransaction(
      txHash.trim(),
      investment.amount,
      network as "TRC20" | "Polygon",
      walletAddress
    );

    if (verificationResult.valid && !verificationResult.needsMoreConfirmations) {
      // Auto-approve
      await creditUserBalance(
        userId,
        investment.amount,
        null,
        usdtRate,
        investmentId,
        investment.method,
        network
      );

      return NextResponse.json({
        success: true,
        autoApproved: true,
        verified: true,
        message: `Depósito confirmado! $${investment.amount.toFixed(2)} USDT creditado.`,
        explorerUrl: getExplorerUrl(txHash.trim(), network as "TRC20" | "Polygon"),
        usdtRate,
      });
    } else if (verificationResult.valid && verificationResult.needsMoreConfirmations) {
      return NextResponse.json({
        success: true,
        autoApproved: false,
        verified: true,
        pendingConfirmations: true,
        message: `Aguardando confirmações (${verificationResult.confirmations}/${network === "TRC20" ? 19 : 3})`,
        explorerUrl: getExplorerUrl(txHash.trim(), network as "TRC20" | "Polygon"),
        usdtRate,
      });
    } else {
      return NextResponse.json({
        success: true,
        autoApproved: false,
        verified: false,
        message: verificationResult.error || "Transação não pode ser verificada. Será verificado novamente automaticamente.",
        explorerUrl: getExplorerUrl(txHash.trim(), network as "TRC20" | "Polygon"),
        usdtRate,
      }, { status: 202 });
    }
  } catch (error) {
    console.error("Submit txHash error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

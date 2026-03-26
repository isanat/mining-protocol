import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTransaction } from "@/lib/blockchain-verify";

// Wallet addresses for USDT deposits
const WALLET_ADDRESSES = {
  TRC20: process.env.TRON_WALLET_ADDRESS || "TRX123456789abcdefghijklmnopqrstuv",
  Polygon: process.env.POLYGON_WALLET_ADDRESS || "0x123456789abcdefABCDEF123456789abcdefABCD",
};

// Credit user balance and create transaction (USDT is primary currency)
async function creditUserBalance(
  userId: string,
  usdtAmount: number,
  investmentId: string,
  network: string
) {
  // Update user balance (USDT is primary)
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
      amount: usdtAmount, // USDT
      status: "completed",
      description: `Depósito USDT (${network}) - Confirmado automaticamente (cron)`,
      referenceId: investmentId,
    },
  });

  // Update investment status
  await db.investment.update({
    where: { id: investmentId },
    data: {
      status: "confirmed",
      processedAt: new Date(),
      description: `Depósito via USDT (${network}) - Confirmado automaticamente (cron)`,
    },
  });
}

/**
 * Cron job endpoint to verify pending USDT deposits
 * 
 * This endpoint should be called periodically (every 5 minutes) by a cron service
 * like Vercel Cron, EasyCron, or similar.
 * 
 * Security: Requires API key in header or query param
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API key for security
    const apiKey = request.headers.get("x-api-key") || 
                   request.nextUrl.searchParams.get("apiKey");
    
    const expectedApiKey = process.env.MINING_API_KEY || process.env.CRON_SECRET;
    
    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all pending verification deposits with txHash
    const pendingDeposits = await db.investment.findMany({
      where: {
        status: "pending_verification",
        txHash: { not: null },
        method: { in: ["usdt_trc20", "usdt_polygon"] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${pendingDeposits.length} pending deposits to verify`);

    const results = {
      processed: 0,
      confirmed: 0,
      stillPending: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const deposit of pendingDeposits) {
      results.processed++;
      
      try {
        const network = deposit.network as "TRC20" | "Polygon";
        const txHash = deposit.txHash!;
        const expectedAmount = deposit.amount; // Already in USDT
        const walletAddress = WALLET_ADDRESSES[network as keyof typeof WALLET_ADDRESSES];

        console.log(`[Cron] Verifying deposit ${deposit.id} - ${txHash} on ${network}`);

        // Verify transaction on blockchain
        const verification = await verifyTransaction(
          txHash,
          expectedAmount,
          network,
          walletAddress
        );

        if (verification.valid && !verification.needsMoreConfirmations) {
          // Transaction confirmed - credit user (USDT)
          await creditUserBalance(
            deposit.userId,
            deposit.amount, // USDT amount
            deposit.id,
            network
          );
          
          results.confirmed++;
          console.log(`[Cron] Deposit ${deposit.id} confirmed - credited $${deposit.amount} USDT to user ${deposit.userId}`);
        } else if (verification.valid && verification.needsMoreConfirmations) {
          // Still needs more confirmations
          results.stillPending++;
          
          // Update with current confirmation count
          await db.investment.update({
            where: { id: deposit.id },
            data: {
              adminNotes: `Confirmations: ${verification.confirmations}/${network === "TRC20" ? 19 : 3}`,
            },
          });
          
          console.log(`[Cron] Deposit ${deposit.id} still pending - ${verification.confirmations} confirmations`);
        } else {
          // Verification failed
          results.failed++;
          
          // Update with error message
          await db.investment.update({
            where: { id: deposit.id },
            data: {
              adminNotes: `Verification failed: ${verification.error}`,
            },
          });
          
          results.errors.push(`Deposit ${deposit.id}: ${verification.error}`);
          console.log(`[Cron] Deposit ${deposit.id} verification failed: ${verification.error}`);
        }

        // Add a small delay between verifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[Cron] Error processing deposit ${deposit.id}:`, error);
        results.errors.push(`Deposit ${deposit.id}: Internal error`);
        results.failed++;
      }
    }

    // Log summary
    console.log(`[Cron] Verification complete - Processed: ${results.processed}, Confirmed: ${results.confirmed}, Pending: ${results.stillPending}, Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error("[Cron] Verify pending deposits error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for services that prefer it
export async function POST(request: NextRequest) {
  return GET(request);
}

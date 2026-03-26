import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { convertUSDTtoBRL, getUSDTBRLPrice } from "@/lib/usdt-price";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true, // USDT balance (primary)
        totalMined: true, // USDT
        totalInvested: true, // USDT
        walletAddress: true,
        pixKey: true,
        role: true,
        affiliateCode: true,
        affiliateBalance: true, // USDT
        totalAffiliateEarnings: true, // USDT
        linkUnlocked: true,
        hasInvested: true,
        referredBy: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Get current USDT/BRL rate and calculate BRL equivalent
    const usdtRate = await getUSDTBRLPrice();
    const balanceBrlEquivalent = await convertUSDTtoBRL(user.balance);
    const totalMinedBrlEquivalent = await convertUSDTtoBRL(user.totalMined);
    const totalInvestedBrlEquivalent = await convertUSDTtoBRL(user.totalInvested);
    const affiliateBalanceBrlEquivalent = await convertUSDTtoBRL(user.affiliateBalance || 0);

    return NextResponse.json({
      user: {
        ...user,
        // Add BRL equivalents for display
        balanceBrlEquivalent,
        totalMinedBrlEquivalent,
        totalInvestedBrlEquivalent,
        affiliateBalanceBrlEquivalent,
        usdtRate,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

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
    const { name, pixKey, walletAddress } = body;

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        pixKey: pixKey || undefined,
        walletAddress: walletAddress || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true, // USDT
        totalMined: true,
        totalInvested: true,
        walletAddress: true,
        pixKey: true,
        role: true,
        affiliateCode: true,
        affiliateBalance: true,
        totalAffiliateEarnings: true,
        linkUnlocked: true,
        hasInvested: true,
        createdAt: true,
      },
    });

    // Get BRL equivalent
    const usdtRate = await getUSDTBRLPrice();
    const balanceBrlEquivalent = await convertUSDTtoBRL(user.balance);

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        balanceBrlEquivalent,
        usdtRate,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

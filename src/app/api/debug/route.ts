import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Debug endpoint - only for development
export async function GET(request: NextRequest) {
  try {
    // Check admin count
    const adminCount = await db.user.count({
      where: { role: "admin" }
    });

    // Get all users (without passwords)
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    // Check pending deposits
    const pendingDeposits = await db.investment.count({
      where: { type: "deposit", status: "pending" }
    });

    // Check affiliate levels
    const levelsCount = await db.affiliateLevel.count();

    return NextResponse.json({
      success: true,
      database: "connected",
      stats: {
        users: users.length,
        admins: adminCount,
        pendingDeposits,
        affiliateLevels: levelsCount,
      },
      users,
      adminCredentials: adminCount === 0 ? {
        message: "No admin found. Run: bun run db:seed",
        defaultEmail: "admin@miningprotocol.com",
        defaultPassword: "admin123"
      } : {
        message: "Admin exists",
        loginEmail: "admin@miningprotocol.com",
        loginPassword: "admin123"
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

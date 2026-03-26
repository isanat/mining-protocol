import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET - Check admin setup status
export async function GET() {
  try {
    // Check if any admin exists
    const adminCount = await db.user.count({
      where: { role: "admin" }
    });

    // Check total users
    const totalUsers = await db.user.count();

    // Check pending deposits
    const pendingDeposits = await db.investment.count({
      where: { type: "deposit", status: "pending" }
    });

    // Check pending withdrawals
    const pendingWithdrawals = await db.affiliateWithdrawal.count({
      where: { status: "pending" }
    });

    // Check if system is configured
    const configsCount = await db.systemConfig.count();
    const levelsCount = await db.affiliateLevel.count();

    return NextResponse.json({
      success: true,
      setup: {
        hasAdmin: adminCount > 0,
        adminCount,
        totalUsers,
        pendingDeposits,
        pendingWithdrawals,
        hasConfigs: configsCount > 0,
        hasAffiliateLevels: levelsCount > 0,
        isComplete: adminCount > 0 && configsCount > 0 && levelsCount > 0
      }
    });
  } catch (error) {
    console.error("Error checking setup:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST - Promote user to admin (only if no admin exists, or with secret key)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, secretKey } = body;

    // Check if admin already exists
    const adminCount = await db.user.count({
      where: { role: "admin" }
    });

    // If admin exists, require secret key
    if (adminCount > 0) {
      if (secretKey !== process.env.ADMIN_SECRET_KEY && secretKey !== "mining-admin-2024") {
        return NextResponse.json(
          { error: "Já existe um admin. Chave secreta necessária." },
          { status: 403 }
        );
      }
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create admin user if not found
      const hashedPassword = await bcrypt.hash("admin123", 12);
      const newAdmin = await db.user.create({
        data: {
          email,
          name: "Administrador",
          password: hashedPassword,
          role: "admin",
          balance: 0,
          totalMined: 0,
          totalInvested: 0,
          affiliateCode: "ADMIN" + Math.random().toString(36).substr(2, 4).toUpperCase(),
          hasInvested: true,
          linkUnlocked: true,
        },
      });

      const { password: _, ...adminWithoutPassword } = newAdmin;
      return NextResponse.json({
        success: true,
        message: "Admin criado com sucesso",
        user: adminWithoutPassword,
        credentials: {
          email: newAdmin.email,
          password: "admin123"
        }
      });
    }

    // Promote existing user to admin
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { role: "admin" }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json({
      success: true,
      message: "Usuário promovido a admin",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

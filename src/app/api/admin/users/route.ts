import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { getUSDTBRLPrice, convertUSDTtoBRL } from "@/lib/usdt-price";

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const hasInvested = searchParams.get("hasInvested");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (hasInvested !== null && hasInvested !== "") {
      where.hasInvested = hasInvested === "true";
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          balance: true, // USDT
          totalInvested: true, // USDT
          totalMined: true, // USDT
          affiliateBalance: true, // USDT
          totalAffiliateEarnings: true, // USDT
          hasInvested: true,
          affiliateCode: true,
          referredBy: true,
          createdAt: true,
          _count: {
            select: {
              referrals: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      db.user.count({ where })
    ]);

    // Get USDT rate
    const usdtRate = await getUSDTBRLPrice();

    // Buscar nome de quem indicou e adicionar BRL equivalentes
    const usersWithReferrer = await Promise.all(
      users.map(async (u) => {
        let referredByName = null;
        if (u.referredBy) {
          const referrer = await db.user.findUnique({
            where: { id: u.referredBy },
            select: { name: true, email: true }
          });
          referredByName = referrer?.name || referrer?.email;
        }
        return {
          ...u,
          referredByName,
          totalReferrals: u._count.referrals,
          // Add BRL equivalents
          balanceBrl: await convertUSDTtoBRL(u.balance),
          totalInvestedBrl: await convertUSDTtoBRL(u.totalInvested),
          totalMinedBrl: await convertUSDTtoBRL(u.totalMined),
          affiliateBalanceBrl: await convertUSDTtoBRL(u.affiliateBalance || 0),
          usdtRate,
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithReferrer,
      usdtRate,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { id: userId }
    });

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, balance, pixKey, walletAddress } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Verificar se email já existe
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    // Balance is in USDT
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "user",
        balance: balance || 0, // USDT
        pixKey,
        walletAddress
      }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "create",
        entity: "user",
        entityId: newUser.id,
        newValue: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          balanceUsdt: newUser.balance
        }),
        description: `Usuário criado: ${newUser.email}`
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        balance: newUser.balance // USDT
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { id: userId }
    });

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    // Buscar usuário antes de atualizar para log
    const oldUser = await db.user.findUnique({
      where: { id }
    });

    if (!oldUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Preparar dados para atualização (todos os valores monetários em USDT)
    const data: Record<string, unknown> = {};
    
    if (updateData.name) data.name = updateData.name;
    if (updateData.email) data.email = updateData.email;
    if (updateData.role) data.role = updateData.role;
    if (updateData.balance !== undefined) data.balance = updateData.balance; // USDT
    if (updateData.affiliateBalance !== undefined) data.affiliateBalance = updateData.affiliateBalance; // USDT
    if (updateData.pixKey !== undefined) data.pixKey = updateData.pixKey;
    if (updateData.walletAddress !== undefined) data.walletAddress = updateData.walletAddress;
    if (updateData.hasInvested !== undefined) data.hasInvested = updateData.hasInvested;
    if (updateData.linkUnlocked !== undefined) data.linkUnlocked = updateData.linkUnlocked;

    const updatedUser = await db.user.update({
      where: { id },
      data
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "update",
        entity: "user",
        entityId: id,
        oldValue: JSON.stringify(oldUser),
        newValue: JSON.stringify(updatedUser),
        description: `Usuário atualizado: ${updatedUser.email}`
      }
    });

    // Add BRL equivalent
    const usdtRate = await getUSDTBRLPrice();

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        balanceBrl: await convertUSDTtoBRL(updatedUser.balance),
        usdtRate,
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const admin = await db.user.findUnique({
      where: { id: userId }
    });

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    // Não permitir excluir a si mesmo
    if (targetUserId === userId) {
      return NextResponse.json({ error: "Não é possível excluir sua própria conta" }, { status: 400 });
    }

    // Buscar usuário antes de excluir para log
    const userToDelete = await db.user.findUnique({
      where: { id: targetUserId }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Excluir usuário
    await db.user.delete({
      where: { id: targetUserId }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "delete",
        entity: "user",
        entityId: targetUserId,
        oldValue: JSON.stringify(userToDelete),
        description: `Usuário excluído: ${userToDelete.email}`
      }
    });

    return NextResponse.json({
      success: true,
      message: "Usuário excluído com sucesso"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Listar mineradoras
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

    const miners = await db.miner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { rentals: true }
        }
      }
    });

    // Estatísticas de cada mineradora
    const minersWithStats = await Promise.all(
      miners.map(async (miner) => {
        const activeRentals = await db.miningRental.count({
          where: { minerId: miner.id, status: "active" }
        });

        const totalRevenue = await db.miningRental.aggregate({
          where: { minerId: miner.id },
          _sum: { amount: true }
        });

        return {
          ...miner,
          activeRentals,
          totalRentals: miner._count.rentals,
          totalRevenue: totalRevenue._sum.amount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      miners: minersWithStats
    });
  } catch (error) {
    console.error("Error fetching miners:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar mineradora
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, model, hashRate, powerConsumption, coin, pool, dailyRevenue, pricePerDay, efficiency, description, status } = body;

    if (!name || !model || !hashRate || !powerConsumption) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const miner = await db.miner.create({
      data: {
        name,
        model,
        hashRate: parseFloat(hashRate),
        powerConsumption: parseFloat(powerConsumption),
        coin: coin || "BTC",
        pool: pool || "Binance Pool",
        dailyRevenue: parseFloat(dailyRevenue) || 0,
        pricePerDay: parseFloat(pricePerDay) || 0,
        efficiency: parseFloat(efficiency) || 0,
        description,
        status: status || "online"
      }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "create",
        entity: "miner",
        entityId: miner.id,
        newValue: JSON.stringify(miner),
        description: `Mineradora criada: ${miner.name}`
      }
    });

    return NextResponse.json({
      success: true,
      miner
    });
  } catch (error) {
    console.error("Error creating miner:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Atualizar mineradora
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID da mineradora é obrigatório" }, { status: 400 });
    }

    const oldMiner = await db.miner.findUnique({
      where: { id }
    });

    if (!oldMiner) {
      return NextResponse.json({ error: "Mineradora não encontrada" }, { status: 404 });
    }

    const data: any = {};
    if (updateData.name) data.name = updateData.name;
    if (updateData.model) data.model = updateData.model;
    if (updateData.hashRate !== undefined) data.hashRate = parseFloat(updateData.hashRate);
    if (updateData.powerConsumption !== undefined) data.powerConsumption = parseFloat(updateData.powerConsumption);
    if (updateData.coin) data.coin = updateData.coin;
    if (updateData.pool) data.pool = updateData.pool;
    if (updateData.dailyRevenue !== undefined) data.dailyRevenue = parseFloat(updateData.dailyRevenue);
    if (updateData.pricePerDay !== undefined) data.pricePerDay = parseFloat(updateData.pricePerDay);
    if (updateData.efficiency !== undefined) data.efficiency = parseFloat(updateData.efficiency);
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.status) data.status = updateData.status;

    const updatedMiner = await db.miner.update({
      where: { id },
      data
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "update",
        entity: "miner",
        entityId: id,
        oldValue: JSON.stringify(oldMiner),
        newValue: JSON.stringify(updatedMiner),
        description: `Mineradora atualizada: ${updatedMiner.name}`
      }
    });

    return NextResponse.json({
      success: true,
      miner: updatedMiner
    });
  } catch (error) {
    console.error("Error updating miner:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Excluir mineradora
export async function DELETE(request: NextRequest) {
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
    const minerId = searchParams.get("id");

    if (!minerId) {
      return NextResponse.json({ error: "ID da mineradora é obrigatório" }, { status: 400 });
    }

    // Verificar se há aluguéis ativos
    const activeRentals = await db.miningRental.count({
      where: { minerId, status: "active" }
    });

    if (activeRentals > 0) {
      return NextResponse.json({ 
        error: `Não é possível excluir. Existem ${activeRentals} aluguéis ativos nesta mineradora.` 
      }, { status: 400 });
    }

    const miner = await db.miner.findUnique({
      where: { id: minerId }
    });

    if (!miner) {
      return NextResponse.json({ error: "Mineradora não encontrada" }, { status: 404 });
    }

    await db.miner.delete({
      where: { id: minerId }
    });

    // Log de auditoria
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "delete",
        entity: "miner",
        entityId: minerId,
        oldValue: JSON.stringify(miner),
        description: `Mineradora excluída: ${miner.name}`
      }
    });

    return NextResponse.json({
      success: true,
      message: "Mineradora excluída com sucesso"
    });
  } catch (error) {
    console.error("Error deleting miner:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

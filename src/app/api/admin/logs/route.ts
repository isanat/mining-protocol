import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Listar logs de auditoria
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action") || "";
    const entity = searchParams.get("entity") || "";
    const adminId = searchParams.get("adminId") || "";

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};
    
    if (action) {
      where.action = action;
    }
    
    if (entity) {
      where.entity = entity;
    }
    
    if (adminId) {
      where.adminId = adminId;
    }

    const [logs, total] = await Promise.all([
      db.adminLog.findMany({
        where,
        include: {
          // We need to get admin name, but there's no direct relation
          // So we'll fetch separately
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      db.adminLog.count({ where })
    ]);

    // Buscar nomes dos admins
    const adminIds = [...new Set(logs.map(log => log.adminId))];
    const admins = await db.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true, email: true }
    });

    const adminMap = new Map(admins.map(a => [a.id, a]));

    // Combinar logs com nomes dos admins
    const logsWithAdmin = logs.map(log => ({
      ...log,
      admin: adminMap.get(log.adminId) || null
    }));

    // Estatísticas
    const actionStats = await db.adminLog.groupBy({
      by: ["action"],
      _count: true
    });

    const entityStats = await db.adminLog.groupBy({
      by: ["entity"],
      _count: true
    });

    // Logs de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await db.adminLog.count({
      where: { createdAt: { gte: today } }
    });

    return NextResponse.json({
      success: true,
      logs: logsWithAdmin,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        today: todayLogs,
        byAction: actionStats,
        byEntity: entityStats
      }
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Limpar logs antigos (mais de 90 dias)
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
    const days = parseInt(searchParams.get("days") || "90");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.adminLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    // Log desta ação
    await db.adminLog.create({
      data: {
        adminId: userId,
        action: "delete",
        entity: "logs",
        description: `Limpeza de logs: ${result.count} registros removidos (mais de ${days} dias)`
      }
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `${result.count} logs antigos removidos`
    });
  } catch (error) {
    console.error("Error cleaning logs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

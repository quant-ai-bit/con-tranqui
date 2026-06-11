import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// GET — Fetch dashboard data for a specific month/year
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
  const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get the most recent contract (or first one)
    const contract = await prisma.contract.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        scopes: {
          orderBy: { orderNumber: "asc" },
          include: {
            requiredEvidences: true,
            entries: {
              where: { month, year },
            },
            evidences: {
              where: { month, year },
            },
            activities: {
              where: { month, year },
              orderBy: { createdAt: "asc" },
              include: {
                evidences: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ contract: null, scopes: [], stats: null });
    }

    // Compute per-scope status
    const scopesWithStatus = contract.scopes.map((scope) => {
      const entry = scope.entries[0];
      const hasActivities = scope.activities.length > 0;
      
      // Count evidences (both directly on scope and linked to activities)
      let evidenceCount = scope.evidences.length;
      scope.activities.forEach(act => {
        evidenceCount += act.evidences.length;
      });
      
      const requiredCount = scope.requiredEvidences.length;

      let status = "pending";
      let progress = 0;

      if (hasActivities) {
        status = "complete";
        progress = 100;
      } else if (entry && entry.status === "confirmed") {
        status = "complete";
        progress = 100;
      } else if (entry && entry.narrativeText) {
        status = "inprogress";
        progress = 75;
      } else if (evidenceCount > 0) {
        status = "inprogress";
        progress = Math.min(50, Math.round((evidenceCount / Math.max(requiredCount, 1)) * 50));
      }

      return {
        id: scope.id,
        orderNumber: scope.orderNumber,
        title: scope.title,
        description: scope.description,
        status,
        progress,
        evidenceCount,
        requiredEvidences: scope.requiredEvidences.map((re) => ({
          id: re.id,
          name: re.name,
          completed: scope.evidences.some(
            (ev) => ev.fileName.toLowerCase().includes(re.name.toLowerCase().split(" ")[0])
          ),
        })),
        entry: entry ? {
          id: entry.id,
          narrativeText: entry.narrativeText,
          status: entry.status,
          aiMode: entry.aiMode,
          observations: entry.observations,
        } : null,
        activities: scope.activities.map((act) => ({
          id: act.id,
          title: act.title,
          date: act.date,
          location: act.location,
          evidences: act.evidences,
        })),
      };
    });

    const completedCount = scopesWithStatus.filter((s) => s.status === "complete").length;
    const totalEvidences = scopesWithStatus.reduce((sum, s) => sum + s.evidenceCount, 0);
    const avgProgress = scopesWithStatus.length > 0
      ? Math.round(scopesWithStatus.reduce((sum, s) => sum + s.progress, 0) / scopesWithStatus.length)
      : 0;

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        contractNumber: contract.contractNumber,
        entity: contract.entity,
        objeto: contract.objeto,
        plazo: contract.plazo,
        valorTotal: contract.valorTotal,
        valorMensual: contract.valorMensual,
        proyecto: contract.proyecto,
        supervisor: contract.supervisor,
        dependencia: contract.dependencia,
        ccContratista: contract.ccContratista,
        totalPeriodos: contract.totalPeriodos,
        nameCoordinador: contract.nameCoordinador,
        nameAbogado: contract.nameAbogado,
        sigContratista: contract.sigContratista,
        sigSupervisor: contract.sigSupervisor,
        sigCoordinador: contract.sigCoordinador,
        sigAbogado: contract.sigAbogado,
        user: contract.user ? {
          name: contract.user.name,
        } : null,
      },
      scopes: scopesWithStatus,
      stats: {
        totalScopes: scopesWithStatus.length,
        completedScopes: completedCount,
        totalEvidences,
        avgProgress,
      },
      month,
      year,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: error.message || "Error al cargar el dashboard" },
      { status: 500 }
    );
  }
}

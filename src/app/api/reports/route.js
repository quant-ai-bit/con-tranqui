import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// GET - List all reports for the current user's contracts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const reports = await prisma.report.findMany({
      where: {
        contract: {
          userId: session.user.id,
        },
      },
      include: {
        contract: {
          select: {
            title: true,
            contractNumber: true,
            entity: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { error: error.message || "Error al listar informes" },
      { status: 500 }
    );
  }
}

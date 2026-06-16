import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// GET — Fetch system statistics for the admin dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "administrador" && session.user.role !== "admin" && session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Acceso prohibido: se requiere rol de Administrador." }, { status: 403 });
    }

    // 1. Fetch Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Count contracts
    const contractCount = await prisma.contract.count();

    // 3. Fetch Evidences metadata for stats
    const evidences = await prisma.evidence.findMany({
      select: {
        fileType: true,
        fileSize: true,
      },
    });

    // 4. Fetch Reports metadata for stats
    const reports = await prisma.report.findMany({
      select: {
        type: true,
        status: true,
      },
    });

    // Compute stats
    const totalUsers = users.length;
    const totalContracts = contractCount;
    const totalEvidences = evidences.length;
    const totalReports = reports.length;

    let totalEvSize = 0;
    const evidenceTypeDistribution = {
      image: 0,
      document: 0,
      text: 0,
      audio: 0,
      other: 0,
    };

    evidences.forEach((ev) => {
      totalEvSize += ev.fileSize || 0;
      const type = ev.fileType || "other";
      if (evidenceTypeDistribution[type] !== undefined) {
        evidenceTypeDistribution[type]++;
      } else {
        evidenceTypeDistribution.other++;
      }
    });

    const reportTypeDistribution = {
      activities: 0,
      supervision: 0,
    };
    const reportStatusDistribution = {};

    reports.forEach((rep) => {
      const type = rep.type || "activities";
      if (reportTypeDistribution[type] !== undefined) {
        reportTypeDistribution[type]++;
      }
      
      const status = rep.status || "draft";
      reportStatusDistribution[status] = (reportStatusDistribution[status] || 0) + 1;
    });

    // Storage Infrastructure Information
    const infrastructure = {
      database: {
        provider: "Neon PostgreSQL (Serverless)",
        host: process.env.PGHOST || "Neon Cloud Database",
        tables: ["User", "Contract", "Scope", "RequiredEvidence", "Evidence", "Activity", "ScopeEntry", "Report", "Account", "Session", "VerificationToken"],
        purpose: "Guarda el registro de usuarios, datos estructurados de contratos, alcances, bitácoras de actividades e historial de reportes.",
      },
      fileStorage: {
        provider: "Vercel Blob Storage",
        tokenName: "BLOB_READ_WRITE_TOKEN",
        purpose: "Almacena los archivos físicos de evidencias subidos por los contratistas (PDFs, fotos, audios y documentos).",
      },
      reportGeneration: {
        provider: "Generación Dinámica (.docx) vía librería docx",
        purpose: "Los informes y anexos se compilan dinámicamente en memoria a partir de los datos de PostgreSQL y Vercel Blob. Los informes se guardan temporalmente en el servidor local o se redirigen vía Drive, mientras que los anexos se sirven al vuelo y se descargan sin guardarse en disco.",
      }
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalContracts,
        totalEvidences,
        totalReports,
        totalEvidenceSize: totalEvSize,
        evidenceTypeDistribution,
        reportTypeDistribution,
        reportStatusDistribution,
      },
      users,
      infrastructure,
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener las estadísticas del sistema" },
      { status: 500 }
    );
  }
}

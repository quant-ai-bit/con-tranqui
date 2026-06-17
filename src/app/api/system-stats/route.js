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

    // 1. Fetch Users with their relations to compile stats and logs
    const dbUsers = await prisma.user.findMany({
      include: {
        contracts: {
          include: {
            reports: true,
            scopes: {
              include: {
                evidences: true,
                activities: true,
                entries: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const users = dbUsers.map(user => {
      const userContracts = user.contracts || [];
      const userReports = [];
      const userEvidences = [];
      const userActivities = [];
      const userEntries = [];

      userContracts.forEach(c => {
        if (c.reports) userReports.push(...c.reports);
        if (c.scopes) {
          c.scopes.forEach(s => {
            if (s.evidences) userEvidences.push(...s.evidences);
            if (s.activities) userActivities.push(...s.activities);
            if (s.entries) userEntries.push(...s.entries);
          });
        }
      });

      // Compute evidence distribution per user
      const evidenceTypeDistribution = {
        image: 0,
        document: 0,
        text: 0,
        audio: 0,
        other: 0,
      };
      let totalEvidenceSize = 0;
      userEvidences.forEach(ev => {
        totalEvidenceSize += ev.fileSize || 0;
        const type = ev.fileType || "other";
        if (evidenceTypeDistribution[type] !== undefined) {
          evidenceTypeDistribution[type]++;
        } else {
          evidenceTypeDistribution.other++;
        }
      });

      // Compile activity log
      const rawEvents = [];
      
      // User registered
      rawEvents.push({
        type: 'user',
        description: 'Se registró en la plataforma',
        date: user.createdAt
      });

      // Contracts
      userContracts.forEach(c => {
        rawEvents.push({
          type: 'contract',
          description: `Configuró el contrato: ${c.title || c.contractNumber || 'Sin título'}`,
          date: c.createdAt
        });
      });

      // Evidences
      userEvidences.forEach(ev => {
        rawEvents.push({
          type: 'evidence',
          description: `Subió la evidencia: ${ev.fileName}`,
          date: ev.uploadedAt
        });
      });

      // Reports
      userReports.forEach(rep => {
        rawEvents.push({
          type: 'report',
          description: `Generó reporte ${rep.type === 'activities' ? 'de actividades' : 'de supervisión'} para mes ${rep.month}/${rep.year}`,
          date: rep.createdAt
        });
      });

      // Activities
      userActivities.forEach(act => {
        rawEvents.push({
          type: 'activity',
          description: `Registró actividad: ${act.title}${act.location ? ' en ' + act.location : ''}`,
          date: act.createdAt
        });
      });

      // Entries
      userEntries.forEach(entry => {
        rawEvents.push({
          type: 'entry',
          description: `Actualizó bitácora de mes ${entry.month}/${entry.year}`,
          date: entry.updatedAt
        });
      });

      // Sort events descending by date
      const sortedEvents = rawEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastActive = sortedEvents[0]?.date || user.createdAt;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        stats: {
          totalContracts: userContracts.length,
          totalEvidences: userEvidences.length,
          totalEvidenceSize,
          totalReports: userReports.length,
          evidenceTypeDistribution
        },
        lastActive,
        activityLog: sortedEvents.slice(0, 15) // Recent 15 events
      };
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

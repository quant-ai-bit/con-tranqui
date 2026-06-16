import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JSZip from "jszip";

export const runtime = "nodejs";

// GET — Generate all reports and annexes for a contract month, package them as a ZIP
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId");
    const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

    if (!contractId) {
      return NextResponse.json({ error: "contractId es requerido" }, { status: 400 });
    }

    // Verify contract belongs to the current user
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: session.user.id },
      include: {
        reports: {
          where: { month, year }
        }
      }
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado o no autorizado" }, { status: 404 });
    }

    const activitiesReport = contract.reports.find(r => r.type === "activities");
    
    // Setup request headers & baseUrl to fetch internally
    const cookie = request.headers.get("cookie") || "";
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.url.startsWith("https") ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const zip = new JSZip();
    let hasFiles = false;

    // 1. Generate and add Activities Report
    try {
      console.log(`[download-all] Triggering Activities Report generation for contract ${contractId}...`);
      const resGen = await fetch(`${baseUrl}/api/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie
        },
        body: JSON.stringify({
          contractId,
          month,
          year,
          driveLink: activitiesReport?.driveLink || "",
          periodoActual: activitiesReport?.periodoActual || `${month} de ${year}`,
          periodoTexto: activitiesReport?.periodoTexto || ""
        })
      });

      if (resGen.ok) {
        const data = await resGen.json();
        if (data.downloadUrl) {
          const downloadRes = await fetch(`${baseUrl}${data.downloadUrl}`, { headers: { cookie } });
          if (downloadRes.ok) {
            const buffer = await downloadRes.arrayBuffer();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const monthName = monthNames[month - 1] || "Mes";
            const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
            const reportFileName = `Informe_Actividades_${cleanNumber}_${monthName}_${year}.docx`;
            
            zip.file(reportFileName, Buffer.from(buffer));
            hasFiles = true;
            console.log(`[download-all] Added ${reportFileName} to ZIP.`);
          }
        }
      }
    } catch (err) {
      console.error("[download-all] Error generating activities report:", err);
    }

    // 2. Generate and add Supervision Report
    try {
      console.log(`[download-all] Triggering Supervision Report generation for contract ${contractId}...`);
      const resGen = await fetch(`${baseUrl}/api/reports/supervision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie
        },
        body: JSON.stringify({
          contractId,
          month,
          year,
          supervisorName: contract.supervisor || undefined,
          totalValue: contract.valorTotal ? parseFloat(String(contract.valorTotal).replace(/[^0-9]/g, "")) : undefined,
          paymentsToDate: contract.pagosRealizados ? parseFloat(String(contract.pagosRealizados).replace(/[^0-9]/g, "")) : undefined,
          startDateStr: contract.fechaInicio || undefined,
          endDateStr: contract.fechaTerminacion || undefined,
          plazoStr: contract.plazo || undefined
        })
      });

      if (resGen.ok) {
        const data = await resGen.json();
        if (data.downloadUrl) {
          const downloadRes = await fetch(`${baseUrl}${data.downloadUrl}`, { headers: { cookie } });
          if (downloadRes.ok) {
            const buffer = await downloadRes.arrayBuffer();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const monthName = monthNames[month - 1] || "Mes";
            const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
            const supervisionFileName = `Informe_Supervision_${cleanNumber}_${monthName}_${year}.docx`;
            
            zip.file(supervisionFileName, Buffer.from(buffer));
            hasFiles = true;
            console.log(`[download-all] Added ${supervisionFileName} to ZIP.`);
          }
        }
      }
    } catch (err) {
      console.error("[download-all] Error generating supervision report:", err);
    }

    // 3. Fetch activities and generate Annexes
    try {
      const activities = await prisma.activity.findMany({
        where: {
          scope: { contractId },
          month,
          year
        },
        include: {
          scope: true
        },
        orderBy: { createdAt: "asc" }
      });

      console.log(`[download-all] Found ${activities.length} activities. Fetching annexes...`);

      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        const annexRes = await fetch(`${baseUrl}/api/activities/${activity.id}/annex`, { headers: { cookie } });
        
        if (annexRes.ok) {
          const buffer = await annexRes.arrayBuffer();
          // Find sibling index to determine annex number
          const siblings = activities.filter(act => act.scopeId === activity.scopeId);
          const siblingIndex = siblings.findIndex(act => act.id === activity.id);
          const annexNumber = siblingIndex !== -1 ? siblingIndex + 1 : 1;
          
          const safeTitle = activity.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
          const fileName = `Anexo_${activity.scope.orderNumber}_${annexNumber}_${safeTitle}.docx`;
          
          zip.file(fileName, Buffer.from(buffer));
          hasFiles = true;
          console.log(`[download-all] Added annex ${fileName} to ZIP.`);
        }
      }
    } catch (err) {
      console.error("[download-all] Error generating annexes:", err);
    }

    if (!hasFiles) {
      return NextResponse.json({ error: "No se encontraron informes o anexos para este período." }, { status: 404 });
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
    const zipName = `Informes_y_Anexos_${cleanNumber}_M${month}_Y${year}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`
      }
    });

  } catch (error) {
    console.error("Error generating unified ZIP download:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el archivo ZIP" },
      { status: 500 }
    );
  }
}

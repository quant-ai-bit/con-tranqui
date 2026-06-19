import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

function stripHtml(html) {
  if (!html) return "";
  let text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/<[^>]*>/g, "");
  return text.replace(/\s+/g, " ").trim();
}

function getBufferFromBase64(base64Str) {
  if (!base64Str) return null;
  const matches = base64Str.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], "base64");
  }
  try {
    return Buffer.from(base64Str, "base64");
  } catch (e) {
    return null;
  }
}

const generatePdfBuffer = (doc) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));
    doc.end();
  });
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      contractId, 
      month, 
      year,
      driveLink,
      periodoActual,
      periodoTexto
    } = body;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Fetch contract details
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        user: true,
        scopes: {
          orderBy: { orderNumber: "asc" },
          include: {
            entries: {
              where: { month: currentMonth, year: currentYear },
            },
            activities: {
              where: { month: currentMonth, year: currentYear },
              orderBy: { createdAt: "asc" },
              include: {
                evidences: {
                  orderBy: { uploadedAt: "asc" }
                }
              }
            },
            requiredEvidences: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const monthName = monthNames[currentMonth - 1] || "febrero";

    // Setup PDFkit document
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // 1. Report Title
    doc.font("Helvetica-Bold").fontSize(14).text("INFORME MENSUAL DE ACTIVIDADES Y CERTIFICACIÓN DE CUMPLIMIENTO", { align: "center" });
    doc.moveDown(1.5);

    // Section 1 Header
    doc.font("Helvetica-Bold").fontSize(11).text("1. INFORMACIÓN GENERAL DEL CONTRATO", { underline: true });
    doc.moveDown(0.5);

    // Render Table 1: General Info
    let currentY = doc.y;
    
    const drawInfoRow = (label, value) => {
      // Check if page overflow
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
      
      const valStr = value || "N/A";
      const height = Math.max(
        doc.heightOfString(label, { width: 160 }),
        doc.heightOfString(valStr, { width: 340 })
      ) + 6;

      // Draw light borders
      doc.rect(50, currentY, 512, height).strokeColor("#e2e8f0").stroke();
      doc.lineJoin("miter").rect(50, currentY, 160, height).strokeColor("#e2e8f0").stroke();
      
      // Text
      doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(9).text(label, 56, currentY + 4, { width: 148 });
      doc.fillColor("#334155").font("Helvetica").fontSize(9).text(valStr, 216, currentY + 4, { width: 328 });
      
      currentY += height;
    };

    drawInfoRow("Contratista", `${contract.user?.name || "N/A"}`);
    drawInfoRow("Identificación (CC)", `${contract.ccContratista || "N/A"}`);
    drawInfoRow("Informe de Actividades Nº", `${periodoActual || "N/A"}`);
    drawInfoRow("Periodo Evaluado", `${periodoTexto || "N/A"}`);
    drawInfoRow("Número del Contrato", `${contract.contractNumber || "N/A"}`);
    drawInfoRow("Objeto Contractual", `${contract.objeto || "N/A"}`);
    drawInfoRow("Plazo de Ejecución", `${contract.plazo || "N/A"}`);
    drawInfoRow("Valor Total del Contrato", `${contract.valorTotal || "N/A"}`);
    drawInfoRow("Valor Mensual (Periodo)", `${contract.valorMensual || "N/A"}`);
    drawInfoRow("Fecha de Suscripción", `${contract.fechaContrato || "N/A"}`);
    drawInfoRow("Fecha de Inicio", `${contract.fechaInicio || "N/A"}`);
    drawInfoRow("Fecha de Terminación", `${contract.fechaTerminacion || "N/A"}`);
    drawInfoRow("Proyecto", `${contract.proyecto || "N/A"}`);
    drawInfoRow("Supervisor(a)", `${contract.supervisor || "N/A"}`);
    drawInfoRow("Dependencia", `${contract.dependencia || "N/A"}`);
    drawInfoRow("Carpeta de Evidencias (Drive)", `${driveLink || "(No especificado)"}`);

    doc.y = currentY + 25;

    // Section 2 Header
    if (doc.y > 680) {
      doc.addPage();
    }
    
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(11).text("2. DESARROLLO Y CUMPLIMIENTO DEL CONTRATO", { underline: true });
    doc.moveDown(0.8);

    // Table 2 Headers
    currentY = doc.y;
    doc.rect(50, currentY, 512, 22).fillColor("#f8fafc").fill();
    doc.rect(50, currentY, 512, 22).strokeColor("#cbd5e1").stroke();
    
    // Draw vertical column separators
    doc.lineJoin("miter").rect(50, currentY, 150, 22).strokeColor("#cbd5e1").stroke();
    doc.lineJoin("miter").rect(200, currentY, 202, 22).strokeColor("#cbd5e1").stroke();
    doc.lineJoin("miter").rect(402, currentY, 80, 22).strokeColor("#cbd5e1").stroke();
    
    // Column header labels
    doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8);
    doc.text("OBJETIVOS / ALCANCES", 54, currentY + 6, { width: 142, align: "center" });
    doc.text("ACTIVIDADES DESARROLLADAS", 204, currentY + 6, { width: 194, align: "center" });
    doc.text("REGISTRO", 404, currentY + 6, { width: 72, align: "center" });
    doc.text("OBSERVACIONES", 486, currentY + 6, { width: 72, align: "center" });
    
    currentY += 22;

    for (const scope of contract.scopes) {
      // Column 2 formatting: Activities
      let activitiesText = "";
      if (scope.activities && scope.activities.length > 0) {
        scope.activities.forEach((act, idx) => {
          const actNum = idx + 1;
          const purposeEv = act.evidences?.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
          const purposeText = purposeEv?.content || act.evidences?.find(ev => ev.fileType === "text")?.content || "";
          const cleanPurpose = stripHtml(purposeText);
          activitiesText += `${actNum}. Fecha: ${act.date || "N/A"}.\nAcción: ${act.title}.\nPropósito: ${cleanPurpose}\n\n`;
        });
        activitiesText = activitiesText.trim();
      } else {
        activitiesText = stripHtml(scope.entries[0]?.narrativeText) || "Sin actividades registradas en el periodo.";
      }

      // Column 3 formatting: Attachments
      let attachmentsText = `ANEXOS ${scope.orderNumber}:\n`;
      if (scope.activities && scope.activities.length > 0) {
        scope.activities.forEach((act, idx) => {
          attachmentsText += `Actividad ${scope.orderNumber}.${idx + 1}: ${act.title}\n`;
        });
      } else {
        attachmentsText += "N/A";
      }

      // Column 4 formatting: Observations
      const obsText = scope.entries[0]?.observations || "N/A";

      // Calculate scope height dynamically
      const rowHeight = Math.max(
        doc.heightOfString(`${scope.orderNumber}. ${scope.title}`, { width: 140 }),
        doc.heightOfString(activitiesText, { width: 192 }),
        doc.heightOfString(attachmentsText, { width: 72 }),
        doc.heightOfString(obsText, { width: 72 })
      ) + 12;

      // Check page overflow
      if (currentY + rowHeight > 730) {
        doc.addPage();
        currentY = 50;
        
        // Redraw Headers on new page
        doc.rect(50, currentY, 512, 22).fillColor("#f8fafc").fill();
        doc.rect(50, currentY, 512, 22).strokeColor("#cbd5e1").stroke();
        doc.lineJoin("miter").rect(50, currentY, 150, 22).strokeColor("#cbd5e1").stroke();
        doc.lineJoin("miter").rect(200, currentY, 202, 22).strokeColor("#cbd5e1").stroke();
        doc.lineJoin("miter").rect(402, currentY, 80, 22).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8);
        doc.text("OBJETIVOS / ALCANCES", 54, currentY + 6, { width: 142, align: "center" });
        doc.text("ACTIVIDADES DESARROLLADAS", 204, currentY + 6, { width: 194, align: "center" });
        doc.text("REGISTRO", 404, currentY + 6, { width: 72, align: "center" });
        doc.text("OBSERVACIONES", 486, currentY + 6, { width: 72, align: "center" });
        currentY += 22;
      }

      // Draw borders
      doc.rect(50, currentY, 512, rowHeight).strokeColor("#cbd5e1").stroke();
      doc.lineJoin("miter").rect(50, currentY, 150, rowHeight).strokeColor("#cbd5e1").stroke();
      doc.lineJoin("miter").rect(200, currentY, 202, rowHeight).strokeColor("#cbd5e1").stroke();
      doc.lineJoin("miter").rect(402, currentY, 80, rowHeight).strokeColor("#cbd5e1").stroke();

      // Render content
      doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8).text(`${scope.orderNumber}.`, 54, currentY + 6);
      doc.font("Helvetica").fontSize(8).text(scope.title, 66, currentY + 6, { width: 128 });
      doc.fillColor("#334155").text(activitiesText, 204, currentY + 6, { width: 194 });
      doc.fillColor("#475569").fontSize(7.5).text(attachmentsText, 404, currentY + 6, { width: 72 });
      doc.fillColor("#475569").fontSize(8).text(obsText, 486, currentY + 6, { width: 72 });

      currentY += rowHeight;
    }

    doc.y = currentY + 40;

    // Page overflow check for Signatures
    if (doc.y > 580) {
      doc.addPage();
    }

    const drawPdfSignature = (title, name, cc, sigBase64, x, y) => {
      const sigBuffer = getBufferFromBase64(sigBase64);
      if (sigBuffer) {
        try {
          doc.image(sigBuffer, x + 35, y, { width: 110, height: 40 });
        } catch (e) {
          console.error("PDF signature rendering error:", e);
        }
      }
      
      const textY = y + 42;
      doc.fillColor("#1e293b").font("Helvetica").fontSize(8).text("____________________________________", x, textY, { align: "center", width: 180 });
      doc.font("Helvetica-Bold").fontSize(9).text(name || "N/A", x, textY + 12, { align: "center", width: 180 });
      doc.font("Helvetica").fontSize(8).text(title, x, textY + 24, { align: "center", width: 180 });
      if (cc) {
        doc.font("Helvetica").fontSize(8).text(`c.c. ${cc}`, x, textY + 34, { align: "center", width: 180 });
      }
    };

    // Draw Signatures Grid (2x2 layout)
    const sigY1 = doc.y;
    drawPdfSignature("Contratista", contract.user?.name, contract.ccContratista, contract.sigContratista, 50, sigY1);
    drawPdfSignature("Supervisor(a) de Contrato", contract.supervisor, null, contract.sigSupervisor, 330, sigY1);

    const sigY2 = sigY1 + 100;
    drawPdfSignature("VB. COORDINADORA DE TURISMO", contract.nameCoordinador, null, contract.sigCoordinador, 330, sigY2);
    
    const sigY3 = sigY2 + 100;
    drawPdfSignature("VB. ABOGADA CONTRATISTA", contract.nameAbogado, null, contract.sigAbogado, 50, sigY3);

    // Compile document
    const buffer = await generatePdfBuffer(doc);

    const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `Informe_${cleanNumber}_${monthName}_${currentYear}.pdf`;
    let filePathResult = `/reports/${fileName}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log(`[generate-pdf] Subiendo informe PDF ${fileName} a Vercel Blob...`);
        const blob = await put(`reports/${fileName}`, buffer, {
          access: "public",
          addRandomSuffix: false,
        });
        filePathResult = blob.url;
        console.log(`[generate-pdf] PDF subido exitosamente a Vercel Blob: ${filePathResult}`);
      } catch (blobError) {
        console.error("[generate-pdf] Error al subir a Vercel Blob, guardando en disco local:", blobError);
        const reportsDir = path.join(process.cwd(), "reports");
        await mkdir(reportsDir, { recursive: true });
        const filePath = path.join(reportsDir, fileName);
        await writeFile(filePath, buffer);
      }
    } else {
      const reportsDir = path.join(process.cwd(), "reports");
      await mkdir(reportsDir, { recursive: true });
      const filePath = path.join(reportsDir, fileName);
      await writeFile(filePath, buffer);
    }

    // Upsert Report record in DB
    const report = await prisma.report.upsert({
      where: {
        id: (await prisma.report.findFirst({
          where: { contractId, month: currentMonth, year: currentYear, type: "pdf" },
        }))?.id || "new-pdf",
      },
      update: {
        status: "generated",
        generatedAt: new Date(),
        filePath: filePathResult,
        driveLink,
        periodoActual,
        periodoTexto,
      },
      create: {
        contractId,
        month: currentMonth,
        year: currentYear,
        type: "pdf",
        status: "generated",
        generatedAt: new Date(),
        filePath: filePathResult,
        driveLink,
        periodoActual,
        periodoTexto,
      },
    });

    return NextResponse.json({
      success: true,
      report,
      fileName,
      downloadUrl: `/api/reports/download?file=${encodeURIComponent(fileName)}`,
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el informe en PDF" },
      { status: 500 }
    );
  }
}

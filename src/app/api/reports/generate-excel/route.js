import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import ExcelJS from "exceljs";
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

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tu Tranqui";
    workbook.lastModifiedBy = "Tu Tranqui";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("Bitácora de Actividades");
    worksheet.views = [{ showGridLines: true }];

    // Column settings and widths
    worksheet.getColumn(1).width = 18; // Col A: Alcance
    worksheet.getColumn(2).width = 16; // Col B: Fecha
    worksheet.getColumn(3).width = 16; // Col C: Lugar
    worksheet.getColumn(4).width = 38; // Col D: Actividad Desarrollada
    worksheet.getColumn(5).width = 48; // Col E: Propósito / Descripción
    worksheet.getColumn(6).width = 28; // Col F: Observaciones

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const styleCell = (cell, options = {}) => {
      cell.font = {
        name: 'Arial',
        size: options.size || 10,
        bold: !!options.bold,
        color: options.color ? { argb: options.color } : undefined
      };
      
      if (options.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: options.fill }
        };
      }
      
      if (options.border) {
        cell.border = thinBorder;
      }
      
      if (options.align) {
        cell.alignment = options.align;
      }
    };

    // 1. Title Block
    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = "INFORME MENSUAL DE ACTIVIDADES Y CERTIFICACIÓN DE CUMPLIMIENTO";
    styleCell(worksheet.getCell("A1"), {
      bold: true,
      size: 13,
      align: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getRow(1).height = 40;

    // Header 1: General Info
    worksheet.mergeCells("A3:F3");
    worksheet.getCell("A3").value = "1. INFORMACIÓN GENERAL DEL CONTRATO";
    styleCell(worksheet.getCell("A3"), {
      bold: true,
      size: 11,
      fill: "FF1E293B",
      color: "FFFFFFFF",
      align: { vertical: 'middle', horizontal: 'left' }
    });
    worksheet.getRow(3).height = 24;

    const drawRow = (rowNum, label, value, isLongText = false) => {
      worksheet.getCell(`A${rowNum}`).value = label;
      styleCell(worksheet.getCell(`A${rowNum}`), {
        bold: true,
        size: 9,
        fill: "FFF8FAFC",
        border: true,
        align: { vertical: 'middle', horizontal: 'left' }
      });
      
      worksheet.mergeCells(`B${rowNum}:F${rowNum}`);
      worksheet.getCell(`B${rowNum}`).value = value || "N/A";
      for (let c = 2; c <= 6; c++) {
        styleCell(worksheet.getRow(rowNum).getCell(c), {
          size: 9,
          border: true,
          align: { vertical: 'middle', horizontal: 'left', wrapText: true }
        });
      }
      worksheet.getRow(rowNum).height = isLongText ? 45 : 20;
    };

    drawRow(4, "Contratista", contract.user?.name);
    drawRow(5, "Identificación (CC)", contract.ccContratista);
    drawRow(6, "Informe de Actividades Nº", periodoActual);
    drawRow(7, "Periodo Evaluado", periodoTexto);
    drawRow(8, "Número del Contrato", contract.contractNumber);
    drawRow(9, "Objeto Contractual", contract.objeto, true);
    drawRow(10, "Plazo de Ejecución", contract.plazo);
    drawRow(11, "Valor Total del Contrato", contract.valorTotal);
    drawRow(12, "Valor Mensual (Periodo)", contract.valorMensual);
    drawRow(13, "Fecha de Suscripción", contract.fechaContrato);
    drawRow(14, "Fecha de Inicio", contract.fechaInicio);
    drawRow(15, "Fecha de Terminación", contract.fechaTerminacion);
    drawRow(16, "Proyecto", contract.proyecto);
    drawRow(17, "Supervisor(a)", contract.supervisor);
    drawRow(18, "Dependencia", contract.dependencia);
    drawRow(19, "Carpeta de Evidencias (Drive)", driveLink || "(No especificado)");

    // Header 2: Development
    worksheet.mergeCells("A21:F21");
    worksheet.getCell("A21").value = "2. DESARROLLO Y CUMPLIMIENTO DEL CONTRATO";
    styleCell(worksheet.getCell("A21"), {
      bold: true,
      size: 11,
      fill: "FF1E293B",
      color: "FFFFFFFF",
      align: { vertical: 'middle', horizontal: 'left' }
    });
    worksheet.getRow(21).height = 24;

    // Table Headers
    const headers = [
      "Alcance / Obligación",
      "Fecha",
      "Lugar",
      "Actividad Desarrollada",
      "Propósito (Narrativa)",
      "Observaciones"
    ];
    worksheet.getRow(23).values = headers;
    worksheet.getRow(23).height = 26;
    for (let c = 1; c <= 6; c++) {
      const cell = worksheet.getRow(23).getCell(c);
      styleCell(cell, {
        bold: true,
        size: 9.5,
        fill: "FFF1F5F9",
        border: true,
        align: { vertical: 'middle', horizontal: 'center' }
      });
    }

    let currentRow = 24;
    for (const scope of contract.scopes) {
      const scopeLabel = `Alcance ${scope.orderNumber}`;
      const obsText = scope.entries[0]?.observations || "N/A";
      
      if (scope.activities && scope.activities.length > 0) {
        for (const act of scope.activities) {
          const purposeEv = act.evidences?.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
          const purposeText = purposeEv?.content || act.evidences?.find(ev => ev.fileType === "text")?.content || "";
          const cleanPurpose = stripHtml(purposeText);
          
          worksheet.getRow(currentRow).values = [
            scopeLabel,
            act.date || "N/A",
            act.location || "N/A",
            act.title,
            cleanPurpose,
            obsText
          ];
          
          for (let c = 1; c <= 6; c++) {
            const cell = worksheet.getRow(currentRow).getCell(c);
            styleCell(cell, {
              size: 9,
              border: true,
              align: { vertical: 'middle', horizontal: c <= 3 ? 'center' : 'left', wrapText: true }
            });
          }
          worksheet.getRow(currentRow).height = 50;
          currentRow++;
        }
      } else {
        const narrativeText = stripHtml(scope.entries[0]?.narrativeText) || "Sin actividades registradas en el periodo.";
        worksheet.getRow(currentRow).values = [
          scopeLabel,
          "N/A",
          "N/A",
          "Desarrollo general de actividades del alcance",
          narrativeText,
          obsText
        ];
        
        for (let c = 1; c <= 6; c++) {
          const cell = worksheet.getRow(currentRow).getCell(c);
          styleCell(cell, {
            size: 9,
            border: true,
            align: { vertical: 'middle', horizontal: c <= 3 ? 'center' : 'left', wrapText: true }
          });
        }
        worksheet.getRow(currentRow).height = 60;
        currentRow++;
      }
    }

    // Leave space for signatures
    currentRow += 4; // Add blank rows. Now currentRow is the line row.

    const sigRow1 = currentRow;
    const sigRow2 = sigRow1 + 1;
    const sigRow3 = sigRow2 + 1;
    const sigRow4 = sigRow3 + 1;

    worksheet.getCell(`A${sigRow1}`).value = "____________________________________";
    worksheet.getCell(`D${sigRow1}`).value = "____________________________________";
    worksheet.getRow(sigRow1).height = 18;

    worksheet.getCell(`A${sigRow2}`).value = contract.user?.name || "N/A";
    worksheet.getCell(`D${sigRow2}`).value = contract.supervisor || "N/A";
    worksheet.getRow(sigRow2).height = 18;

    worksheet.getCell(`A${sigRow3}`).value = "Contratista";
    worksheet.getCell(`D${sigRow3}`).value = "Supervisor(a) de Contrato";
    worksheet.getRow(sigRow3).height = 18;

    worksheet.getCell(`A${sigRow4}`).value = contract.ccContratista ? `c.c. ${contract.ccContratista}` : "";
    worksheet.getRow(sigRow4).height = 18;

    styleCell(worksheet.getCell(`A${sigRow1}`), { size: 9, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow1}`), { size: 9, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`A${sigRow2}`), { bold: true, size: 9.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow2}`), { bold: true, size: 9.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`A${sigRow3}`), { size: 8.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow3}`), { size: 8.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`A${sigRow4}`), { size: 8.5, align: { horizontal: 'center', vertical: 'middle' } });

    worksheet.mergeCells(`A${sigRow1}:C${sigRow1}`);
    worksheet.mergeCells(`A${sigRow2}:C${sigRow2}`);
    worksheet.mergeCells(`A${sigRow3}:C${sigRow3}`);
    worksheet.mergeCells(`A${sigRow4}:C${sigRow4}`);

    worksheet.mergeCells(`D${sigRow1}:F${sigRow1}`);
    worksheet.mergeCells(`D${sigRow2}:F${sigRow2}`);
    worksheet.mergeCells(`D${sigRow3}:F${sigRow3}`);
    worksheet.mergeCells(`D${sigRow4}:F${sigRow4}`);

    const sigRow5 = sigRow4 + 4; // Leave 3 empty rows for next set of signatures
    const sigRow6 = sigRow5 + 1;
    const sigRow7 = sigRow6 + 1;

    worksheet.getCell(`A${sigRow5}`).value = "____________________________________";
    worksheet.getCell(`D${sigRow5}`).value = "____________________________________";
    worksheet.getRow(sigRow5).height = 18;

    worksheet.getCell(`A${sigRow6}`).value = contract.nameAbogado || "N/A";
    worksheet.getCell(`D${sigRow6}`).value = contract.nameCoordinador || "N/A";
    worksheet.getRow(sigRow6).height = 18;

    worksheet.getCell(`A${sigRow7}`).value = "Vo.Bo. ABOGADA CONTRATISTA";
    worksheet.getCell(`D${sigRow7}`).value = "Vo.Bo. COORDINADORA DE TURISMO";
    worksheet.getRow(sigRow7).height = 18;

    styleCell(worksheet.getCell(`A${sigRow5}`), { size: 9, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow5}`), { size: 9, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`A${sigRow6}`), { bold: true, size: 9.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow6}`), { bold: true, size: 9.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`A${sigRow7}`), { size: 8.5, align: { horizontal: 'center', vertical: 'middle' } });
    styleCell(worksheet.getCell(`D${sigRow7}`), { size: 8.5, align: { horizontal: 'center', vertical: 'middle' } });

    worksheet.mergeCells(`A${sigRow5}:C${sigRow5}`);
    worksheet.mergeCells(`A${sigRow6}:C${sigRow6}`);
    worksheet.mergeCells(`A${sigRow7}:C${sigRow7}`);

    worksheet.mergeCells(`D${sigRow5}:F${sigRow5}`);
    worksheet.mergeCells(`D${sigRow6}:F${sigRow6}`);
    worksheet.mergeCells(`D${sigRow7}:F${sigRow7}`);

    // Helper to embed images in specific Excel range
    const addExcelSignatureRange = (sigBase64, rangeStr) => {
      if (!sigBase64) return;
      const sigBuffer = getBufferFromBase64(sigBase64);
      if (!sigBuffer) return;
      try {
        const imageId = workbook.addImage({
          buffer: sigBuffer,
          extension: 'png',
        });
        worksheet.addImage(imageId, rangeStr);
      } catch (e) {
        console.error("Error rendering Excel signature image:", e);
      }
    };

    // Embed signatures if present (placing them 3 rows above the line)
    addExcelSignatureRange(contract.sigContratista, `A${sigRow1 - 3}:C${sigRow1 - 1}`);
    addExcelSignatureRange(contract.sigSupervisor, `D${sigRow1 - 3}:F${sigRow1 - 1}`);
    addExcelSignatureRange(contract.sigAbogado, `A${sigRow5 - 3}:C${sigRow5 - 1}`);
    addExcelSignatureRange(contract.sigCoordinador, `D${sigRow5 - 3}:F${sigRow5 - 1}`);

    // Write Workbook to Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `Informe_${cleanNumber}_${monthName}_${currentYear}.xlsx`;
    let filePathResult = `/reports/${fileName}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log(`[generate-excel] Subiendo informe Excel ${fileName} a Vercel Blob...`);
        const blob = await put(`reports/${fileName}`, buffer, {
          access: "public",
          addRandomSuffix: false,
        });
        filePathResult = blob.url;
        console.log(`[generate-excel] Excel subido exitosamente a Vercel Blob: ${filePathResult}`);
      } catch (blobError) {
        console.error("[generate-excel] Error al subir a Vercel Blob, guardando en disco local:", blobError);
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
          where: { contractId, month: currentMonth, year: currentYear, type: "excel" },
        }))?.id || "new-excel",
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
        type: "excel",
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
    console.error("Error generating Excel:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el informe en Excel" },
      { status: 500 }
    );
  }
}

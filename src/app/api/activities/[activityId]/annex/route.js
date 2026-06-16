import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } from "docx";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function getPeriodText(startDateStr, month, year) {
  if (!startDateStr) {
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `01 de ${months[month - 1]} al último de ${months[month - 1]}`;
  }
  
  const startDate = new Date(startDateStr);
  const startDay = startDate.getDate();
  const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  
  const pStartDay = String(startDay).padStart(2, "0");
  const pStartMonthName = monthNames[month - 1];
  
  const endMonthIdx = month % 12;
  const pEndMonthName = monthNames[endMonthIdx];
  
  let pEndDay = startDay - 1;
  if (pEndDay === 0) {
    const prevDate = new Date(year, month, 0);
    pEndDay = prevDate.getDate();
  }
  const pEndDayStr = String(pEndDay).padStart(2, "0");
  
  return `${pStartDay} de ${pStartMonthName} al ${pEndDayStr} de ${pEndMonthName}`;
}

// Helper: fetch image from URL (Vercel Blob or external) or read from local disk
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    // Check if it is a local upload path
    if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
      const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
      const localPath = path.join(process.cwd(), cleanUrl);
      const buffer = await readFile(localPath);
      return buffer;
    }
    
    // Otherwise fetch over HTTP
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`Could not fetch image from ${url}:`, err.message);
    return null;
  }
}

export async function GET(request, { params }) {
  const { activityId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fetch the activity with evidences, scope and contract
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        evidences: {
          orderBy: { uploadedAt: "asc" }
        },
        scope: {
          include: {
            contract: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!activity) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }

    if (activity.scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    const { scope, evidences } = activity;
    const { contract } = scope;
    const contractorName = contract.user?.name || "N/A";
    const contractNumberStr = contract.contractNumber || "N/A";
    const periodStr = getPeriodText(contract.startDate, activity.month, activity.year);

    // Determine annex number based on creation order in that month/scope
    const siblings = await prisma.activity.findMany({
      where: { scopeId: activity.scopeId, month: activity.month, year: activity.year },
      orderBy: { createdAt: "asc" }
    });
    const activityIndex = siblings.findIndex(act => act.id === activityId);
    const annexNumber = activityIndex !== -1 ? activityIndex + 1 : 1;

    // Define table borders
    const darkBorder = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
    const cellBorders = {
      top: darkBorder,
      bottom: darkBorder,
      left: darkBorder,
      right: darkBorder,
    };

    // Extract Purpose/Propósito (either from a text evidence named "Propósito" or similar, or fallback)
    const purposeEvidence = evidences.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
    const purposeText = purposeEvidence?.content || evidences.find(ev => ev.fileType === "text")?.content || "(Propósito no especificado)";

    // Strip HTML tags and entities like &nbsp; for Docx text run if the purpose was saved as Rich Text
    const cleanPurposeText = purposeText
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Create the header in plain text
    const headerParagraphs = [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: "CONTRATO Y/O CONVENIO N°: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: contractNumberStr, bold: true, font: "Calibri", size: 20 })
        ]
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: "RESPONSABLE: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: contractorName, bold: true, font: "Calibri", size: 20 })
        ]
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "FECHA: ", bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: periodStr, bold: true, font: "Calibri", size: 20 })
        ]
      }),
      new Paragraph({ spacing: { after: 150 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
        children: [
          new TextRun({ text: `ANEXO ${annexNumber}`, bold: true, font: "Calibri", size: 24 })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 150 },
        children: [
          new TextRun({ text: `ALCANCE ${scope.orderNumber}: `, bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: scope.title, bold: true, font: "Calibri", size: 20 })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `ACTIVIDAD ${scope.orderNumber}.${annexNumber}: `, bold: true, font: "Calibri", size: 20 }),
          new TextRun({ text: activity.title, bold: true, font: "Calibri", size: 20 })
        ]
      })
    ];

    // Content paragraphs rearranged as requested: Fecha -> Lugar -> Propósito -> Files
    const contentParagraphs = [
      new Paragraph({ spacing: { before: 200, after: 120 } }), // Spacer
      // Fecha
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "Fecha: ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: activity.date || "(No especificada)", font: "Calibri", size: 22 })
        ]
      }),
      // Lugar
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "Lugar: ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: activity.location || "(No especificado)", font: "Calibri", size: 22 })
        ]
      }),
      // Propósito (campo de texto)
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Propósito: ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: cleanPurposeText, font: "Calibri", size: 22 })
        ]
      }),
      // Registro fotográfico header
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Registro fotográfico:", bold: true, font: "Calibri", size: 22 })
        ]
      })
    ];

    // Embed images — fetch from local or Vercel Blob URLs, filter out non-images (like PDFs saved as image fileType)
    const visualEvidences = evidences.filter(ev => 
      ev.fileType === "image" && 
      !ev.fileName.toLowerCase().endsWith(".pdf")
    );
    
    for (const ev of visualEvidences) {
      if (!ev.filePath) continue;

      try {
        const imgBuffer = await fetchImageBuffer(ev.filePath);
        if (imgBuffer) {
          contentParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 200 },
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: {
                    width: 450,
                    height: 300
                  }
                })
              ]
            })
          );
        } else {
          contentParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[Evidencia no encontrada: ${ev.fileName}]`, font: "Calibri", size: 20, italics: true })
              ]
            })
          );
        }
      } catch (err) {
        console.error(`Error embedding image ${ev.filePath}:`, err);
      }
    }

    // Embed text from Word (.docx / .doc) files inline (already converted to text during upload)
    const docxEvidences = evidences.filter(ev => ev.fileName.toLowerCase().endsWith(".docx") || ev.fileName.toLowerCase().endsWith(".doc"));
    
    for (const ev of docxEvidences) {
      if (ev.fileType === "text" && ev.content && ev.content.trim().length > 0) {
        contentParagraphs.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: `${ev.fileName.replace(/\.docx?$/i, "")}:`, bold: true, font: "Calibri", size: 22 })
            ]
          })
        );

        // Strip html tags and split by lines
        const cleanText = ev.content
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        
        contentParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: cleanText, font: "Calibri", size: 20 })
            ]
          })
        );
      }
    }

    // Embed any other non-image and non-Word physical files as referenced attachments (include PDFs here)
    const otherEvidences = evidences.filter(ev => 
      (ev.fileType !== "image" || ev.fileName.toLowerCase().endsWith(".pdf")) && 
      ev.fileType !== "text" &&
      !ev.fileName.toLowerCase().endsWith(".docx") &&
      !ev.fileName.toLowerCase().endsWith(".doc")
    );
    if (otherEvidences.length > 0) {
      contentParagraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: "Soportes documentales adjuntos:", bold: true, font: "Calibri", size: 22 })
          ]
        })
      );

      for (const otherEv of otherEvidences) {
        contentParagraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: `${otherEv.fileName} (${otherEv.fileType.toUpperCase()})`, font: "Calibri", size: 20 })
            ]
          })
        );
      }
    }

    // Construct the Word document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
          },
          children: [...headerParagraphs, ...contentParagraphs]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    // Return the word file as a attachment response for download
    const cleanFileName = `Anexo_${scope.orderNumber}_${annexNumber}_${activity.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${cleanFileName}"`
      }
    });

  } catch (error) {
    console.error("Error generating annex docx:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el anexo" },
      { status: 500 }
    );
  }
}

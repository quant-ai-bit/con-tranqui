import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  PageBreak, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  ImageRun 
} from "docx";
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

// Helper to convert Base64 image to buffer for docx
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

// POST — Generate the full .docx report for a contract month in the official format
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

    // Fetch contract with all scopes, entries and activities
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

    // Helper to make Table 1 (Info) Row
    const makeInfoRow = (label, value) => {
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [new TextRun({ text: label, bold: true, font: "Calibri", size: 20 })]
              })
            ]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [new TextRun({ text: value || "", font: "Calibri", size: 20 })]
              })
            ]
          })
        ]
      });
    };

    // Helper to make Table 2 Header Cells
    const makeHeaderCell = (text, sizePercent) => {
      return new TableCell({
        width: { size: sizePercent, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 },
            children: [new TextRun({ text, bold: true, font: "Calibri", size: 20 })]
          })
        ]
      });
    };

    // Helper to make Table 3 Signature Cells
    const makeSignatureCell = (title, name, cc, sigBase64) => {
      const cellChildren = [];
      const sigBuffer = getBufferFromBase64(sigBase64);
      
      if (sigBuffer) {
        try {
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: sigBuffer,
                  transformation: {
                    width: 150,
                    height: 60
                  }
                })
              ]
            })
          );
        } catch (err) {
          console.error("Error embedding signature image:", err);
          cellChildren.push(new Paragraph({ spacing: { before: 400 } }));
        }
      } else {
        cellChildren.push(new Paragraph({ spacing: { before: 600 } }));
      }
      
      cellChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "____________________________________", font: "Calibri", size: 18 })]
        })
      );
      
      cellChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: name || "N/A", bold: true, font: "Calibri", size: 20 })]
        })
      );
      
      cellChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: title, font: "Calibri", size: 18 })]
        })
      );
      
      if (cc) {
        cellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `c.c. ${cc}`, font: "Calibri", size: 18 })]
          })
        );
      }
      
      return new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: cellChildren
      });
    };

    const makeEmptyCell = () => {
      return new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph("")]
      });
    };

    // --- BUILD SECTION 1: INFORMACIÓN GENERAL DEL CONTRATO ---
    const section1Paragraphs = [
      new Paragraph({
        spacing: { before: 200, after: 150 },
        children: [
          new TextRun({
            text: "1. INFORMACIÓN GENERAL DEL CONTRATO",
            bold: true,
            size: 24,
            font: "Calibri",
          }),
        ],
      }),
    ];

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeInfoRow("Contratista", `${contract.user?.name || "N/A"} ${contract.ccContratista ? `c.c. ${contract.ccContratista}` : ""}`),
        makeInfoRow("Informe de Actividades Nº", `${periodoActual || "N/A"}`),
        makeInfoRow("Periodo", `${periodoTexto || "N/A"}`),
        makeInfoRow("Número del Contrato", `${contract.contractNumber || "N/A"}`),
        makeInfoRow("Objeto:", `${contract.objeto || "N/A"}`),
        makeInfoRow("Plazo", `${contract.plazo || "N/A"}`),
        makeInfoRow("Valor Total del Contrato", `${contract.valorTotal || "N/A"}`),
        makeInfoRow("Valor del Periodo del Informe", `${contract.valorMensual || "N/A"}`),
        makeInfoRow("Fecha de Inicio", `${contract.startDate ? new Date(contract.startDate).toLocaleDateString("es-ES") : "N/A"}`),
        makeInfoRow("Fecha de Terminación", `${contract.endDate ? new Date(contract.endDate).toLocaleDateString("es-ES") : "N/A"}`),
        makeInfoRow("Proyecto", `${contract.proyecto || "N/A"}`),
        makeInfoRow("Supervisor", `${contract.supervisor || "N/A"}`),
        makeInfoRow("Dependencia", `${contract.dependencia || "N/A"}`),
      ]
    });

    section1Paragraphs.push(infoTable);

    // Unified evidence drive folder link
    section1Paragraphs.push(
      new Paragraph({
        spacing: { before: 250, after: 250 },
        children: [
          new TextRun({
            text: "El link con las evidencias unificadas reposa en la siguiente carpeta: ",
            bold: true,
            font: "Calibri",
            size: 20,
          }),
          new TextRun({
            text: driveLink || "(No especificado)",
            font: "Calibri",
            size: 20,
            underline: true,
          })
        ]
      })
    );

    // --- BUILD SECTION 2: DESARROLLO DEL CONTRATO ---
    const section2Paragraphs = [
      new Paragraph({
        spacing: { before: 200, after: 150 },
        children: [
          new TextRun({
            text: "2. DESARROLLO DEL CONTRATO",
            bold: true,
            size: 24,
            font: "Calibri",
          }),
        ],
      }),
    ];

    // Build Table 2 (Desarrollo) rows
    const table2Rows = [
      new TableRow({
        children: [
          makeHeaderCell("OBJETIVOS O ALCANCES DEL CONTRATO", 30),
          makeHeaderCell("ACTIVIDAD DESARROLLADA", 40),
          makeHeaderCell("REGISTRO", 15),
          makeHeaderCell("OBSERVACIONES", 15)
        ]
      })
    ];

    for (const scope of contract.scopes) {
      // Column 2 content: Activities
      const activityParagraphs = [];
      if (scope.activities && scope.activities.length > 0) {
        scope.activities.forEach((act, idx) => {
          const actNum = idx + 1;
          const purposeEv = act.evidences?.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
          const purposeText = purposeEv?.content || act.evidences?.find(ev => ev.fileType === "text")?.content || "";
          const cleanPurposeText = stripHtml(purposeText);

          activityParagraphs.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              alignment: AlignmentType.JUSTIFIED,
              children: [
                new TextRun({ text: `${actNum}. Fecha: `, bold: true, font: "Calibri", size: 18 }),
                new TextRun({ text: `${act.date || "N/A"}. `, font: "Calibri", size: 18 }),
                new TextRun({ text: `Acción realizada: `, bold: true, font: "Calibri", size: 18 }),
                new TextRun({ text: `${act.title}. `, font: "Calibri", size: 18 }),
                new TextRun({ text: `Propósito: `, bold: true, font: "Calibri", size: 18 }),
                new TextRun({ text: `${cleanPurposeText}`, font: "Calibri", size: 18 }),
              ]
            })
          );
        });
      } else {
        const narrative = stripHtml(scope.entries[0]?.narrativeText) || "Sin actividades registradas en el periodo.";
        activityParagraphs.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: narrative, font: "Calibri", size: 18 })]
          })
        );
      }

      // Column 3 content: Registro (Anexos)
      const registroParagraphs = [
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: `ANEXOS ${scope.orderNumber}:`, bold: true, font: "Calibri", size: 18 })]
        })
      ];
      if (scope.activities && scope.activities.length > 0) {
        scope.activities.forEach((act, idx) => {
          const actNum = idx + 1;
          registroParagraphs.push(
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: `Actividad ${scope.orderNumber}.${actNum}: ${act.title}`, font: "Calibri", size: 16 })]
            })
          );
        });
      } else {
        registroParagraphs.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: "N/A", font: "Calibri", size: 16 })]
          })
        );
      }

      // Column 4 content: Observaciones
      const obsText = scope.entries[0]?.observations || "";
      const observationsParagraphs = [
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: obsText, font: "Calibri", size: 18 })]
        })
      ];

      table2Rows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [new TextRun({ text: `${scope.orderNumber}. ${scope.title}`, font: "Calibri", size: 20 })]
                })
              ]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: activityParagraphs
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              children: registroParagraphs
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              children: observationsParagraphs
            })
          ]
        })
      );
    }

    const desarrolloTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: table2Rows
    });
    section2Paragraphs.push(desarrolloTable);

    // --- BUILD SECTION 3: SIGNATURES TABLE ---
    const signaturesParagraphs = [
      new Paragraph({ spacing: { before: 400 } })
    ];

    const signaturesTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        // Row 1: Contratista (Left) & Supervisor (Right)
        new TableRow({
          children: [
            makeSignatureCell("Contratista", contract.user?.name, contract.ccContratista, contract.sigContratista),
            makeSignatureCell("Supervisor(a)", contract.supervisor, null, contract.sigSupervisor)
          ]
        }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ spacing: { before: 300 } })] }), new TableCell({ children: [new Paragraph("")] })] }),
        // Row 2: Empty (Left) & Coordinadora (Right/Center)
        new TableRow({
          children: [
            makeEmptyCell(),
            makeSignatureCell("VB. COORDINADORA", contract.nameCoordinador, null, contract.sigCoordinador)
          ]
        }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ spacing: { before: 300 } })] }), new TableCell({ children: [new Paragraph("")] })] }),
        // Row 3: Abogada (Left) & Empty (Right)
        new TableRow({
          children: [
            makeSignatureCell("VB. ABOGADA CONTRATISTA", contract.nameAbogado, null, contract.sigAbogado),
            makeEmptyCell()
          ]
        })
      ]
    });

    signaturesParagraphs.push(signaturesTable);

    // --- COMPILE FULL DOCUMENT ---
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [
            ...section1Paragraphs,
            new Paragraph({ children: [new PageBreak()] }),
            ...section2Paragraphs,
            ...signaturesParagraphs
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    const cleanNumber = (contract.contractNumber || "contrato").replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `Informe_${cleanNumber}_${monthName}_${currentYear}.docx`;

    let filePathResult = `/reports/${fileName}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log(`Uploading Activities report ${fileName} to Vercel Blob...`);
        const blob = await put(`reports/${fileName}`, buffer, {
          access: "public",
          addRandomSuffix: false,
        });
        filePathResult = blob.url;
        console.log(`Uploaded Activities report to Vercel Blob successfully: ${filePathResult}`);
      } catch (blobError) {
        console.error("Error uploading to Vercel Blob, falling back to local file system:", blobError);
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
          where: { contractId, month: currentMonth, year: currentYear, type: "activities" },
        }))?.id || "new",
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
        type: "activities",
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
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el informe" },
      { status: 500 }
    );
  }
}

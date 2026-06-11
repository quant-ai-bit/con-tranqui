import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun
} from "docx";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// helper to format currency
const formatCurrency = (num) => {
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// helper to convert Base64 image to buffer for docx
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

// POST — Generate the supervision report .docx
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      contractId,
      month,
      year,
      supervisorName = "LIZETH CANTILLO RAMIREZ",
      recipientName = "CRISTIAN DAVID TORO CALLE",
      recipientTitle = "Secretario de Desarrollo Económico y Competitividad",
      totalValue = 20000000,
      paymentsToDate = 4000000,
      secopUrl = "https://www.secop.gov.co/CO1ContractsManagement/Tendering/SalesContractEdit/View?docUniqueIdentifier=CO1.SLCNTR.16845144",
      novedades = "Durante el presente período no se han presentado novedades o situaciones anormales que afecten el desarrollo del contrato.",
      startDateStr = "2 De febrero del 2026",
      endDateStr = "1 de Julio del 2026",
      plazoStr = "5 meses"
    } = body;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Fetch contract with all scopes and entries
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

    // Financial calculations and database field mapping
    const cleanNumber = (val) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9]/g, "");
      return parseFloat(clean) || 0;
    };

    const numericTotal = cleanNumber(contract.valorTotal) || parseFloat(totalValue) || 20000000;
    const numericPaid = cleanNumber(contract.pagosRealizados) || parseFloat(paymentsToDate) || 4000000;
    const numericRemaining = cleanNumber(contract.saldoPendiente) || (numericTotal - numericPaid);
    
    const executionPercentStr = contract.porcentajeEjecucion || `${Math.round((numericPaid / numericTotal) * 100)}%`;
    const remainingPercentStr = contract.porcentajePorEjecutar || `${100 - Math.round((numericPaid / numericTotal) * 100)}%`;

    const documentChildren = [];

    // Helper to make Table Row for info
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

    // --- Header ---
    documentChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `Pereira, ${monthName} del ${currentYear}`,
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: "Doctor(a)",
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: recipientName.toUpperCase(),
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: recipientTitle,
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Pereira",
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: `Asunto: Informe de ejecución del contrato No. ${contract.contractNumber || "N/A"} suscrito con ${contract.nombreContratista || contract.user?.name || "N/A"}`,
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Cordial saludo,",
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 300 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "En calidad de supervisor(a), presento informe de ejecución del contrato del asunto, con la siguiente información:",
            font: "Calibri", size: 22,
          }),
        ],
      })
    );

    // --- 1. ASPECTOS GENERALES DEL CONTRATO ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 150 },
        children: [
          new TextRun({
            text: "1. ASPECTOS GENERALES DEL CONTRATO",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      })
    );

    const table1 = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeInfoRow("Contrato:", `${contract.contractNumber || "N/A"} ${contract.fechaContrato ? `del ${contract.fechaContrato}` : "del 28 de enero de 2026"}`),
        makeInfoRow("Nombre e identificación del Contratista:", `${contract.nombreContratista || contract.user?.name || "N/A"} ${contract.ccContratista ? `c.c. ${contract.ccContratista}` : ""}`),
        makeInfoRow("Objeto:", contract.objeto || contract.title || "N/A"),
        makeInfoRow("Plazo:", contract.plazo || plazoStr),
        makeInfoRow("Fecha de inicio:", contract.fechaInicio || startDateStr),
        makeInfoRow("Fecha de terminación:", contract.fechaTerminacion || endDateStr),
      ]
    });
    documentChildren.push(table1);

    // --- 2. ESTADO FINANCIERO DEL CONTRATO ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 250, after: 150 },
        children: [
          new TextRun({
            text: "2. ESTADO FINANCIERO DEL CONTRATO",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      })
    );

    const table2 = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        makeInfoRow("Valor total del contrato o convenio", contract.valorTotal ? (contract.valorTotal.startsWith('$') ? contract.valorTotal : formatCurrency(cleanNumber(contract.valorTotal))) : formatCurrency(numericTotal)),
        makeInfoRow("Pagos realizados a la fecha:", contract.pagosRealizados ? (contract.pagosRealizados.startsWith('$') ? contract.pagosRealizados : formatCurrency(cleanNumber(contract.pagosRealizados))) : formatCurrency(numericPaid)),
        makeInfoRow("Saldo pendiente por ejecutar:", contract.saldoPendiente ? (contract.saldoPendiente.startsWith('$') ? contract.saldoPendiente : formatCurrency(cleanNumber(contract.saldoPendiente))) : formatCurrency(numericRemaining)),
        makeInfoRow("Porcentaje de Ejecución:", executionPercentStr),
        makeInfoRow("Porcentaje por Ejecutar:", remainingPercentStr),
        makeInfoRow("Estado de las Garantías:", contract.estadoGarantias || "n/a"),
        makeInfoRow("Matriz de Riesgos del Contrato", contract.matrizRiesgos || "Sin afectación."),
      ]
    });
    documentChildren.push(table2);

    // --- 3. ESTADO Y AVANCE DEL CONTRATO ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 250, after: 100 },
        children: [
          new TextRun({
            text: "3. ESTADO Y AVANCE DEL CONTRATO",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: `El Contrato No ${contract.contractNumber || "N/A"} ${contract.fechaContrato ? `del ${contract.fechaContrato}` : "del 28 de enero de 2026"} de Prestación de Servicios suscrito con ${contract.nombreContratista || contract.user?.name || "N/A"} se encuentra EN EJECUCIÓN, con un porcentaje de AVANCE:`,
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `AVANCE FINANCIERO: ${executionPercentStr}`,
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `AVANCE TÉCNICO: ${executionPercentStr}`,
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      })
    );

    // --- 4. NOVEDADES O SITUACIONES ANORMALES PRESENTADAS DURANTE EL DESARROLLO DEL CONTRATO ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "4. NOVEDADES O SITUACIONES ANORMALES PRESENTADAS DURANTE EL DESARROLLO DEL CONTRATO",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: novedades || "Durante el presente período no se han presentado novedades o situaciones anormales que afecten el desarrollo del contrato.",
            font: "Calibri", size: 22,
          }),
        ],
      })
    );

    // --- 5. RESUMEN DE ACTIVIDADES REALIZADAS POR LA SUPERVISIÓN O INTERVENTORÍA ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "5. RESUMEN DE ACTIVIDADES REALIZADAS POR LA SUPERVISIÓN O INTERVENTORÍA",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "a) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Seguimiento financiero y presupuestal del contrato.", font: "Calibri", size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "b) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Conformación, actualización y seguimiento del expediente electrónico con la documentación relacionada con la ejecución del contrato.", font: "Calibri", size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "c) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Verificación de la ejecución de las actividades específicas del contrato y seguimiento a la matriz de riesgos.", font: "Calibri", size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "d) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Verificación del pago al Sistema de Seguridad Social Integral realizado por el contratista, de conformidad con la normatividad vigente.", font: "Calibri", size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "e) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Verificación de la vigencia de la garantía exigida en el contrato. (Si aplica)", font: "Calibri", size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "f) ", bold: true, font: "Calibri", size: 22 }),
          new TextRun({ text: "Verificación y aprobación de los soportes necesarios para el pago.", font: "Calibri", size: 22 }),
        ],
      })
    );

    // --- 6. CUMPLIMIENTO DE OBLIGACIONES... ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "6. CUMPLIMIENTO DE OBLIGACIONES DEL CONTRATISTA RELACIONADAS CON EL PAGO DE SEGURIDAD SOCIAL INTEGRAL Y APORTES PARAFISCALES (Ley 100 de 1993 y sus decretos reglamentarios, en el artículo 50 de la Ley 789 de 2002, Leyes 828 de 2003, Modificada por el art. 36, Decreto Nacional 126 de 2010 en lo relativo a las multas, Ley 1122 de 2007, ley 1150 de 2007 y Decreto 1273 de 2018 y demás normas concordantes).",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "Se verificó el cumplimiento de las obligaciones del contratista con los sistemas de Seguridad Social Integral en salud, pensiones y riesgos laborales, información que se puede constatar en la planilla o certificación de pago correspondiente al periodo aquí relacionado.",
            font: "Calibri", size: 22,
          }),
        ],
      })
    );

    // --- 7. ACTIVIDADES DE TRATAMIENTO Y MONITOREO A LA MATRIZ DE RIESGO DEL CONTRATO ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "7. ACTIVIDADES DE TRATAMIENTO Y MONITOREO A LA MATRIZ DE RIESGO DEL CONTRATO",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "Se ha realizado el monitoreo por parte de la supervisión, de acuerdo con el tratamiento y/o control de los riesgos establecido en la matriz de los estudios previos del contrato, evidenciándose que no hay materialización de los mismos. Lo anterior se verifica a través del informe mensual de actividades del contratista de acuerdo con las obligaciones específicas pactadas, las cuales han tenido satisfactorio cumplimiento a la fecha.",
            font: "Calibri", size: 22,
          }),
        ],
      })
    );

    // --- 8. UBICACIÓN DE SOPORTES ---
    documentChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "8. UBICACIÓN DE SOPORTES",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "Los soportes de la ejecución del contrato, así como sus entregables se encuentran ubicados en:",
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: "Enlace del contrato del SECOP II, donde se encuentran cargadas las evidencias de la ejecución.",
            font: "Calibri", size: 20, italics: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: secopUrl || "________________________________________________________________________________",
            color: secopUrl ? "0000FF" : "000000",
            underline: true,
            font: "Calibri",
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 200, after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: "De acuerdo con lo expuesto anteriormente, se evidencia que a la fecha el objeto y alcance del contrato se han cumplido a satisfacción, de igual manera ha cumplido con su obligación de aportes al sistema de seguridad social.",
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: "NOTA: LEY DE TRANSPARENCIA Y DEL DERECHO DE ACCESO A LA INFORMACIÓN PÚBLICA NACIONAL: Todas las actuaciones que se deriven del presente documento se harán con sujeción a lo dispuesto en la Ley 1712 de 2014.",
            font: "Calibri", size: 18, italics: true,
          }),
        ],
      })
    );

    // --- Page Break & Alcances ---
    documentChildren.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Atentamente,",
            font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: "ALCANCES:",
            bold: true, font: "Calibri", size: 24,
          }),
        ],
      })
    );

    for (const scope of contract.scopes) {
      const entry = scope.entries[0];
      const narrative = entry?.narrativeText || "(Sin actividades registradas para este periodo)";

      documentChildren.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: `${scope.orderNumber}. ${scope.title}`,
              bold: true, font: "Calibri", size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: narrative,
              font: "Calibri", size: 22,
            }),
          ],
        })
      );
    }

    // --- Supervisor Signature at the end ---
    const sigBuffer = getBufferFromBase64(contract.sigSupervisor);
    if (sigBuffer) {
      try {
        documentChildren.push(
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [
              new ImageRun({
                data: sigBuffer,
                transformation: {
                  width: 150,
                  height: 60,
                },
              }),
            ],
          })
        );
      } catch (err) {
        console.error("Error embedding supervisor signature image:", err);
        documentChildren.push(new Paragraph({ spacing: { before: 600 } }));
      }
    } else {
      documentChildren.push(new Paragraph({ spacing: { before: 800 } }));
    }

    documentChildren.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: supervisorName.toUpperCase(),
            bold: true, font: "Calibri", size: 22,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: "SUPERVISOR",
            bold: true, font: "Calibri", size: 20,
          }),
        ],
      })
    );

    // Build the document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: documentChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    // Save to filesystem
    const reportsDir = path.join(process.cwd(), "reports");
    await mkdir(reportsDir, { recursive: true });

    const fileName = `Informe_Supervision_${contract.contractNumber || "contrato"}_${monthName}_${currentYear}.docx`;
    const filePath = path.join(reportsDir, fileName);
    await writeFile(filePath, buffer);

    // Save report record to DB
    const report = await prisma.report.upsert({
      where: {
        id: (await prisma.report.findFirst({
          where: { contractId, month: currentMonth, year: currentYear, type: "supervision" },
        }))?.id || "new",
      },
      update: {
        status: "generated",
        generatedAt: new Date(),
        filePath: `/reports/${fileName}`,
      },
      create: {
        contractId,
        month: currentMonth,
        year: currentYear,
        type: "supervision",
        status: "generated",
        generatedAt: new Date(),
        filePath: `/reports/${fileName}`,
      },
    });

    return NextResponse.json({
      success: true,
      report,
      fileName,
      downloadUrl: `/api/reports/download?file=${encodeURIComponent(fileName)}`,
    });
  } catch (error) {
    console.error("Error generating supervision report:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el informe de supervisión" },
      { status: 500 }
    );
  }
}

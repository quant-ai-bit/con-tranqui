import { NextResponse } from "next/server";
import ai, { generateContentWithFallback } from "@/lib/gemini";

export const runtime = "nodejs";

const EXTRACTION_PROMPT = `Eres un experto en contratos de prestación de servicios con entidades gubernamentales en Colombia.

El usuario te va a proporcionar el texto de un documento. Este documento puede ser:
- Un contrato legal completo
- Un informe de actividades mensual  
- Un documento de obligaciones específicas
- Cualquier otro documento donde se describan las obligaciones del contratista

Tu tarea es:
1. Extraer una lista clara y completa de las "Obligaciones Específicas" o "Alcances" del contrato.
2. Para cada obligación, deducir lógicamente qué tipo de evidencias (fotos, actas, bases de datos, informes, etc.) se necesitan para demostrar su cumplimiento.
3. Extraer la información básica del contrato si se encuentra en el texto.

RESPONDER ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "contractTitle": "Título o descripción corta del contrato",
  "contractNumber": "Número del contrato si se menciona (ej. '3227'), o null",
  "entity": "Nombre de la entidad contratante (ej. 'Secretaría de Desarrollo Económico y Competitividad'), o null",
  "fechaContrato": "Fecha de suscripción o firma del contrato (ej. '28 de enero de 2026'), o null",
  "nombreContratista": "Nombre completo del contratista (ej. 'HAMILTON EDUARDO TELLO VILLA'), o null",
  "ccContratista": "Documento de identificación o cédula del contratista (solo el número si es posible), o null",
  "objeto": "Texto completo del objeto del contrato, o null",
  "plazo": "Plazo de duración del contrato (ej. '5 meses'), o null",
  "fechaInicio": "Fecha de inicio del contrato (ej. '2 de febrero del 2026'), o null",
  "fechaTerminacion": "Fecha de terminación del contrato (ej. '1 de julio del 2026'), o null",
  "valorTotal": "Valor total del contrato o convenio en pesos (ej. '$20.000.000'), o null",
  "pagosRealizados": "Pagos realizados a la fecha en pesos (ej. '$4.000.000'), o null",
  "saldoPendiente": "Saldo pendiente por ejecutar en pesos (ej. '$16.000.000'), o null",
  "porcentajeEjecucion": "Porcentaje de ejecución actual (ej. '20%'), o null",
  "porcentajePorEjecutar": "Porcentaje por ejecutar restante (ej. '80%'), o null",
  "estadoGarantias": "Estado de las garantías (ej. 'n/a' o 'Aprobada'), o null",
  "matrizRiesgos": "Monitoreo o estado de matriz de riesgos (ej. 'Sin afectación'), o null",
  "scopes": [
    {
      "orderNumber": 1,
      "title": "Texto completo de la obligación/alcance",
      "description": "Breve resumen de qué implica esta obligación",
      "requiredEvidences": [
        "Tipo de evidencia 1",
        "Tipo de evidencia 2"
      ]
    }
  ]
}

REGLAS:
- Extrae TODAS las obligaciones específicas, no resumas ni combines.
- Si el documento tiene obligaciones generales y específicas, prioriza las ESPECÍFICAS.
- Las evidencias deben ser realistas y coherentes con cada obligación.
- El JSON debe ser válido y parseable directamente.
- No incluyas texto adicional fuera del JSON.`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const blobUrl = formData.get("blobUrl");

    if (!file && !blobUrl) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo o URL de blob." },
        { status: 400 }
      );
    }

    let fileName = "";
    let fileBuffer;

    if (blobUrl) {
      console.log(`[extract-scopes] Descargando archivo desde Vercel Blob: ${blobUrl}`);
      const res = await fetch(blobUrl);
      if (!res.ok) {
        throw new Error(`Error al descargar el archivo desde Vercel Blob: ${res.statusText}`);
      }
      fileBuffer = Buffer.from(await res.arrayBuffer());
      const urlParts = blobUrl.split("/");
      fileName = urlParts[urlParts.length - 1];
    } else {
      fileName = file.name;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    }

    let text = "";

    if (fileName.endsWith(".pdf")) {
      if (fileBuffer.length < 100) {
        return NextResponse.json(
          { error: "El archivo PDF parece estar vacío o corrupto." },
          { status: 400 }
        );
      }
      try {
        console.log(`[extract-scopes] Intentando extraer texto del PDF '${fileName}' de forma local...`);
        // Dynamic import of pdf-parse to avoid issues in edge runtime
        const pdfParse = (await import("pdf-parse")).default;
        const result = await pdfParse(fileBuffer);
        text = result.text || "";
        console.log(`[extract-scopes] Texto extraído localmente. Caracteres: ${text.length}`);
      } catch (err) {
        console.warn(`[extract-scopes] Error al extraer texto localmente de PDF: ${err.message}. Se intentará enviar crudo a Gemini.`);
      }
    } else if (fileName.endsWith(".docx")) {
      try {
        console.log(`[extract-scopes] Intentando extraer texto del DOCX '${fileName}' de forma local...`);
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(fileBuffer);
        const docXml = await zip.file("word/document.xml").async("text");
        
        const paragraphMatches = docXml.match(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g);
        if (paragraphMatches) {
          const paragraphs = [];
          for (const p of paragraphMatches) {
            const textMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
            if (textMatches) {
              const pText = textMatches.map(m => {
                const content = m.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, "");
                return content
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
              }).join("");
              paragraphs.push(pText);
            }
          }
          text = paragraphs.join("\n");
        }
        console.log(`[extract-scopes] Texto extraído localmente del DOCX. Caracteres: ${text.length}`);
      } catch (err) {
        console.warn(`[extract-scopes] Error al extraer texto localmente de DOCX: ${err.message}.`);
      }
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      text = fileBuffer.toString("utf-8");
    } else {
      // For other formats, send as base64 to Gemini directly (or keep empty)
      text = "";
    }

    const hasAi = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true" || process.env.GOOGLE_CLOUD_PROJECT;
    if (!hasAi) {
      // Return mock data for development without API key
      return NextResponse.json({
        contractTitle: "Contrato de Prestación de Servicios - Turismo",
        contractNumber: "3227",
        entity: "Secretaría de Desarrollo Económico y Competitividad",
        fechaContrato: "28 de enero de 2026",
        nombreContratista: "HAMILTON EDUARDO TELLO VILLA",
        ccContratista: "1.234.567.890",
        objeto: "PRESTACIÓN DE SERVICIOS PROFESIONALES EN LA SECRETARÍA DE DESARROLLO ECONÓMICO Y COMPETITIVIDAD, PARA EL FORTALECIMIENTO DE LOS PRESTADORES DE SERVICIO EN EL SECTOR TURISMO ACORDE A LO ESTABLECIDO EN LAS METAS DEL PROGRAMAMA PEREIRA TURÍSTICA DEL MUNICIPIO.",
        plazo: "5 meses",
        fechaInicio: "2 de febrero del 2026",
        fechaTerminacion: "1 de julio del 2026",
        valorTotal: "$20.000.000",
        pagosRealizados: "$4.000.000",
        saldoPendiente: "$16.000.000",
        porcentajeEjecucion: "20%",
        porcentajePorEjecutar: "80%",
        estadoGarantias: "n/a",
        matrizRiesgos: "Sin afectación.",
        scopes: [
          {
            orderNumber: 1,
            title: "Realizar gestión público privada en las rutas turísticas asignadas por la dirección de turismo",
            description: "Gestión de articulación entre sector público y privado en corredores turísticos",
            requiredEvidences: ["Acta de reunión firmada", "Registro fotográfico", "Listado de asistencia"]
          }
        ],
        _mock: true
      });
    }

    // Preparar el prompt
    let promptParts = [{ text: EXTRACTION_PROMPT + "\n\nREGLA ADICIONAL: Asegúrate de usar una ortografía y gramática en español impecables, incluyendo tildes/acentos correctamente en todas las palabras que lo requieran (ej. 'acción', 'turística', 'identificación', 'ejecución', 'obligación')." }];
    
    // Si es un PDF y no se pudo extraer texto sustancial, lo enviamos como archivo base64 a Gemini para que use su OCR visual.
    // Para archivos DOCX no lo enviamos como binario porque Gemini API no soporta el MIME type de DOCX nativamente en inlineData.
    const isScannedOrBinary = (!text || text.trim().length < 1500) && !fileName.endsWith(".docx");
    
    if (isScannedOrBinary && fileName.endsWith(".pdf")) {
      console.log(`[extract-scopes] Archivo '${fileName}' sin texto indexable sustancial (caracteres: ${text ? text.trim().length : 0}). Enviando en base64 a Gemini...`);
      promptParts.push({
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType: "application/pdf"
        }
      });
      promptParts.push({ text: `\n\nAnaliza este documento que te he adjuntado.` });
    } else {
      console.log(`[extract-scopes] Enviando texto limpio del documento a Gemini...`);
      promptParts.push({ text: `\n\nDOCUMENTO A ANALIZAR (archivo: ${fileName || "documento"}):\n\n${text}` });
    }

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: promptParts
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const responseText = response.text;
    console.log("=== GEMINI RESPONSE NATIVE ===");
    console.log(responseText);
    console.log("==============================");
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("La IA no retornó un JSON válido");
      }
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Error extracting scopes:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el documento" },
      { status: 500 }
    );
  }
}

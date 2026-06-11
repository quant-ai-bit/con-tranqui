import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ai, { generateContentWithFallback } from "@/lib/gemini";
import { put, del } from "@vercel/blob";

export const runtime = "nodejs";

function cleanHtmlText(html) {
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


// POST — Upload evidence files or text for a scope
export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    const month = parseInt(formData.get("month")) || new Date().getMonth() + 1;
    const year = parseInt(formData.get("year")) || new Date().getFullYear();
    const requiredEvidenceId = formData.get("requiredEvidenceId");
    const activityId = formData.get("activityId");
    
    // For text/table inputs
    const isText = formData.get("isText") === "true";
    const textContent = formData.get("content");
    const textFileName = formData.get("fileName") || "Texto ingresado";

    if (!isText && (!files || files.length === 0)) {
      return NextResponse.json({ error: "No se recibieron archivos ni contenido" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verify scope exists and belongs to user
    const scope = await prisma.scope.findUnique({ 
      where: { id },
      include: { contract: true }
    });
    
    if (!scope || scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Alcance no encontrado o prohibido" }, { status: 403 });
    }

    const savedFiles = [];

    // 1. Manejar texto (rich text / markdown) con mejora IA
    if (isText && textContent) {
      // Fetch activity and scope details for AI context
      let activityTitle = "";
      if (activityId) {
        const act = await prisma.activity.findUnique({ where: { id: activityId } });
        if (act) activityTitle = act.title;
      }
      
      const scopeTitle = scope.title;
      
      // Prompt for Gemini content enhancement
      const promptText = `Eres un redactor experto en informes de actividades para contratos de prestación de servicios con entidades gubernamentales en Colombia.
Tu tarea es analizar y mejorar la redacción de una evidencia textual redactada por un contratista para que suene formal, profesional, técnica y refleje de manera clara el cumplimiento de la obligación/alcance del contrato y de la actividad específica.

INFORMACIÓN DEL CONTEXTO:
- Obligación/Alcance del Contrato: "${scopeTitle}"
- Actividad Registrada: "${activityTitle}"
- Texto borrador redactado por el contratista: "${cleanHtmlText(textContent)}"

INSTRUCCIONES DE REDACCIÓN:
- Redacta una versión mejorada en español profesional y formal.
- Eleva el lenguaje técnico y la formalidad (por ejemplo, en lugar de decir "hice una reunión", di "se llevó a cabo una mesa de trabajo de articulación...").
- Enfoca la redacción en términos de cumplimiento del objeto contractual.
- Mantén estrictamente los hechos reales del borrador original (no inventes actividades, fechas ni nombres de personas que no existan en el texto).
- Asegura una ortografía y gramática en español impecables, incluyendo obligatoriamente tildes/acentos correctamente en todas las palabras que lo requieran (ej. 'acción', 'turística', 'identificación', 'ejecución', 'obligación', 'reunión', 'planificación', 'coordinación').
- IMPORTANTE: Devuelve únicamente el texto plano de la versión mejorada, sin etiquetas HTML (como <p>, <strong>, etc.) ni formato markdown (como ** o *), sin introducciones, saludos ni explicaciones adicionales.`;

      let aiEnhancedText = "";
      try {
        const hasAi = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true" || process.env.GOOGLE_CLOUD_PROJECT;
        if (hasAi) {
          const response = await generateContentWithFallback({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [{ text: promptText }]
              }
            ],
            config: {
              temperature: 0.3,
            }
          });
          aiEnhancedText = `<p>${cleanHtmlText(response.text.trim())}</p>`;
        } else {
          // Fallback if no API key is available
          aiEnhancedText = `<p>${cleanHtmlText(textContent)}</p><p><em>[Versión mejorada por IA (MOCK): Se elevó la redacción técnica para demostrar cumplimiento de la actividad y la obligación contractual.]</em></p>`;
        }
      } catch (err) {
        console.error("Error generating AI content:", err);
        aiEnhancedText = textContent; // fallback
      }

      const textEvidence = await prisma.evidence.create({
        data: {
          fileName: textFileName,
          fileType: "text",
          filePath: "",
          content: textContent,
          originalContent: textContent,
          aiContent: aiEnhancedText,
          selectedText: "original",
          month,
          year,
          scopeId: id,
          requiredEvidenceId: requiredEvidenceId || null,
          activityId: activityId || null,
        },
      });
      savedFiles.push(textEvidence);
    }

    // 2. Manejar archivos físicos — subir a Vercel Blob
    if (files && files.length > 0) {
      for (const file of files) {
        if (!(file instanceof File)) continue;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const blobPath = `evidence/${id}/${year}-${String(month).padStart(2, "0")}/${safeName}`;

        // Upload to Vercel Blob
        const blob = await put(blobPath, buffer, {
          access: "public",
          addRandomSuffix: false,
        });

        // Determine file type
        let fileType = "document";
        if (file.type.startsWith("image/")) fileType = "image";
        else if (file.type.startsWith("audio/")) fileType = "audio";
        else if (file.type === "application/pdf" || ext === "pdf") fileType = "image"; // PDFs se muestran como documentos embebidos

        // Handle DOCX text extraction
        let isDocxConvertedToText = false;
        let docxHtmlContent = "";
        let docxAiEnhancedText = "";

        if (ext === "docx") {
          // For DOCX files, we can't run Python on Vercel.
          // We'll store the file as-is and extract text client-side or skip extraction.
          // The file is already uploaded to Blob above.
          fileType = "document";
        }

        // Save to database with Blob URL
        const evidence = await prisma.evidence.create({
          data: {
            fileName: file.name,
            fileType,
            filePath: blob.url, // Vercel Blob public URL
            fileSize: buffer.length,
            content: isDocxConvertedToText ? docxHtmlContent : null,
            originalContent: isDocxConvertedToText ? docxHtmlContent : null,
            aiContent: isDocxConvertedToText ? docxAiEnhancedText : null,
            selectedText: isDocxConvertedToText ? "original" : "original",
            month,
            year,
            scopeId: id,
            requiredEvidenceId: requiredEvidenceId || null,
            activityId: activityId || null,
          },
        });

        savedFiles.push(evidence);
      }
    }

    return NextResponse.json({
      success: true,
      count: savedFiles.length,
      evidences: savedFiles,
    });
  } catch (error) {
    console.error("Error uploading evidence:", error);
    return NextResponse.json(
      { error: error.message || "Error al subir evidencias" },
      { status: 500 }
    );
  }
}

// DELETE — Remove an evidence file
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const evidenceId = searchParams.get("evidenceId");

  if (!evidenceId) {
    return NextResponse.json({ error: "ID de evidencia requerido" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { scope: { include: { contract: true } } }
    });

    if (!evidence || evidence.scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Evidencia no encontrada o prohibido" }, { status: 403 });
    }

    // Delete from Vercel Blob if it has a URL
    if (evidence.filePath && evidence.filePath.startsWith("https://")) {
      try {
        await del(evidence.filePath);
      } catch (blobErr) {
        console.warn("Could not delete blob:", blobErr.message);
      }
    }

    await prisma.evidence.delete({ where: { id: evidenceId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting evidence:", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar" },
      { status: 500 }
    );
  }
}

// PUT — Update evidence text content and metadata (including toggling AI version)
export async function PUT(request, { params }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { evidenceId, content, fileName, selectedText } = body;

    if (!evidenceId) {
      return NextResponse.json({ error: "ID de evidencia requerido" }, { status: 400 });
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { scope: { include: { contract: true } } }
    });

    if (!evidence || evidence.scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Evidencia no encontrada o prohibida" }, { status: 403 });
    }

    if (evidence.fileType !== "text") {
      return NextResponse.json({ error: "Solo se pueden editar evidencias de tipo texto" }, { status: 400 });
    }

    const updateData = {};
    if (fileName !== undefined) updateData.fileName = fileName;

    if (selectedText !== undefined) {
      if (selectedText !== "original" && selectedText !== "ai") {
        return NextResponse.json({ error: "Versión de texto no válida" }, { status: 400 });
      }
      updateData.selectedText = selectedText;
      updateData.content = (selectedText === "ai") ? evidence.aiContent : evidence.originalContent;
    } else if (content !== undefined) {
      // If user edits text manually, save it as original Content and reset select toggle to original
      updateData.content = content;
      updateData.originalContent = content;
      updateData.selectedText = "original";
    }

    const updated = await prisma.evidence.update({
      where: { id: evidenceId },
      data: updateData
    });

    return NextResponse.json({ success: true, evidence: updated });
  } catch (error) {
    console.error("Error updating evidence:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar la evidencia" },
      { status: 500 }
    );
  }
}

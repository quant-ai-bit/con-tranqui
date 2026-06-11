import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import ai, { generateContentWithFallback } from "@/lib/gemini";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const NARRATIVE_PROMPT = `Eres un experto en redacción de informes mensuales de contratos de prestación de servicios con entidades gubernamentales en Colombia.

Tu tarea es generar el texto narrativo para un alcance específico de un informe de actividades mensual.

CONTEXTO:
- Obligación contractual: {SCOPE_TITLE}
- Mes del informe: {MONTH}/{YEAR}
- Descripción del contratista de lo que hizo: {DESCRIPTION}

INSTRUCCIONES:
1. Escribe en tercera persona formal (ej: "El contratista realizó...", "Se llevó a cabo...").
2. Usa un tono institucional, profesional y preciso.
3. Incluye la fecha del periodo (mes/año).
4. Estructura el texto con: Actividad realizada → Propósito → Resultado logrado.
5. El texto debe ser un párrafo de 100-200 palabras.
6. NO inventes datos específicos que no estén en la descripción.
7. Si la descripción es vaga, genera un texto general coherente con la obligación.

Responde ÚNICAMENTE con el texto narrativo, sin títulos ni encabezados.`;

const NARRATIVE_FROM_ACTIVITIES_PROMPT = `Eres un experto en redacción de informes mensuales y de supervisión de contratos de prestación de servicios con entidades gubernamentales en Colombia.

Tu tarea es generar la narrativa formal de cumplimiento de un alcance/obligación contractual específica, basándote únicamente en las actividades reales registradas en el periodo.

INFORMACIÓN DEL CONTEXTO:
- Obligación contractual: {SCOPE_TITLE}
- Mes del informe: {MONTH}/{YEAR}
- Actividades registradas por el contratista:
{ACTIVITIES}

INSTRUCCIONES DE REDACCIÓN:
1. Escribe en tercera persona formal (ej: "El contratista realizó...", "Se llevó a cabo...").
2. Usa un tono institucional, profesional y preciso.
3. Genera un único párrafo fluido (entre 100 y 180 palabras). NO uses viñetas ni listas numeradas en tu respuesta.
4. Conecta las actividades, sus propósitos y resultados de manera cohesionada y elegante.
5. Mantén estrictamente la veracidad de los hechos y datos reales proporcionados (no inventes actividades, nombres de personas o fechas).
6. Asegura una ortografía y gramática en español impecables, incluyendo obligatoriamente todas las tildes correspondientes.

Responde ÚNICAMENTE con el párrafo de texto narrativo final, sin introducciones, explicaciones, títulos ni encabezados.`;

// POST - Generate narrative text for a scope
export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { description, mode, month, year } = body;

    // Fetch the scope from DB
    const scope = await prisma.scope.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!scope) {
      return NextResponse.json({ error: "Alcance no encontrado" }, { status: 404 });
    }

    if (scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Fetch registered activities for this scope, month, and year
    const activities = await prisma.activity.findMany({
      where: {
        scopeId: id,
        month: currentMonth,
        year: currentYear,
      },
      include: {
        evidences: true,
      },
    });

    let narrativeText = "";

    const hasAi = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true" || process.env.GOOGLE_CLOUD_PROJECT;

    if (activities && activities.length > 0) {
      // Compile activities to text
      const compiledActivitiesText = activities.map((act, idx) => {
        const purposeEv = act.evidences?.find(ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito")));
        const purposeText = purposeEv?.content || act.evidences?.find(ev => ev.fileType === "text")?.content || "";
        
        const cleanPurpose = purposeText
          .replace(/&nbsp;/g, " ")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();

        return `- Actividad ${idx + 1}: ${act.title}. Fecha: ${act.date || "N/A"}. Lugar: ${act.location || "N/A"}. Propósito: ${cleanPurpose || "N/A"}`;
      }).join("\n");

      if (!hasAi) {
        // Mock generation based on activities
        narrativeText = `Durante el mes de ${getMonthName(currentMonth)} de ${currentYear}, el contratista dio cumplimiento a la obligación "${scope.title}" a través del desarrollo de las siguientes actividades: ${activities.map(a => `${a.title.toLowerCase()} (el día ${a.date || 'N/A'})`).join(', y ')}. Se cumplió satisfactoriamente con los propósitos de articulación y gestión definidos en el corredor turístico asignado.`;
      } else {
        const prompt = NARRATIVE_FROM_ACTIVITIES_PROMPT
          .replace("{SCOPE_TITLE}", scope.title)
          .replace("{MONTH}", String(currentMonth))
          .replace("{YEAR}", String(currentYear))
          .replace("{ACTIVITIES}", compiledActivitiesText);

        const response = await generateContentWithFallback({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { temperature: 0.3 },
        });

        narrativeText = response.text.trim();
      }
    } else {
      // If no activities are registered, use description or fallback
      if (!hasAi) {
        // Mock generation for development
        narrativeText = `Durante el mes de ${getMonthName(currentMonth)} de ${currentYear}, el contratista realizó actividades orientadas al cumplimiento de la obligación: "${scope.title}". ${description ? `Específicamente, ${description.toLowerCase()}. ` : ""}Se llevaron a cabo las gestiones correspondientes en coordinación con la ${scope.contract.entity || "entidad contratante"}, logrando avances significativos en el cumplimiento de los objetivos planteados para el periodo. Las evidencias de las actividades realizadas se adjuntan al presente informe como soporte de cumplimiento.`;
      } else {
        const prompt = NARRATIVE_PROMPT
          .replace("{SCOPE_TITLE}", scope.title)
          .replace("{MONTH}", String(currentMonth))
          .replace("{YEAR}", String(currentYear))
          .replace("{DESCRIPTION}", description || "No se proporcionó descripción detallada");

        const response = await generateContentWithFallback({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { temperature: 0.4 },
        });

        narrativeText = response.text.trim();
      }
    }

    // Upsert the scope entry for this month
    const entry = await prisma.scopeEntry.upsert({
      where: {
        scopeId_month_year: {
          scopeId: id,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        narrativeText,
        status: "generated",
        aiMode: mode || "semi",
      },
      create: {
        scopeId: id,
        month: currentMonth,
        year: currentYear,
        narrativeText,
        status: "generated",
        aiMode: mode || "semi",
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      narrativeText,
    });
  } catch (error) {
    console.error("Error generating narrative:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el texto" },
      { status: 500 }
    );
  }
}

// GET - Get the current scope entry for a month
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
  const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const scope = await prisma.scope.findUnique({
      where: { id },
      include: {
        contract: true,
        requiredEvidences: true,
        entries: {
          where: { month, year },
        },
        evidences: {
          where: { month, year },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!scope) {
      return NextResponse.json({ error: "Alcance no encontrado" }, { status: 404 });
    }

    if (scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    return NextResponse.json({
      scope,
      entry: scope.entries[0] || null,
      evidences: scope.evidences,
    });
  } catch (error) {
    console.error("Error fetching scope:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener el alcance" },
      { status: 500 }
    );
  }
}

// PUT - Update narrative text manually
export async function PUT(request, { params }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const scope = await prisma.scope.findUnique({
      where: { id },
      include: { contract: true },
    });

    if (!scope || scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido o no encontrado" }, { status: 403 });
    }

    const body = await request.json();
    const { narrativeText, status, month, year, observations } = body;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const updateData = {
      status: status || "reviewed",
    };
    if (narrativeText !== undefined) updateData.narrativeText = narrativeText;
    if (observations !== undefined) updateData.observations = observations;

    const entry = await prisma.scopeEntry.upsert({
      where: {
        scopeId_month_year: {
          scopeId: id,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: updateData,
      create: {
        scopeId: id,
        month: currentMonth,
        year: currentYear,
        narrativeText: narrativeText || "",
        status: status || "reviewed",
        observations: observations || "",
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Error updating scope entry:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar" },
      { status: 500 }
    );
  }
}

function getMonthName(month) {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return months[month - 1] || "mayo";
}

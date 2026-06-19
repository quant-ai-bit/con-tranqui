import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateContentWithFallback } from "@/lib/gemini";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres "Tu Tranqui", el copiloto de Inteligencia Artificial para contratistas del Estado en Colombia (Alcaldías y Gobernaciones).
Tu objetivo es guiar, asesorar y ayudar al contratista a organizar sus evidencias y bitácora de actividades diarias y semanales de forma eficiente y sin estrés.

Cuentas con acceso completo al contexto del contrato y alcances del usuario.

REGLAS DE COMPORTAMIENTO:
1. Sé empático, profesional, claro y muy práctico en español.
2. Analiza el objeto contractual y las obligaciones/alcances activos.
3. Sugiere de forma proactiva actividades específicas (de campo, técnicas, de coordinación, elaboración de informes, etc.) que sirvan como soporte real para cumplir con cada una de las obligaciones específicas.
4. **REGLA CRÍTICA DE ACCIÓN RÁPIDA:** Cuando sugieras registrar una actividad al usuario, debes incluir en tu respuesta un enlace con el formato especial exacto:
   [Crear Actividad: "Título sugerido de la actividad" | Alcance: X]
   Donde:
   - "Título sugerido de la actividad" es una descripción corta (menos de 60 caracteres) de la acción (ej. "Reunión de articulación con operador turístico").
   - X es el número del alcance al cual se asocia (un número entero, ej. 1, 2, 3, etc.).
   
   Ejemplo de cómo debes integrarlo en tu texto:
   "Para cumplir con tu Obligación 1, te sugiero registrar la reunión que tuviste ayer. Puedes hacer clic aquí para guardarla: [Crear Actividad: 'Reunión de articulación con prestadores' | Alcance: 1]. ¿Qué te parece?"
   
   *Nota: Puedes proponer varias actividades en una misma respuesta si es necesario, pero asegúrate de usar siempre el formato exacto.*

5. Mantén tus respuestas relativamente concisas para que quepan bien en un chat lateral.`;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, month, year } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Historial de mensajes requerido" }, { status: 400 });
    }

    // Fetch the active contract for the logged in user
    const contract = await prisma.contract.findFirst({
      where: { userId: session.user.id },
      include: {
        scopes: {
          orderBy: { orderNumber: "asc" },
          include: {
            activities: {
              where: {
                month: month || new Date().getMonth() + 1,
                year: year || new Date().getFullYear()
              },
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!contract) {
      return NextResponse.json({
        response: "¡Hola! Aún no has configurado tu contrato. Por favor, ve a la sección 'Configurar Contrato' en el menú de la izquierda y sube tu documento para que pueda ayudarte a planificar tus actividades."
      });
    }

    // Construct the context block to feed Gemini
    let contextBlock = `INFORMACIÓN DEL CONTRATO DEL USUARIO:
- Contratista: ${session.user.name || "N/A"}
- Entidad: ${contract.entity || "N/A"}
- Número: ${contract.contractNumber || "N/A"}
- Objeto Contractual: ${contract.objeto || "N/A"}
- Mes de Evaluación Actual: ${month || new Date().getMonth() + 1}/${year || new Date().getFullYear()}

OBLIGACIONES Y ACTIVIDADES REGISTRADAS ESTE MES:
`;

    contract.scopes.forEach(scope => {
      contextBlock += `\nAlcance ${scope.orderNumber}: "${scope.title}"\n`;
      if (scope.description) {
        contextBlock += `  (Descripción: ${scope.description})\n`;
      }
      contextBlock += `  Actividades registradas este mes:\n`;
      if (scope.activities.length === 0) {
        contextBlock += `    - Ninguna actividad registrada aún.\n`;
      } else {
        scope.activities.forEach((act, idx) => {
          contextBlock += `    ${idx + 1}. "${act.title}" (Lugar: ${act.location || "N/A"}, Fecha: ${act.date || "N/A"})\n`;
        });
      }
    });

    // Map message history to Gemini API format
    // Filter the last 6 messages to avoid token blow-up
    const lastMessages = messages.slice(-8);
    const geminiContents = [];

    // Push the system prompt and context in a user-turn first-message style
    geminiContents.push({
      role: "user",
      parts: [
        {
          text: `${SYSTEM_PROMPT}\n\nCONTEXTO REAL DE MI CONTRATO ACTUAL:\n${contextBlock}\n\n¡Hola! Por favor responde a mi próximo mensaje teniendo en cuenta todo este contexto.`
        }
      ]
    });

    // Dummy model turn to establish context accepted
    geminiContents.push({
      role: "model",
      parts: [
        {
          text: "Entendido perfectamente. Estoy listo para asistirte con tu contrato y guiarte en el registro de tus actividades para este periodo. ¿En qué te puedo colaborar hoy?"
        }
      ]
    });

    // Map remaining messages (excluding system/context setup)
    lastMessages.forEach(msg => {
      // Simple validation of role mapping
      const role = msg.sender === "user" ? "user" : "model";
      geminiContents.push({
        role,
        parts: [{ text: msg.text }]
      });
    });

    // Generate completion
    const completion = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: geminiContents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    const aiResponseText = completion.text || "Lo siento, tuve un problema analizando tu solicitud.";

    return NextResponse.json({ success: true, response: aiResponseText });

  } catch (error) {
    console.error("Error in Chat API route:", error);
    return NextResponse.json({ error: error.message || "Error al procesar el mensaje" }, { status: 500 });
  }
}

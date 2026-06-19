import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { del } from "@vercel/blob";

export const runtime = "nodejs";

// GET - List all activities for a scope in a given month/year
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

    // Verify scope ownership
    const scope = await prisma.scope.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!scope || scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Alcance no encontrado o prohibido" }, { status: 403 });
    }

    const activities = await prisma.activity.findMany({
      where: {
        scopeId: id,
        month,
        year
      },
      include: {
        evidences: {
          orderBy: { uploadedAt: "asc" }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json({ success: true, activities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener las actividades" },
      { status: 500 }
    );
  }
}

// POST - Create a new activity under a scope
export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const scope = await prisma.scope.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!scope || scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Alcance no encontrado o prohibido" }, { status: 403 });
    }

    const body = await request.json();
    const { title, date, location, month, year } = body;

    if (!title) {
      return NextResponse.json({ error: "El título de la actividad es requerido" }, { status: 400 });
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const activity = await prisma.activity.create({
      data: {
        title,
        date: date || "",
        location: location || "",
        month: currentMonth,
        year: currentYear,
        scopeId: id
      },
      include: {
        evidences: true
      }
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear la actividad" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an activity and its physical files
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activityId");

  if (!activityId) {
    return NextResponse.json({ error: "ID de actividad requerido" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        scope: {
          include: { contract: true }
        },
        evidences: true
      }
    });

    if (!activity || activity.scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Actividad no encontrada o prohibido" }, { status: 403 });
    }

    // Delete files from Vercel Blob
    for (const evidence of activity.evidences) {
      if (evidence.filePath && evidence.filePath.startsWith("https://")) {
        try {
          await del(evidence.filePath);
          console.log(`Successfully deleted blob: ${evidence.filePath}`);
        } catch (err) {
          console.warn(`Could not delete blob ${evidence.filePath}:`, err.message);
        }
      }
    }

    // Delete activity from DB (this cascades to evidences in DB)
    await prisma.activity.delete({
      where: { id: activityId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar la actividad" },
      { status: 500 }
    );
  }
}

// PUT - Update an activity's details and purpose text
export async function PUT(request, { params }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const scope = await prisma.scope.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!scope || scope.contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Alcance no encontrado o prohibido" }, { status: 403 });
    }

    const body = await request.json();
    const { activityId, title, date, location, purpose, completed } = body;

    if (!activityId) {
      return NextResponse.json({ error: "ID de actividad requerido" }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { evidences: true }
    });

    if (!activity || activity.scopeId !== id) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }

    // Update Activity record
    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        title: title !== undefined ? title : activity.title,
        date: date !== undefined ? date : activity.date,
        location: location !== undefined ? location : activity.location,
        completed: completed !== undefined ? completed : activity.completed,
      }
    });

    // Update or Create "Propósito" text evidence
    if (purpose !== undefined) {
      const purposeEv = activity.evidences.find(
        ev => ev.fileType === "text" && (ev.fileName.toLowerCase().includes("propósito") || ev.fileName.toLowerCase().includes("proposito"))
      );

      if (purposeEv) {
        await prisma.evidence.update({
          where: { id: purposeEv.id },
          data: { content: purpose }
        });
      } else {
        await prisma.evidence.create({
          data: {
            fileName: "Propósito",
            fileType: "text",
            filePath: "",
            content: purpose,
            month: activity.month,
            year: activity.year,
            scopeId: id,
            activityId: activityId
          }
        });
      }
    }

    return NextResponse.json({ success: true, activity: updatedActivity });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar la actividad" },
      { status: 500 }
    );
  }
}

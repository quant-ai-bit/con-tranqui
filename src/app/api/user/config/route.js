import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// PUT - Update user name and role
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, role } = body;

    if (!name && !role) {
      return NextResponse.json({ error: "No se proporcionaron datos para actualizar" }, { status: 400 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) {
      if (role !== "contratista" && role !== "supervisor") {
        return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
      }
      updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Configuración de perfil actualizada correctamente."
    });
  } catch (error) {
    console.error("Error updating user config:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar la configuración" },
      { status: 500 }
    );
  }
}

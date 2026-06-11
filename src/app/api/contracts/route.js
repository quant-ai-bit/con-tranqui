import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

// POST - Save a new contract with its scopes
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      title, 
      contractNumber, 
      entity, 
      sourceFileName,
      objeto,
      plazo,
      valorTotal,
      valorMensual,
      proyecto,
      supervisor,
      dependencia,
      ccContratista,
      fechaContrato,
      nombreContratista,
      fechaInicio,
      fechaTerminacion,
      pagosRealizados,
      saldoPendiente,
      porcentajeEjecucion,
      porcentajePorEjecutar,
      estadoGarantias,
      matrizRiesgos,
      scopes // Array of { orderNumber, title, description, requiredEvidences: string[] }
    } = body;

    if (!title || !scopes || scopes.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un título y los alcances del contrato." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const userId = session.user.id;

    // Create contract with nested scopes and required evidences
    const contract = await prisma.contract.create({
      data: {
        title,
        contractNumber: contractNumber || null,
        entity: entity || null,
        sourceFileName: sourceFileName || null,
        userId: userId,
        objeto: objeto || null,
        plazo: plazo || null,
        valorTotal: valorTotal || null,
        valorMensual: valorMensual || null,
        proyecto: proyecto || null,
        supervisor: supervisor || null,
        dependencia: dependencia || null,
        ccContratista: ccContratista || null,
        fechaContrato: fechaContrato || null,
        nombreContratista: nombreContratista || null,
        fechaInicio: fechaInicio || null,
        fechaTerminacion: fechaTerminacion || null,
        pagosRealizados: pagosRealizados || null,
        saldoPendiente: saldoPendiente || null,
        porcentajeEjecucion: porcentajeEjecucion || null,
        porcentajePorEjecutar: porcentajePorEjecutar || null,
        estadoGarantias: estadoGarantias || null,
        matrizRiesgos: matrizRiesgos || null,
        scopes: {
          create: scopes.map((scope) => ({
            orderNumber: scope.orderNumber,
            title: scope.title,
            description: scope.description || null,
            requiredEvidences: {
              create: (scope.requiredEvidences || []).map((ev) => ({
                name: typeof ev === "string" ? ev : ev.name,
              })),
            },
          })),
        },
      },
      include: {
        scopes: {
          include: {
            requiredEvidences: true,
          },
          orderBy: { orderNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      contract,
      message: `Contrato "${title}" guardado con ${scopes.length} alcances.` 
    });

  } catch (error) {
    console.error("Error saving contract:", error);
    return NextResponse.json(
      { error: error.message || "Error al guardar el contrato" },
      { status: 500 }
    );
  }
}

// GET - List all contracts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const contracts = await prisma.contract.findMany({
      where: { userId: session.user.id },
      include: {
        scopes: {
          include: {
            requiredEvidences: true,
          },
          orderBy: { orderNumber: "asc" },
        },
        _count: {
          select: { reports: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contracts });
  } catch (error) {
    console.error("Error listing contracts:", error);
    return NextResponse.json(
      { error: error.message || "Error al listar contratos" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contract
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("id");

    if (!contractId) {
      return NextResponse.json(
        { error: "Se requiere el ID del contrato a eliminar." },
        { status: 400 }
      );
    }

    // Verify contract ownership
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    if (contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido" }, { status: 403 });
    }

    // Delete the contract (Prisma will cascade delete Scopes, RequiredEvidences, Evidences, ScopeEntries, Reports)
    await prisma.contract.delete({
      where: { id: contractId },
    });

    return NextResponse.json({
      success: true,
      message: "Contrato y todos los alcances, evidencias e informes asociados han sido eliminados con éxito."
    });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar el contrato" },
      { status: 500 }
    );
  }
}

// PUT - Update contract details
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, 
      title, 
      contractNumber, 
      entity,
      objeto,
      plazo,
      valorTotal,
      valorMensual,
      proyecto,
      supervisor,
      dependencia,
      ccContratista,
      fechaContrato,
      nombreContratista,
      fechaInicio,
      fechaTerminacion,
      pagosRealizados,
      saldoPendiente,
      porcentajeEjecucion,
      porcentajePorEjecutar,
      estadoGarantias,
      matrizRiesgos,
      totalPeriodos,
      nameCoordinador,
      nameAbogado,
      sigContratista,
      sigSupervisor,
      sigCoordinador,
      sigAbogado
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID del contrato a actualizar." },
        { status: 400 }
      );
    }

    // Verify ownership
    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract || contract.userId !== session.user.id) {
      return NextResponse.json({ error: "Prohibido o no encontrado" }, { status: 403 });
    }

    const updateData = {
      title: title !== undefined ? title : contract.title,
      contractNumber: contractNumber !== undefined ? contractNumber : contract.contractNumber,
      entity: entity !== undefined ? entity : contract.entity,
    };

    if (objeto !== undefined) updateData.objeto = objeto;
    if (plazo !== undefined) updateData.plazo = plazo;
    if (valorTotal !== undefined) updateData.valorTotal = valorTotal;
    if (valorMensual !== undefined) updateData.valorMensual = valorMensual;
    if (proyecto !== undefined) updateData.proyecto = proyecto;
    if (supervisor !== undefined) updateData.supervisor = supervisor;
    if (dependencia !== undefined) updateData.dependencia = dependencia;
    if (ccContratista !== undefined) updateData.ccContratista = ccContratista;
    if (fechaContrato !== undefined) updateData.fechaContrato = fechaContrato;
    if (nombreContratista !== undefined) updateData.nombreContratista = nombreContratista;
    if (fechaInicio !== undefined) updateData.fechaInicio = fechaInicio;
    if (fechaTerminacion !== undefined) updateData.fechaTerminacion = fechaTerminacion;
    if (pagosRealizados !== undefined) updateData.pagosRealizados = pagosRealizados;
    if (saldoPendiente !== undefined) updateData.saldoPendiente = saldoPendiente;
    if (porcentajeEjecucion !== undefined) updateData.porcentajeEjecucion = porcentajeEjecucion;
    if (porcentajePorEjecutar !== undefined) updateData.porcentajePorEjecutar = porcentajePorEjecutar;
    if (estadoGarantias !== undefined) updateData.estadoGarantias = estadoGarantias;
    if (matrizRiesgos !== undefined) updateData.matrizRiesgos = matrizRiesgos;
    if (totalPeriodos !== undefined) updateData.totalPeriodos = totalPeriodos ? parseInt(totalPeriodos) : null;
    if (nameCoordinador !== undefined) updateData.nameCoordinador = nameCoordinador;
    if (nameAbogado !== undefined) updateData.nameAbogado = nameAbogado;
    
    // Signatures
    if (sigContratista !== undefined) updateData.sigContratista = sigContratista;
    if (sigSupervisor !== undefined) updateData.sigSupervisor = sigSupervisor;
    if (sigCoordinador !== undefined) updateData.sigCoordinador = sigCoordinador;
    if (sigAbogado !== undefined) updateData.sigAbogado = sigAbogado;

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, contract: updatedContract });
  } catch (error) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar el contrato" },
      { status: 500 }
    );
  }
}


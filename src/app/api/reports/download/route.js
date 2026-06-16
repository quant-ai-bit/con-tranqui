import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// GET — Download a generated report file
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("file");

  if (!fileName) {
    return NextResponse.json({ error: "Archivo no especificado" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const baseName = path.basename(fileName);
    
    // Look up the report in the database to see if we have a Vercel Blob URL stored
    const report = await prisma.report.findFirst({
      where: {
        filePath: {
          endsWith: baseName,
        },
      },
    });

    let buffer;
    if (report && report.filePath && report.filePath.startsWith("http")) {
      console.log(`Downloading report from Vercel Blob: ${report.filePath}`);
      const res = await fetch(report.filePath);
      if (!res.ok) {
        throw new Error(`Failed to fetch file from Blob: ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Local development fallback
      const filePath = path.join(process.cwd(), "reports", baseName);
      buffer = await readFile(filePath);
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading report:", error);
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }
}

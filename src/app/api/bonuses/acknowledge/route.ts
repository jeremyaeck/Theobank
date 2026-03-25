import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  alertId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { alertId } = schema.parse(body);

    // Only acknowledge if this user is the victim
    const usage = await prisma.bonusUsage.findUnique({
      where: { id: alertId },
    });

    if (!usage || (usage.data as any)?.victimId !== user.id) {
      return NextResponse.json({ error: "Alerte introuvable" }, { status: 404 });
    }

    await prisma.bonusUsage.update({
      where: { id: alertId },
      data: { acknowledgedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

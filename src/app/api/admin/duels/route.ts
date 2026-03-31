import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  const duels = await prisma.duel.findMany({
    include: {
      challenger: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
      opponent: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ duels });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const players = await prisma.user.findMany({
    where: { isAdmin: false, approved: true },
    select: { id: true, username: true, isAdmin: true, profilePhotoUrl: true, createdAt: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ players });
}

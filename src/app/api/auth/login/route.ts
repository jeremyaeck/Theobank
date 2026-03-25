import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, isAdmin: user.isAdmin });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
        approved: user.approved,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Login error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(4).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, balance: 50 },
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: 50,
        type: "INITIAL_BALANCE",
        description: "Solde initial",
      },
    });

    const token = signToken({ userId: user.id, isAdmin: false });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

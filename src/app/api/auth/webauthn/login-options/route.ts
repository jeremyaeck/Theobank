import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const RP_ID = process.env.WEBAUTHN_RP_ID || "theobank-uw2o.vercel.app";

const schema = z.object({ username: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const { username } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { username },
      include: { webAuthnCredential: true },
    });

    if (!user || !user.webAuthnCredential) {
      return NextResponse.json(
        { error: "Face ID non configuré pour ce compte" },
        { status: 404 }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: [{ id: user.webAuthnCredential.credentialId }],
      userVerification: "preferred",
    });

    const challengeToken = jwt.sign(
      { challenge: options.challenge, userId: user.id },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    return NextResponse.json({ options, challengeToken });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Nom d'utilisateur requis" }, { status: 400 });
    }
    console.error("WebAuthn login-options error:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}

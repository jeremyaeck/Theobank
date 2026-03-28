import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const RP_ID = process.env.WEBAUTHN_RP_ID || "theobank-uw2o.vercel.app";
const RP_NAME = "Theobank";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const existing = await prisma.webAuthnCredential.findUnique({
      where: { userId: user.id },
    });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: user.username,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        residentKey: "preferred",
      },
      excludeCredentials: existing ? [{ id: existing.credentialId }] : [],
    });

    // Sign challenge in JWT so we don't need to store it in DB
    const challengeToken = jwt.sign(
      { challenge: options.challenge },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    return NextResponse.json({ options, challengeToken });
  } catch (e) {
    console.error("WebAuthn register-options error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  await prisma.webAuthnCredential.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ success: true });
}

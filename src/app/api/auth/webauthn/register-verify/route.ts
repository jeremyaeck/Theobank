import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const RP_ID = process.env.WEBAUTHN_RP_ID || "theobank-uw2o.vercel.app";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "https://theobank-uw2o.vercel.app";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { credential, challengeToken } = await req.json();

    // Recover challenge from signed JWT
    const { challenge } = jwt.verify(challengeToken, JWT_SECRET) as { challenge: string };

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Vérification échouée" }, { status: 400 });
    }

    const { credential: cred } = verification.registrationInfo;

    // Store or update credential
    await prisma.webAuthnCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey).toString("base64url"),
        counter: BigInt(cred.counter),
        transports: JSON.stringify(cred.transports ?? []),
      },
      update: {
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey).toString("base64url"),
        counter: BigInt(cred.counter),
        transports: JSON.stringify(cred.transports ?? []),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("WebAuthn register-verify error:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}

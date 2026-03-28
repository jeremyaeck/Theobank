import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const RP_ID = process.env.WEBAUTHN_RP_ID || "theobank-uw2o.vercel.app";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "https://theobank-uw2o.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { credential, challengeToken } = await req.json();

    const { challenge, userId } = jwt.verify(challengeToken, JWT_SECRET) as {
      challenge: string;
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { webAuthnCredential: true },
    });

    if (!user || !user.webAuthnCredential) {
      return NextResponse.json({ error: "Identifiants introuvables" }, { status: 404 });
    }

    const stored = user.webAuthnCredential;

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.credentialId,
        publicKey: Uint8Array.from(Buffer.from(stored.publicKey, "base64url")),
        counter: Number(stored.counter),
        transports: JSON.parse(stored.transports),
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Authentification échouée" }, { status: 401 });
    }

    // Update counter
    await prisma.webAuthnCredential.update({
      where: { userId: user.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    const token = signToken({ userId: user.id, isAdmin: user.isAdmin });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
        approved: user.approved,
        profilePhotoUrl: user.profilePhotoUrl ?? null,
        hasWebAuthn: true,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (e: any) {
    console.error("WebAuthn login-verify error:", e);
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 200 * 1024; // 200KB max

const schema = z.object({
  photoDataUrl: z.string().startsWith("data:image/"),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { photoDataUrl } = schema.parse(await req.json());

    // Validate size
    const base64 = photoDataUrl.split(",")[1] || "";
    const sizeBytes = (base64.length * 3) / 4;
    if (sizeBytes > MAX_SIZE) {
      return NextResponse.json({ error: "Image trop grande (max 200 KB)" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { profilePhotoUrl: photoDataUrl },
    });

    return NextResponse.json({ success: true, profilePhotoUrl: photoDataUrl });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Photo upload error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoUrl: null },
  });

  return NextResponse.json({ success: true });
}

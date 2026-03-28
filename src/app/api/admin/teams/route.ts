import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  username: true,
  balance: true,
  isAdmin: true,
  approved: true,
  createdAt: true,
} as const;

async function getTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { user: { select: userSelect } },
        orderBy: { user: { username: "asc" } },
      },
    },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    members: team.members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      balance: m.user.balance,
      isAdmin: m.user.isAdmin,
      approved: m.user.approved,
      createdAt: m.user.createdAt.toISOString(),
    })),
  }));
}

async function assertAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return { ok: false as const, response: unauthorized() };
  if (!user.isAdmin) return { ok: false as const, response: forbidden() };
  return { ok: true as const };
}

function isMissingTeamsTablesError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(2).max(40),
});

const randomizeSchema = z.object({
  action: z.literal("randomize"),
  teamCount: z.number().int().min(2).max(20),
  prefix: z.string().trim().min(1).max(20).optional(),
});

const postSchema = z.discriminatedUnion("action", [createSchema, randomizeSchema]);

const updateMembersSchema = z.object({
  teamId: z.string().min(1),
  userIds: z.array(z.string().min(1)),
});

const renameSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().trim().min(2).max(40),
});

const deleteSchema = z.object({
  teamId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const teams = await getTeams();
    return NextResponse.json({ teams });
  } catch (e) {
    if (isMissingTeamsTablesError(e)) {
      return NextResponse.json({
        teams: [],
        teamsFeatureDisabled: true,
        message: "Les tables d'équipes ne sont pas encore migrées",
      });
    }
    console.error("Admin teams GET error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const parsed = postSchema.parse(await req.json());

    if (parsed.action === "create") {
      const existing = await prisma.team.findUnique({ where: { name: parsed.name } });
      if (existing) {
        return NextResponse.json({ error: "Une équipe avec ce nom existe déjà" }, { status: 400 });
      }
      await prisma.team.create({ data: { name: parsed.name } });
      return NextResponse.json({ teams: await getTeams() });
    }

    const players = await prisma.user.findMany({
      where: { isAdmin: false, approved: true },
      select: { id: true },
      orderBy: { username: "asc" },
    });

    if (players.length < parsed.teamCount) {
      return NextResponse.json(
        { error: "Pas assez de joueurs approuvés pour créer autant d'équipes" },
        { status: 400 }
      );
    }

    const prefix = parsed.prefix || "Équipe";
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({});
      await tx.team.deleteMany({});

      const teams = await Promise.all(
        Array.from({ length: parsed.teamCount }, (_, i) =>
          tx.team.create({
            data: { name: `${prefix} ${i + 1}` },
            select: { id: true },
          })
        )
      );

      for (let i = 0; i < shuffled.length; i += 1) {
        const targetTeam = teams[i % teams.length];
        await tx.teamMember.create({
          data: {
            teamId: targetTeam.id,
            userId: shuffled[i].id,
          },
        });
      }
    });

    return NextResponse.json({ teams: await getTeams() });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (isMissingTeamsTablesError(e)) {
      return NextResponse.json(
        { error: "Tables équipes manquantes. Lancez la migration Prisma." },
        { status: 503 }
      );
    }
    console.error("Admin teams POST error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    // Rename action
    if (body.name !== undefined && body.userIds === undefined) {
      const { teamId, name } = renameSchema.parse(body);
      const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
      if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
      await prisma.team.update({ where: { id: teamId }, data: { name } });
      return NextResponse.json({ teams: await getTeams() });
    }

    const { teamId, userIds } = updateMembersSchema.parse(body);
    const uniqueUserIds = [...new Set(userIds)];

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) {
      return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
    }

    if (uniqueUserIds.length > 0) {
      const targets = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
          isAdmin: false,
          approved: true,
        },
        select: { id: true },
      });
      if (targets.length !== uniqueUserIds.length) {
        return NextResponse.json({ error: "Un ou plusieurs joueurs sont invalides" }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({ where: { teamId } });

      if (uniqueUserIds.length === 0) return;

      await tx.teamMember.deleteMany({
        where: {
          userId: { in: uniqueUserIds },
          teamId: { not: teamId },
        },
      });

      for (const userId of uniqueUserIds) {
        await tx.teamMember.create({
          data: { teamId, userId },
        });
      }
    });

    return NextResponse.json({ teams: await getTeams() });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (isMissingTeamsTablesError(e)) {
      return NextResponse.json(
        { error: "Tables équipes manquantes. Lancez la migration Prisma." },
        { status: 503 }
      );
    }
    console.error("Admin teams PATCH error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { teamId } = deleteSchema.parse(await req.json());
    await prisma.team.delete({ where: { id: teamId } });
    return NextResponse.json({ teams: await getTeams() });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (isMissingTeamsTablesError(e)) {
      return NextResponse.json(
        { error: "Tables équipes manquantes. Lancez la migration Prisma." },
        { status: 503 }
      );
    }
    console.error("Admin teams DELETE error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

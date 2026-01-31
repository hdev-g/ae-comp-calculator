import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { reconcileDealsToAEs } from "@/server/aeDealAssignment";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!session?.user?.email || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as unknown;
  const workspaceMemberId =
    body && typeof body === "object" && "workspaceMemberId" in body
      ? String((body as Record<string, unknown>)["workspaceMemberId"] ?? "").trim()
      : "";

  if (!workspaceMemberId) {
    return NextResponse.json({ error: "workspaceMemberId is required" }, { status: 400 });
  }

  const memberExists = await prisma.attioWorkspaceMember.findUnique({
    where: { id: workspaceMemberId },
    select: { id: true },
  });
  if (!memberExists) return NextResponse.json({ error: "Unknown workspace member id" }, { status: 400 });

  // Ensure AEProfile exists, then link it.
  const ae = await prisma.aEProfile.upsert({
    where: { userId },
    update: { attioWorkspaceMemberId: workspaceMemberId },
    create: { userId, status: "ACTIVE", attioWorkspaceMemberId: workspaceMemberId },
    select: { id: true, attioWorkspaceMemberId: true },
  });

  const reconcile = await reconcileDealsToAEs({ onlyMemberId: workspaceMemberId });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: "AE_ATTIO_LINKED",
      entityType: "AEProfile",
      entityId: ae.id,
      detailsJson: { attioWorkspaceMemberId: workspaceMemberId, dealsAssigned: reconcile.dealsUpdated } satisfies Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true, aeProfile: ae, dealsAssigned: reconcile.dealsUpdated });
}


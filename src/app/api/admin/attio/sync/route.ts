import { NextResponse } from "next/server";

import { listDealsRaw, listWorkspaceMembersRaw, parseDealRecord } from "@/server/attioClient";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/rbac";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const startedAt = new Date();

  let membersRaw: unknown[] = [];
  let dealsRaw: unknown[] = [];
  try {
    [membersRaw, dealsRaw] = await Promise.all([listWorkspaceMembersRaw(), listDealsRaw()]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Attio sync failed";
    console.error("[attio-sync]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const memberUpserts = await Promise.all(
    membersRaw.map(async (raw) => {
      const rec = raw as any;
      const id = (rec?.id ?? rec?.workspace_member_id ?? rec?.workspaceMemberId ?? "").toString();
      if (!id) return null;
      const email = (rec?.email ?? rec?.attributes?.email ?? rec?.user?.email ?? null)?.toString() ?? null;
      const fullName =
        (rec?.name ?? rec?.full_name ?? rec?.fullName ?? null)?.toString() ?? null;
      const status = (rec?.status ?? null)?.toString() ?? null;

      return prisma.attioWorkspaceMember.upsert({
        where: { id },
        update: { email, fullName, status, rawAttioPayload: raw as any },
        create: { id, email, fullName, status, rawAttioPayload: raw as any },
        select: { id: true },
      });
    }),
  );

  const parsedDeals = dealsRaw.map(parseDealRecord).filter(Boolean);

  const dealUpserts = await Promise.all(
    parsedDeals.map((d) =>
      prisma.deal.upsert({
        where: { attioRecordId: d!.attioRecordId },
        update: {
          dealName: d!.dealName,
          accountName: d!.accountName ?? null,
          amount: d!.amount,
          commissionableAmount: d!.commissionableAmount,
          closeDate: new Date(d!.closeDate),
          status: d!.status,
          attioOwnerWorkspaceMemberId: d!.ownerWorkspaceMemberId ?? null,
          rawAttioPayload: d!.raw as any,
        },
        create: {
          attioRecordId: d!.attioRecordId,
          dealName: d!.dealName,
          accountName: d!.accountName ?? null,
          amount: d!.amount,
          commissionableAmount: d!.commissionableAmount,
          closeDate: new Date(d!.closeDate),
          status: d!.status,
          attioOwnerWorkspaceMemberId: d!.ownerWorkspaceMemberId ?? null,
          rawAttioPayload: d!.raw as any,
        },
        select: { id: true },
      }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.session.user.id ?? null,
      action: "ATTIO_SYNC",
      entityType: "Attio",
      entityId: "workspace",
      detailsJson: {
        membersFetched: membersRaw.length,
        dealsFetched: dealsRaw.length,
        dealsParsed: parsedDeals.length,
        membersUpserted: memberUpserts.filter(Boolean).length,
        dealsUpserted: dealUpserts.length,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      } as any,
    },
  });

  return NextResponse.json({
    ok: true,
    membersFetched: membersRaw.length,
    dealsFetched: dealsRaw.length,
    dealsParsed: parsedDeals.length,
  });
}

